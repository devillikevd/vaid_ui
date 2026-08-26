-- ============================================================
-- 108: NURSING TASKS & MEDICATION ADMINISTRATION
-- Nursing station dashboard, task management, MAR
-- ============================================================

-- Nursing task status enum
DO $$ BEGIN
    CREATE TYPE nursing_task_status AS ENUM (
        'pending', 'in_progress', 'completed', 'skipped',
        'escalated', 'overdue', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS nursing_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES patient_admissions(id) ON DELETE CASCADE,
    ward_id UUID REFERENCES hospital_wards(id) ON DELETE SET NULL,
    bed_id UUID REFERENCES hospital_beds(id) ON DELETE SET NULL,
    assigned_nurse_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Task details
    task_type TEXT NOT NULL,               -- medication, vitals, assessment, procedure, care_plan, diet, wound_care, intake_output, discharge_prep, physiotherapy, counseling
    task_description TEXT NOT NULL,
    priority TEXT DEFAULT 'routine',       -- routine, urgent, stat
    status nursing_task_status NOT NULL DEFAULT 'pending',
    recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,                  -- e.g. "every 4 hours", "bd", "tds"

    -- Timing
    scheduled_at TIMESTAMPTZ NOT NULL,
    due_by TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Task-specific data
    medication_details JSONB,
    -- { drug_name, dose, route, frequency, instructions }
    vitals_data JSONB,
    -- { bp_systolic, bp_diastolic, pulse, temperature, spo2, respiratory_rate, pain_score, blood_sugar, urine_output, intake_ml, output_ml }
    assessment_data JSONB,
    -- { findings, score, scale_used }

    notes TEXT,
    escalation_reason TEXT,
    doctor_order_ref TEXT,                 -- reference to doctor's order

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_hospital ON nursing_tasks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_admission ON nursing_tasks(admission_id);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_ward ON nursing_tasks(ward_id) WHERE ward_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_nurse ON nursing_tasks(assigned_nurse_id) WHERE assigned_nurse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_status ON nursing_tasks(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_scheduled ON nursing_tasks(hospital_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_type ON nursing_tasks(hospital_id, task_type);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_pending ON nursing_tasks(hospital_id, ward_id, status)
    WHERE status IN ('pending', 'in_progress', 'overdue');

-- ============================================================
-- Medication Administration Record (MAR)
-- ============================================================
CREATE TABLE IF NOT EXISTS medication_administration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES patient_admissions(id) ON DELETE CASCADE,
    nursing_task_id UUID REFERENCES nursing_tasks(id) ON DELETE SET NULL,

    -- Medication details
    drug_name TEXT NOT NULL,
    generic_name TEXT,
    dose TEXT NOT NULL,
    dose_unit TEXT,                        -- mg, ml, units, mcg, gm
    route TEXT NOT NULL,                   -- oral, iv, im, sc, inhalation, topical, rectal, sublingual, transdermal
    frequency TEXT,                        -- od, bd, tds, qid, sos, stat, q4h, q6h, q8h, q12h, prn
    duration_days INTEGER,
    instructions TEXT,

    -- Administration
    scheduled_time TIMESTAMPTZ NOT NULL,
    administered_at TIMESTAMPTZ,
    administered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    witnessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'scheduled',       -- scheduled, administered, held, refused, missed, self_administered, discontinued
    hold_reason TEXT,
    refusal_reason TEXT,

    -- Tracking
    batch_number TEXT,
    adverse_reaction BOOLEAN DEFAULT FALSE,
    reaction_details TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mar_hospital ON medication_administration(hospital_id);
CREATE INDEX IF NOT EXISTS idx_mar_admission ON medication_administration(admission_id);
CREATE INDEX IF NOT EXISTS idx_mar_scheduled ON medication_administration(admission_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_mar_status ON medication_administration(admission_id, status);
CREATE INDEX IF NOT EXISTS idx_mar_drug ON medication_administration(admission_id, drug_name);
CREATE INDEX IF NOT EXISTS idx_mar_nurse ON medication_administration(administered_by) WHERE administered_by IS NOT NULL;

-- Trigger auto-update
CREATE OR REPLACE FUNCTION update_nursing_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nursing_tasks_updated_at ON nursing_tasks;
CREATE TRIGGER trg_nursing_tasks_updated_at
    BEFORE UPDATE ON nursing_tasks
    FOR EACH ROW EXECUTE FUNCTION update_nursing_tasks_updated_at();
