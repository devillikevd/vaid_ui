-- ============================================================
-- 025: Patient Medical Record Access Grants
-- Patient-controlled, doctor-specific access to historical records
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_record_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(patient_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_record_access_patient_status
ON patient_record_access(patient_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_record_access_doctor_status
ON patient_record_access(doctor_id, status, expires_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE TRIGGER trg_patient_record_access_updated_at
    BEFORE UPDATE ON patient_record_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
