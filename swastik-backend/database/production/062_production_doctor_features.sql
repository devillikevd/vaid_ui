-- ============================================================
-- 062: PRODUCTION DOCTOR UX FEATURES
-- Adds all missing 30-point checklist fields for advanced profile
-- ============================================================

-- 1. Document Categories
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS cancelled_cheque_url TEXT,
ADD COLUMN IF NOT EXISTS pan_card_url TEXT,
ADD COLUMN IF NOT EXISTS gst_certificate_url TEXT,
ADD COLUMN IF NOT EXISTS clinic_license_url TEXT,
ADD COLUMN IF NOT EXISTS digital_signature_url TEXT,
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- 2. Bank Details Verification
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
ADD COLUMN IF NOT EXISTS bank_upi TEXT,
ADD COLUMN IF NOT EXISTS bank_penny_verified BOOLEAN DEFAULT FALSE;

-- 3. Professional Rich Data
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS publications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS experience_timeline JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS insurance_accepted JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS languages_spoken JSONB DEFAULT '[]'::jsonb;

-- 4. Clinic Coordinates & Extras
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS clinic_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clinic_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS multiple_clinics JSONB DEFAULT '[]'::jsonb;

-- 5. Emergency Contact (Mandatory Field Support)
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

-- 6. Verification Status Details & Rejection UX
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS verification_timeline JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejected_documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 7. Profile Completion
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
