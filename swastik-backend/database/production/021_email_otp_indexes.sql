-- ============================================================
-- 021: EMAIL OTP INDEXES
-- Speeds up email verification and password reset OTP lookups.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_otp_verifications_email
  ON otp_verifications(email);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_email_purpose_active
  ON otp_verifications(email, purpose, is_verified, created_at DESC);
