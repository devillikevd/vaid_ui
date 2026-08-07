-- ============================================================
-- 058: APPOINTMENT COMPLETION OTP
-- Adds OTP field to appointments table for secure completion
-- ============================================================

-- Add completion_otp column to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS completion_otp VARCHAR(6);

-- Comment on column
COMMENT ON COLUMN appointments.completion_otp IS '6-digit OTP generated when consultation starts, required to complete the appointment';
