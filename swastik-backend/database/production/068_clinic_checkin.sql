-- ============================================================
-- 068: CLINIC PATIENT CHECK-IN
-- Adds an in-clinic check-in record to appointments so the clinic
-- front desk can mark patients as arrived without mutating the
-- shared appointment status machine (doctor/patient portals rely
-- on those statuses). The doctor portal consumes `appointment:check-in`
-- in real time to know the patient is physically present.
-- ============================================================

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.checked_in_at IS 'When the patient checked in at the clinic (front desk). Null until checked in.';
COMMENT ON COLUMN appointments.checked_in_by IS 'User (clinic owner/staff) who performed the check-in.';

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_checked_in_at
    ON appointments(clinic_id, checked_in_at DESC)
    WHERE checked_in_at IS NOT NULL;
