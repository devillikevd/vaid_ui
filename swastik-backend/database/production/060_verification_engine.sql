-- ============================================================
-- 060: DOCTOR VERIFICATION ENGINE
-- Adds fields for verification checklist, admin notes, and completion score
-- ============================================================

ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS verification_checklist JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0;
