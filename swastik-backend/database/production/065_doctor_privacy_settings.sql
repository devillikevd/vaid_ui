-- ============================================================
-- 065: DOCTOR PRIVACY SETTINGS
-- Adds fields to allow doctors to control their public profile visibility
-- ============================================================

-- Add privacy control columns to doctors table
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS is_public_profile BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_phone_number BOOLEAN DEFAULT FALSE;
