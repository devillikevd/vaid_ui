-- ============================================================
-- 104: PATIENT ENCOUNTERS + ENCOUNTER SERVICES
-- Unified visit record anchoring OPD + IPD + Emergency
-- ============================================================

-- Encounter type enum
DO $$ BEGIN
    CREATE TYPE encounter_type AS ENUM ('opd', 'ipd', 'emergency', 'day_care', 'procedure');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Encounter status enum
DO $$ BEGIN
    CREATE TYPE encounter_status AS ENUM (
        'registered', 'in_queue', 'in_progress', 'completed',
        'discharged', 'cancelled', 'no_show'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS patient_encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_type encounter_type NOT NULL DEFAULT 'opd',
    status encounter_status NOT NULL DEFAULT 'registered',
    encounter_number TEXT UNIQUE,           -- auto-generated e.g. ENC-2026-00001

    -- Links
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,

    -- Clinical
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    past_medical_history TEXT,
    vitals JSONB DEFAULT '{}',
    -- {bp_systolic, bp_diastolic, pulse, temperature, spo2, respiratory_rate, weight, height, bmi}
    clinical_notes JSONB DEFAULT '{}',
    examination_findings TEXT,
    diagnosis TEXT[] DEFAULT '{}',
    icd_codes TEXT[] DEFAULT '{}',
    prescriptions JSONB DEFAULT '[]',
    investigations_ordered TEXT[] DEFAULT '{}',
    procedures_performed TEXT[] DEFAULT '{}',
    advice TEXT,
    follow_up_date DATE,

    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Billing snapshot
    total_charges DECIMAL(10,2) DEFAULT 0,
    total_discount DECIMAL(10,2) DEFAULT 0,
    total_tax DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',  -- pending, partial, paid, waived

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_encounters_hospital ON patient_encounters(hospital_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON patient_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON patient_encounters(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_encounters_type ON patient_encounters(hospital_id, encounter_type);
CREATE INDEX IF NOT EXISTS idx_encounters_doctor ON patient_encounters(doctor_id) WHERE doctor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_admission ON patient_encounters(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_appointment ON patient_encounters(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_created ON patient_encounters(hospital_id, created_at);
CREATE INDEX IF NOT EXISTS idx_encounters_number ON patient_encounters(encounter_number);

-- ============================================================
-- Encounter Services (line items — billing-ready)
-- ============================================================
CREATE TABLE IF NOT EXISTS encounter_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID NOT NULL REFERENCES patient_encounters(id) ON DELETE CASCADE,
    service_id UUID REFERENCES hospital_services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    service_code TEXT,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    performed_by UUID REFERENCES doctors(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ,
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounter_services_encounter ON encounter_services(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_services_service ON encounter_services(service_id) WHERE service_id IS NOT NULL;

-- ============================================================
-- Auto-number generation for encounters
-- ============================================================
CREATE OR REPLACE FUNCTION generate_encounter_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    IF NEW.encounter_number IS NULL OR NEW.encounter_number = '' THEN
        year_str := TO_CHAR(NOW(), 'YYYY');
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(encounter_number, '-', 3) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM patient_encounters
        WHERE encounter_number LIKE 'ENC-' || year_str || '-%'
          AND hospital_id = NEW.hospital_id;
        NEW.encounter_number := 'ENC-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_encounter_number ON patient_encounters;
CREATE TRIGGER trg_generate_encounter_number
    BEFORE INSERT ON patient_encounters
    FOR EACH ROW EXECUTE FUNCTION generate_encounter_number();

-- Trigger to auto-update encounter totals when services change
CREATE OR REPLACE FUNCTION sync_encounter_totals()
RETURNS TRIGGER AS $$
DECLARE
    target_encounter_id UUID;
BEGIN
    target_encounter_id := COALESCE(NEW.encounter_id, OLD.encounter_id);
    UPDATE patient_encounters SET
        total_charges = COALESCE((
            SELECT SUM(rate * quantity) FROM encounter_services
            WHERE encounter_id = target_encounter_id AND is_cancelled = FALSE
        ), 0),
        total_discount = COALESCE((
            SELECT SUM(discount_amount) FROM encounter_services
            WHERE encounter_id = target_encounter_id AND is_cancelled = FALSE
        ), 0),
        total_tax = COALESCE((
            SELECT SUM(tax_amount) FROM encounter_services
            WHERE encounter_id = target_encounter_id AND is_cancelled = FALSE
        ), 0),
        net_amount = COALESCE((
            SELECT SUM(net_amount) FROM encounter_services
            WHERE encounter_id = target_encounter_id AND is_cancelled = FALSE
        ), 0),
        updated_at = NOW()
    WHERE id = target_encounter_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_encounter_totals ON encounter_services;
CREATE TRIGGER trg_sync_encounter_totals
    AFTER INSERT OR UPDATE OR DELETE ON encounter_services
    FOR EACH ROW EXECUTE FUNCTION sync_encounter_totals();

-- Trigger to auto-update updated_at on encounters
CREATE OR REPLACE FUNCTION update_patient_encounters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_encounters_updated_at ON patient_encounters;
CREATE TRIGGER trg_patient_encounters_updated_at
    BEFORE UPDATE ON patient_encounters
    FOR EACH ROW EXECUTE FUNCTION update_patient_encounters_updated_at();
