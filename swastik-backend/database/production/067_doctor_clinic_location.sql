-- ============================================================
-- 067: DOCTOR CLINIC LOCATION
-- Adds clinic location text fields to the doctors table
-- to persist registration data from the Clinic & Fees step
-- ============================================================

ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS clinic_name TEXT,
ADD COLUMN IF NOT EXISTS clinic_address TEXT,
ADD COLUMN IF NOT EXISTS clinic_city TEXT,
ADD COLUMN IF NOT EXISTS clinic_state TEXT,
ADD COLUMN IF NOT EXISTS clinic_pincode TEXT;
