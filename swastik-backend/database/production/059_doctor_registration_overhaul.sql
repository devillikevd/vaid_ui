-- ============================================================
-- 059: DOCTOR REGISTRATION OVERHAUL
-- Adds fields for auto-save, multi-step validation, and advanced profiles
-- ============================================================

-- 1. Update approval_status constraint to support 'draft' and 'needs_info'
ALTER TABLE doctors DROP CONSTRAINT IF EXISTS doctors_approval_status_check;
ALTER TABLE doctors ADD CONSTRAINT doctors_approval_status_check 
CHECK (approval_status IN (
    'draft', 'pending', 'under_review', 'needs_info', 'approved', 'rejected', 'suspended'
));

-- 2. Add Registration Validation Dates and Profile Fields
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS registration_date DATE,
ADD COLUMN IF NOT EXISTS registration_valid_till DATE,
ADD COLUMN IF NOT EXISTS experience_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS home_visit_consultation_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS emergency_consultation_fee DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_emergency_available BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS qualification_details JSONB DEFAULT '[]'::jsonb;

-- 3. Add Document and Verification Fields
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS government_id_type TEXT,
ADD COLUMN IF NOT EXISTS government_id_url TEXT,
ADD COLUMN IF NOT EXISTS live_selfie_url TEXT;

-- 4. Add Clinic Fields (For independent clinics managed directly under doctor profile)
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS clinic_name TEXT,
ADD COLUMN IF NOT EXISTS clinic_address TEXT,
ADD COLUMN IF NOT EXISTS clinic_pincode TEXT,
ADD COLUMN IF NOT EXISTS clinic_map_url TEXT,
ADD COLUMN IF NOT EXISTS clinic_photo_url TEXT;

-- 5. Add purpose constraint for new registration pre-verification (Optional safeguard)
-- The otp_verifications table natively supports any TEXT purpose, so no schema change is strictly required, 
-- but we should ensure the backend correctly filters by 'registration_pre_verify'.

-- 6. Add Audit Trail for Profile Updates (Optional simple audit tracking)
CREATE TABLE IF NOT EXISTS doctor_profile_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'submitted_for_approval', 'approved', 'rejected', 'draft_saved'
    remarks TEXT,
    changed_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
