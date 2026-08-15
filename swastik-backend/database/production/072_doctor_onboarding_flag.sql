-- ============================================================
-- 072: Doctor Onboarding Flag
-- Tracks whether a doctor has completed the post-registration
-- practice setup step (own clinic / join org / video only)
-- ============================================================

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS practice_setup_type TEXT
  CHECK (practice_setup_type IN ('own_clinic', 'join_organization', 'video_only'));
