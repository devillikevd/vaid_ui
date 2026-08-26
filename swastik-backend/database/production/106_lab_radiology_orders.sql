-- ============================================================
-- 106: LAB & RADIOLOGY ORDERS
-- Lab and radiology ordering workflow
-- (leverages existing diagnostic center associations)
-- ============================================================

-- Lab order status enum
DO $$ BEGIN
    CREATE TYPE lab_order_status AS ENUM (
        'ordered', 'sample_collected', 'sample_received', 'processing',
        'completed', 'report_ready', 'report_approved', 'dispatched',
        'cancelled', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    ordering_doctor_id UUID NOT NULL REFERENCES doctors(id),
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id) ON DELETE SET NULL,

    -- Order details
    order_number TEXT UNIQUE,
    test_name TEXT NOT NULL,
    test_code TEXT,
    test_category TEXT,                    -- hematology, biochemistry, microbiology, pathology, serology, immunology
    specimen_type TEXT,                    -- blood, urine, stool, sputum, swab, csf, tissue, fluid
    priority TEXT DEFAULT 'routine',       -- routine, urgent, stat, asap
    status lab_order_status NOT NULL DEFAULT 'ordered',
    clinical_notes TEXT,
    fasting_required BOOLEAN DEFAULT FALSE,

    -- Collection
    sample_collected_at TIMESTAMPTZ,
    sample_collected_by TEXT,
    sample_barcode TEXT,
    collection_site TEXT,

    -- Results
    report_url TEXT,
    result_data JSONB DEFAULT '{}',
    -- { parameters: [{ name, value, unit, reference_range, flag }] }
    result_notes TEXT,
    is_abnormal BOOLEAN DEFAULT FALSE,
    abnormal_flags JSONB DEFAULT '{}',
    critical_value BOOLEAN DEFAULT FALSE,

    -- Reporting
    reported_by TEXT,
    reported_at TIMESTAMPTZ,
    approved_by UUID REFERENCES doctors(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- TAT tracking
    turnaround_minutes INTEGER,
    expected_tat_minutes INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_orders_hospital ON lab_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_encounter ON lab_orders(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_admission ON lab_orders(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lab_orders_doctor ON lab_orders(ordering_doctor_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_priority ON lab_orders(hospital_id, priority) WHERE status NOT IN ('completed', 'report_approved', 'dispatched', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_lab_orders_created ON lab_orders(hospital_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lab_orders_number ON lab_orders(order_number);

-- ============================================================
-- RADIOLOGY ORDERS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE radiology_order_status AS ENUM (
        'ordered', 'scheduled', 'in_progress', 'completed',
        'report_ready', 'report_approved', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS radiology_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    ordering_doctor_id UUID NOT NULL REFERENCES doctors(id),
    diagnostic_center_id UUID REFERENCES diagnostic_centers(id) ON DELETE SET NULL,

    -- Order details
    order_number TEXT UNIQUE,
    modality TEXT NOT NULL,                -- xray, ct, mri, ultrasound, ecg, echo, mammography, pet_ct, dexa, fluoroscopy
    body_part TEXT,
    laterality TEXT,                       -- left, right, bilateral, na
    study_description TEXT,
    priority TEXT DEFAULT 'routine',
    status radiology_order_status NOT NULL DEFAULT 'ordered',
    clinical_indication TEXT,
    contrast_required BOOLEAN DEFAULT FALSE,
    patient_preparation TEXT,

    -- Scheduling
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Report
    report_url TEXT,
    findings JSONB DEFAULT '{}',
    impression TEXT,
    reported_by TEXT,
    reported_at TIMESTAMPTZ,
    approved_by UUID REFERENCES doctors(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,

    -- PACS
    dicom_study_id TEXT,
    dicom_accession_number TEXT,
    image_urls TEXT[] DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_radiology_orders_hospital ON radiology_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_patient ON radiology_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_encounter ON radiology_orders(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_radiology_orders_status ON radiology_orders(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_modality ON radiology_orders(hospital_id, modality);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_created ON radiology_orders(hospital_id, created_at);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_number ON radiology_orders(order_number);

-- ============================================================
-- Auto-number generation for lab & radiology orders
-- ============================================================
CREATE OR REPLACE FUNCTION generate_lab_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        year_str := TO_CHAR(NOW(), 'YYYY');
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM lab_orders
        WHERE order_number LIKE 'LAB-' || year_str || '-%'
          AND hospital_id = NEW.hospital_id;
        NEW.order_number := 'LAB-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_lab_order_number ON lab_orders;
CREATE TRIGGER trg_generate_lab_order_number
    BEFORE INSERT ON lab_orders
    FOR EACH ROW EXECUTE FUNCTION generate_lab_order_number();

CREATE OR REPLACE FUNCTION generate_radiology_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        year_str := TO_CHAR(NOW(), 'YYYY');
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM radiology_orders
        WHERE order_number LIKE 'RAD-' || year_str || '-%'
          AND hospital_id = NEW.hospital_id;
        NEW.order_number := 'RAD-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_radiology_order_number ON radiology_orders;
CREATE TRIGGER trg_generate_radiology_order_number
    BEFORE INSERT ON radiology_orders
    FOR EACH ROW EXECUTE FUNCTION generate_radiology_order_number();
