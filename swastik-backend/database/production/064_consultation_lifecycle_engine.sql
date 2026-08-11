-- ============================================================
-- 064: CONSULTATION LIFECYCLE ENGINE
-- Additive-only migration. Never drops columns/tables.
-- Adds the enterprise consultation state machine (stage), audit
-- trail (state_history + consultation_logs), patient consent,
-- network/device event logs, universal OTP purposes, and
-- configurable policy thresholds.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Relax otp_verifications.purpose CHECK to support the
--    universal OTP engine. Keeps every existing purpose value.
-- ------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'otp_verifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%purpose%'
  LOOP
    EXECUTE format('ALTER TABLE otp_verifications DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE otp_verifications
  ADD CONSTRAINT otp_verifications_purpose_check CHECK (
    purpose IN (
      'phone_verification', 'password_reset', 'login', 'transaction',
      'registration_pre_verify', 'appointment_completion',
      'registration', 'email_change',
      'consultation_end', 'consultation_start',
      'bank_update', 'withdrawal',
      'account_delete', 'prescription_confirm',
      'admin_action', 'force_complete'
    )
  );

-- ------------------------------------------------------------
-- 2. Extend consultations.status CHECK to the full lifecycle.
--    Keeps every existing value: scheduled, waiting, in_progress,
--    completed, cancelled, pending (plus timed_out already used
--    by the cron). New lifecycle states are added on top.
-- ------------------------------------------------------------
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'consultations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE consultations DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE consultations
  ADD CONSTRAINT consultations_status_check CHECK (
    status IN (
      'scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'pending',
      'confirmed',
      'waiting_for_doctor', 'waiting_for_patient', 'ready_to_join',
      'consultation_started', 'live', 'paused', 'reconnecting',
      'patient_left', 'doctor_left', 'interrupted',
      'prescription_pending',
      'no_show', 'expired', 'abandoned', 'incomplete', 'recovered',
      'timed_out', 'checked_in', 'doctor_started'
    )
  );

-- ------------------------------------------------------------
-- 3. Additive columns on consultations (lifecycle state machine).
-- ------------------------------------------------------------
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS state_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consultation_mode TEXT,
  ADD COLUMN IF NOT EXISTS call_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_duration_ms BIGINT,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_paused_ms BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconnect_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doctor_left_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejoin_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_request_reason TEXT,
  ADD COLUMN IF NOT EXISTS end_request_status TEXT,
  ADD COLUMN IF NOT EXISTS completion_reason TEXT,
  ADD COLUMN IF NOT EXISTS completion_method TEXT,
  ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS force_complete_reason TEXT,
  ADD COLUMN IF NOT EXISTS prescription_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prescription_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_consent JSONB,
  ADD COLUMN IF NOT EXISTS otp_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS otp_purpose TEXT,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS network_events JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS device_events JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS diagnostics JSONB;

CREATE INDEX IF NOT EXISTS idx_consultations_stage ON consultations(stage);
CREATE INDEX IF NOT EXISTS idx_consultations_rejoin_deadline ON consultations(rejoin_deadline);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_left_at ON consultations(patient_left_at);
CREATE INDEX IF NOT EXISTS idx_consultations_end_request_status ON consultations(end_request_status);

-- ------------------------------------------------------------
-- 4. Searchable consultation log table (Part 16).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('patient', 'doctor', 'system', 'admin')),
    actor_id UUID,
    actor_name TEXT,
    event TEXT NOT NULL,
    event_type TEXT,
    detail TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_logs_consultation ON consultation_logs(consultation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_event ON consultation_logs(event);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_actor ON consultation_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_consultation_logs_search ON consultation_logs(created_at DESC);

-- ------------------------------------------------------------
-- 5. Configurable policy thresholds (Part 10/11/12/8).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_policies (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO consultation_policies (key, value, description) VALUES
  ('min_duration_seconds', '120', 'Below this duration => ABANDONED (reason mandatory)'),
  ('incomplete_max_seconds', '300', '2-5 minutes without completion => INCOMPLETE (reason mandatory)'),
  ('rejoin_timeout_seconds', '120', 'Patient rejoin window after pressing End'),
  ('recovery_timeout_seconds', '300', 'Session recovery window after crash/refresh'),
  ('end_request_timeout_seconds', '60', 'Doctor waits for patient response before Force Complete'),
  ('otp_for_short_consultations', 'true', 'Require OTP when duration below min_duration'),
  ('otp_for_controlled_medicines', 'true', 'Require OTP when prescription contains controlled medicines'),
  ('otp_for_insurance', 'true', 'Require OTP for insurance-backed consultations'),
  ('otp_for_high_value', 'true', 'Require OTP for high-value consultations (fee above threshold)'),
  ('high_value_fee_threshold', '1000', 'Consultation fee above this => high-value'),
  ('otp_for_admin_policy', 'false', 'Require OTP when enforced by admin policy'),
  ('otp_for_force_complete_dispute', 'true', 'Require OTP when Force Complete is disputed by patient')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS consultation_policy_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. Keep updated_at fresh on consultations
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at
    BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
