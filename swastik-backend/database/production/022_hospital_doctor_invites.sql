-- ============================================================
-- 022: Hospital Doctor Invites
-- Adds invite workflow so doctors can accept/reject hospital invites
-- ============================================================

CREATE TABLE IF NOT EXISTS hospital_doctor_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department TEXT,
    schedule JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_doctor_invites_doctor_status
ON hospital_doctor_invites(doctor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hospital_doctor_invites_hospital_status
ON hospital_doctor_invites(hospital_id, status, created_at DESC);

-- Keep only one active pending invite per hospital/doctor pair
CREATE UNIQUE INDEX IF NOT EXISTS uniq_hospital_doctor_pending_invite
ON hospital_doctor_invites(hospital_id, doctor_id)
WHERE status = 'pending';

-- Auto-update updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_hospital_doctor_invites_updated_at
    BEFORE UPDATE ON hospital_doctor_invites
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
