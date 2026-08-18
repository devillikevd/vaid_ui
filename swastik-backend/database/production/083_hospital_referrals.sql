-- ============================================================
-- 083: HOSPITAL REFERRALS & PATIENT HANDOFF (PHASE 3)
-- Enables a Clinic to refer a patient to an active Partner Hospital.
-- Tracks the lifecycle of the referral episode.
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    referring_clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    referring_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    target_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    
    reason TEXT NOT NULL,
    urgency TEXT NOT NULL CHECK (urgency IN ('routine', 'urgent', 'emergency')),
    clinical_summary TEXT,
    
    -- Status machine: pending -> accepted/rejected -> admission_pending -> admitted -> discharged | cancelled
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'cancelled', 'admission_pending', 'admitted', 'discharged'
    )),
    
    -- Explicit consent flag (points to existence of a valid patient_consents record)
    consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    
    rejection_reason TEXT,
    discharge_summary TEXT,
    
    accepted_at TIMESTAMPTZ,
    admitted_at TIMESTAMPTZ,
    discharged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial index to prevent duplicate active referrals between same clinic, patient, and hospital
-- An active referral is defined as any state except rejected, cancelled, or discharged
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_referral 
ON patient_referrals(patient_id, referring_clinic_id, target_hospital_id)
WHERE status NOT IN ('rejected', 'cancelled', 'discharged');

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_patient_referrals_clinic ON patient_referrals(referring_clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_hospital ON patient_referrals(target_hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_patient ON patient_referrals(patient_id);

-- Auto-update updated_at timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE TRIGGER trg_patient_referrals_updated_at
    BEFORE UPDATE ON patient_referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE patient_referrals ENABLE ROW LEVEL SECURITY;

-- 1. Clinic Owner Access: Can read/write referrals originating from their clinic
CREATE POLICY "Clinic owners can access their outgoing referrals" ON patient_referrals
    FOR ALL
    USING (
        referring_clinic_id IN (
            SELECT id FROM clinics WHERE owner_id = auth.uid()
        )
    );

-- 2. Hospital Owner Access: Can read/update referrals directed to their hospital
CREATE POLICY "Hospital owners can access their incoming referrals" ON patient_referrals
    FOR ALL
    USING (
        target_hospital_id IN (
            SELECT id FROM hospitals WHERE owner_id = auth.uid()
        )
    );

-- 3. Patient Access: Can read their own referrals
CREATE POLICY "Patients can view their own referrals" ON patient_referrals
    FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients WHERE user_id = auth.uid()
        )
    );

-- 4. Doctor Access: Can read/update referrals they initiated
CREATE POLICY "Doctors can access referrals they created" ON patient_referrals
    FOR ALL
    USING (
        referring_doctor_id IN (
            SELECT id FROM doctors WHERE user_id = auth.uid()
        )
    );
