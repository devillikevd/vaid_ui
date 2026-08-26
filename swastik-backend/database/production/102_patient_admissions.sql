-- ============================================================
-- 102: PATIENT ADMISSIONS (IPD)
-- Full IPD admission lifecycle with progress notes
-- ============================================================

-- Admission type enum
DO $$ BEGIN
    CREATE TYPE admission_type AS ENUM (
        'emergency', 'elective', 'transfer', 'referral', 'maternity', 'day_care'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admission status enum
DO $$ BEGIN
    CREATE TYPE admission_status AS ENUM (
        'pre_admission', 'admitted', 'discharged', 'transferred',
        'absconded', 'lama', 'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS patient_admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    bed_id UUID REFERENCES hospital_beds(id) ON DELETE SET NULL,
    ward_id UUID REFERENCES hospital_wards(id) ON DELETE SET NULL,
    admitting_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    attending_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,

    -- Admission details
    admission_type admission_type NOT NULL DEFAULT 'elective',
    status admission_status NOT NULL DEFAULT 'pre_admission',
    admission_number TEXT UNIQUE,           -- auto-generated e.g. ADM-2026-00001
    uhid TEXT,                              -- unique hospital identifier for patient

    -- Clinical
    chief_complaint TEXT,
    provisional_diagnosis TEXT,
    final_diagnosis TEXT,
    icd_codes TEXT[] DEFAULT '{}',
    comorbidities TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    blood_group TEXT,

    -- Timestamps
    admitted_at TIMESTAMPTZ,
    discharged_at TIMESTAMPTZ,
    expected_discharge_date DATE,

    -- Discharge
    discharge_type TEXT,                    -- normal, lama, transfer, expired, absconded, dama
    discharge_summary JSONB DEFAULT '{}',
    discharge_notes TEXT,
    condition_at_discharge TEXT,            -- improved, unchanged, deteriorated, expired
    follow_up_date DATE,
    follow_up_instructions TEXT,
    death_cause TEXT,

    -- MLC
    mlc_number TEXT,
    is_mlc BOOLEAN DEFAULT FALSE,
    fir_number TEXT,

    -- Attendant / Next of kin
    attendant_name TEXT,
    attendant_phone TEXT,
    attendant_relation TEXT,
    attendant_address TEXT,

    -- Insurance
    insurance_provider TEXT,
    policy_number TEXT,
    tpa_name TEXT,
    member_id TEXT,

    -- Metadata
    source TEXT DEFAULT 'direct',           -- direct, opd, emergency, referral, transfer
    referred_from TEXT,
    referred_to TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admissions_hospital ON patient_admissions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON patient_admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON patient_admissions(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_admissions_bed ON patient_admissions(bed_id) WHERE bed_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admissions_doctor ON patient_admissions(admitting_doctor_id);
CREATE INDEX IF NOT EXISTS idx_admissions_admitted_at ON patient_admissions(admitted_at);
CREATE INDEX IF NOT EXISTS idx_admissions_discharged_at ON patient_admissions(discharged_at) WHERE discharged_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admissions_number ON patient_admissions(admission_number);

-- Now add the FK from hospital_beds to patient_admissions
ALTER TABLE hospital_beds
    ADD CONSTRAINT fk_beds_current_admission
    FOREIGN KEY (current_admission_id) REFERENCES patient_admissions(id) ON DELETE SET NULL;

-- ============================================================
-- Admission Progress Notes (daily rounds, SOAP)
-- ============================================================
CREATE TABLE IF NOT EXISTS admission_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES patient_admissions(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    note_type TEXT DEFAULT 'progress',      -- progress, procedure, clinical, transfer, nursing, discharge
    note_date DATE DEFAULT CURRENT_DATE,

    -- SOAP format
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,

    -- Vitals snapshot
    vitals JSONB DEFAULT '{}',
    -- {bp_systolic, bp_diastolic, pulse, temperature, spo2, respiratory_rate, blood_sugar, pain_score, weight}

    instructions TEXT,
    diet_instructions TEXT,
    activity_level TEXT,                    -- bed_rest, ambulate, physiotherapy
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_notes_admission ON admission_progress_notes(admission_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_doctor ON admission_progress_notes(doctor_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_date ON admission_progress_notes(admission_id, note_date);

-- ============================================================
-- Admission auto-number generation function
-- ============================================================
CREATE OR REPLACE FUNCTION generate_admission_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
        year_str := TO_CHAR(NOW(), 'YYYY');
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(admission_number, '-', 3) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM patient_admissions
        WHERE admission_number LIKE 'ADM-' || year_str || '-%'
          AND hospital_id = NEW.hospital_id;
        NEW.admission_number := 'ADM-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_admission_number ON patient_admissions;
CREATE TRIGGER trg_generate_admission_number
    BEFORE INSERT ON patient_admissions
    FOR EACH ROW EXECUTE FUNCTION generate_admission_number();

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_patient_admissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_admissions_updated_at ON patient_admissions;
CREATE TRIGGER trg_patient_admissions_updated_at
    BEFORE UPDATE ON patient_admissions
    FOR EACH ROW EXECUTE FUNCTION update_patient_admissions_updated_at();
