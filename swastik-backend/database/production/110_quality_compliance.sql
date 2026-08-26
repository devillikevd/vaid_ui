-- ============================================================
-- 110: QUALITY & COMPLIANCE
-- Incident reporting, NABH indicators, clinical audit
-- ============================================================

-- Hospital incidents
CREATE TABLE IF NOT EXISTS hospital_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    incident_number TEXT UNIQUE,

    -- Classification
    incident_type TEXT NOT NULL,            -- medication_error, fall, infection, near_miss, complaint, adverse_event, equipment_failure, security, fire, needle_stick, blood_transfusion_reaction
    severity TEXT DEFAULT 'low',            -- low, moderate, high, sentinel
    category TEXT,                          -- patient_safety, staff_safety, property, environment, clinical

    -- Location
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,
    ward_id UUID REFERENCES hospital_wards(id) ON DELETE SET NULL,
    location_description TEXT,

    -- People
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    involved_staff TEXT[] DEFAULT '{}',

    -- Details
    description TEXT NOT NULL,
    immediate_action TEXT,
    root_cause TEXT,
    root_cause_analysis JSONB DEFAULT '{}',
    -- { method: "fishbone/5_why", findings: [...] }
    corrective_action TEXT,
    preventive_action TEXT,

    -- Status
    status TEXT DEFAULT 'reported',        -- reported, acknowledged, investigating, action_taken, monitoring, closed, reopened
    priority TEXT DEFAULT 'medium',         -- low, medium, high, critical

    -- Investigation
    investigated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    investigation_started_at TIMESTAMPTZ,
    investigation_completed_at TIMESTAMPTZ,
    investigation_findings TEXT,

    -- Closure
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    closure_notes TEXT,

    -- Reporting
    is_reportable BOOLEAN DEFAULT FALSE,   -- state/national reporting required
    external_report_filed BOOLEAN DEFAULT FALSE,

    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_hospital ON hospital_incidents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON hospital_incidents(hospital_id, incident_type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON hospital_incidents(hospital_id, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON hospital_incidents(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_patient ON hospital_incidents(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_occurred ON hospital_incidents(hospital_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_incidents_number ON hospital_incidents(incident_number);

-- Auto-number incidents
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
        year_str := TO_CHAR(NOW(), 'YYYY');
        SELECT COALESCE(MAX(
            CAST(SPLIT_PART(incident_number, '-', 3) AS INTEGER)
        ), 0) + 1
        INTO seq_num
        FROM hospital_incidents
        WHERE incident_number LIKE 'INC-' || year_str || '-%'
          AND hospital_id = NEW.hospital_id;
        NEW.incident_number := 'INC-' || year_str || '-' || LPAD(seq_num::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_incident_number ON hospital_incidents;
CREATE TRIGGER trg_generate_incident_number
    BEFORE INSERT ON hospital_incidents
    FOR EACH ROW EXECUTE FUNCTION generate_incident_number();

-- ============================================================
-- Clinical Quality Indicators (NABH KPI tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    indicator_name TEXT NOT NULL,
    indicator_code TEXT,                    -- NABH indicator codes
    category TEXT NOT NULL,                -- patient_safety, clinical_care, icu, ot, infection_control, nursing, medication_safety, laboratory, radiology, emergency, blood_bank
    sub_category TEXT,

    -- Measurement
    numerator INTEGER DEFAULT 0,
    denominator INTEGER DEFAULT 0,
    rate DECIMAL(8,4) DEFAULT 0,
    target_rate DECIMAL(8,4),
    benchmark_rate DECIMAL(8,4),           -- national/international benchmark

    -- Period
    period_type TEXT DEFAULT 'monthly',    -- daily, weekly, monthly, quarterly, yearly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Status
    status TEXT DEFAULT 'on_target',       -- on_target, below_target, above_target, critical
    trend TEXT,                            -- improving, stable, declining

    -- Notes
    analysis TEXT,
    action_plan TEXT,
    responsible_person TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qi_hospital ON quality_indicators(hospital_id);
CREATE INDEX IF NOT EXISTS idx_qi_category ON quality_indicators(hospital_id, category);
CREATE INDEX IF NOT EXISTS idx_qi_period ON quality_indicators(hospital_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_qi_code ON quality_indicators(hospital_id, indicator_code) WHERE indicator_code IS NOT NULL;

-- ============================================================
-- Clinical Audit Trail (enhanced beyond basic updated_at)
-- ============================================================
CREATE TABLE IF NOT EXISTS clinical_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,             -- admission, encounter, lab_order, radiology_order, ot_schedule, medication
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,                  -- create, update, delete, status_change, approve, reject
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_hospital ON clinical_audit_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON clinical_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON clinical_audit_log(performed_by) WHERE performed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON clinical_audit_log(hospital_id, created_at);
