-- ============================================================
-- 023: Clinic Doctor Invites
-- Adds invite workflow so doctors can accept/reject clinic invites
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_doctor_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_doctor_invites_doctor_status
ON clinic_doctor_invites(doctor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinic_doctor_invites_clinic_status
ON clinic_doctor_invites(clinic_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_clinic_doctor_pending_invite
ON clinic_doctor_invites(clinic_id, doctor_id)
WHERE status = 'pending';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_clinic_doctor_invites_updated_at
    BEFORE UPDATE ON clinic_doctor_invites
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
