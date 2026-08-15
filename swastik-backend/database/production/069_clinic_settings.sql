-- ============================================================
-- 069: CLINIC SETTINGS — DESCRIPTION COLUMN
-- Adds `description` to clinics so the Clinic Portal Settings
-- center can persist the clinic's About / description text.
-- The backend already whitelists `description` in updateClinic,
-- but the column was never created (hospitals got it in 016).
-- ============================================================

ALTER TABLE clinics
    ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN clinics.description IS 'Free-text About/description shown on the clinic public profile.';
