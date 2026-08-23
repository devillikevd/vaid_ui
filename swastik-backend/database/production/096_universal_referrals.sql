-- ============================================================
-- 096: Universal Referrals
-- Implements the generic Provider-to-Provider referral engine
-- ============================================================

-- 1. Create universal_referrals table
CREATE TABLE IF NOT EXISTS universal_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    sender_type TEXT NOT NULL CHECK (sender_type IN ('clinic', 'hospital', 'diagnostic_center', 'pharmacy')),
    sender_id UUID,
    sender_snapshot_name TEXT NOT NULL,
    sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_user_name_snapshot TEXT NOT NULL,
    
    receiver_type TEXT NOT NULL CHECK (receiver_type IN ('clinic', 'hospital', 'diagnostic_center', 'pharmacy')),
    receiver_id UUID,
    receiver_snapshot_name TEXT NOT NULL,
    
    reason TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('routine', 'urgent', 'emergency')),
    clinical_summary TEXT,
    consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected')),
    hospital_admission_status TEXT CHECK (hospital_admission_status IN ('admission_pending', 'admitted', 'discharged')),
    
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    completion_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Enforce that hospital admission status only applies when the receiver is a hospital
    CONSTRAINT chk_hospital_admission_status CHECK (
        hospital_admission_status IS NULL OR receiver_type = 'hospital'
    )
);

-- 2. Indexes for universal_referrals
CREATE INDEX IF NOT EXISTS idx_univ_ref_sender ON universal_referrals(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_univ_ref_receiver ON universal_referrals(receiver_type, receiver_id);
CREATE INDEX IF NOT EXISTS idx_univ_ref_patient ON universal_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_univ_ref_status ON universal_referrals(status);
CREATE INDEX IF NOT EXISTS idx_univ_ref_created_at ON universal_referrals(created_at);

-- Add trigger for updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_universal_referrals_updated_at
    BEFORE UPDATE ON universal_referrals
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 3. Create referral_attachments table
CREATE TABLE IF NOT EXISTS referral_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES universal_referrals(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    storage_path TEXT,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying attachments by referral
CREATE INDEX IF NOT EXISTS idx_ref_attachments_referral ON referral_attachments(referral_id);

-- 4. Polymorphic Provider Deletion Triggers
-- These triggers ensure that if a provider is hard deleted, their historical referrals are preserved
-- by setting the ID to NULL but retaining the snapshot strings.

CREATE OR REPLACE FUNCTION nullify_deleted_provider_referrals()
RETURNS TRIGGER AS $$
DECLARE
    p_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'clinics' THEN
        p_type := 'clinic';
    ELSIF TG_TABLE_NAME = 'hospitals' THEN
        p_type := 'hospital';
    ELSIF TG_TABLE_NAME = 'diagnostic_centers' THEN
        p_type := 'diagnostic_center';
    ELSIF TG_TABLE_NAME = 'pharmacies' THEN
        p_type := 'pharmacy';
    END IF;

    -- Nullify sender
    UPDATE universal_referrals 
    SET sender_id = NULL 
    WHERE sender_id = OLD.id AND sender_type = p_type;

    -- Nullify receiver
    UPDATE universal_referrals 
    SET receiver_id = NULL 
    WHERE receiver_id = OLD.id AND receiver_type = p_type;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to clinics
DO $$
BEGIN
    CREATE TRIGGER trg_nullify_referrals_clinic
    AFTER DELETE ON clinics
    FOR EACH ROW
    EXECUTE FUNCTION nullify_deleted_provider_referrals();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attach trigger to hospitals
DO $$
BEGIN
    CREATE TRIGGER trg_nullify_referrals_hospital
    AFTER DELETE ON hospitals
    FOR EACH ROW
    EXECUTE FUNCTION nullify_deleted_provider_referrals();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attach trigger to diagnostic_centers
DO $$
BEGIN
    CREATE TRIGGER trg_nullify_referrals_diagnostic
    AFTER DELETE ON diagnostic_centers
    FOR EACH ROW
    EXECUTE FUNCTION nullify_deleted_provider_referrals();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attach trigger to pharmacies
DO $$
BEGIN
    CREATE TRIGGER trg_nullify_referrals_pharmacy
    AFTER DELETE ON pharmacies
    FOR EACH ROW
    EXECUTE FUNCTION nullify_deleted_provider_referrals();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable RLS (Policies will be applied in Phase 3)
ALTER TABLE universal_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attachments ENABLE ROW LEVEL SECURITY;
