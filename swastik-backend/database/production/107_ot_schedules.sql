-- ============================================================
-- 107: OPERATION THEATER (OT) SCHEDULING
-- OT rooms, scheduling, checklists
-- ============================================================

-- OT status enum
DO $$ BEGIN
    CREATE TYPE ot_status AS ENUM (
        'scheduled', 'pre_op', 'in_progress', 'post_op',
        'completed', 'cancelled', 'postponed', 'emergency'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- OT Room master
CREATE TABLE IF NOT EXISTS ot_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                    -- OT-1, OT-2, Minor OT, Cath Lab
    room_number TEXT,
    room_type TEXT DEFAULT 'major',        -- major, minor, cath_lab, endoscopy, day_care, eye, ent, dental
    floor TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    equipment TEXT[] DEFAULT '{}',         -- c_arm, laparoscopy, microscope, laser, cautery, monitor
    capacity_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ot_rooms_hospital ON ot_rooms(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ot_rooms_active ON ot_rooms(hospital_id, is_active);

-- OT Schedules
CREATE TABLE IF NOT EXISTS ot_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ot_room_id UUID NOT NULL REFERENCES ot_rooms(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,

    -- Surgical team
    primary_surgeon_id UUID NOT NULL REFERENCES doctors(id),
    assistant_surgeon_ids UUID[] DEFAULT '{}',
    anesthetist_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    scrub_nurse TEXT,
    circulating_nurse TEXT,

    -- Surgery details
    surgery_type TEXT NOT NULL,            -- major, minor, emergency, day_care
    surgery_name TEXT NOT NULL,
    procedure_code TEXT,
    procedure_description TEXT,
    laterality TEXT,                       -- left, right, bilateral, na
    anesthesia_type TEXT,                  -- general, spinal, epidural, local, sedation, regional, combined
    position TEXT,                         -- supine, prone, lateral, lithotomy, sitting

    -- Status & timing
    status ot_status NOT NULL DEFAULT 'scheduled',
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    estimated_duration_minutes INTEGER DEFAULT 60,
    priority TEXT DEFAULT 'elective',      -- elective, urgent, emergency

    -- Clinical notes
    pre_op_diagnosis TEXT,
    post_op_diagnosis TEXT,
    pre_op_notes TEXT,
    operative_notes TEXT,
    post_op_notes TEXT,
    anesthesia_notes TEXT,
    complications TEXT,
    implants_used TEXT,
    blood_loss_ml INTEGER,
    blood_transfusion_ml INTEGER,
    specimens_sent TEXT[] DEFAULT '{}',

    -- Consent
    consent_obtained BOOLEAN DEFAULT FALSE,
    consent_document_url TEXT,
    special_instructions TEXT,

    -- PAC (Pre-Anesthetic Check)
    pac_clearance BOOLEAN DEFAULT FALSE,
    pac_notes TEXT,
    pac_done_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ot_schedules_hospital ON ot_schedules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_room ON ot_schedules(ot_room_id);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_patient ON ot_schedules(patient_id);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_surgeon ON ot_schedules(primary_surgeon_id);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_status ON ot_schedules(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_date ON ot_schedules(hospital_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_admission ON ot_schedules(admission_id) WHERE admission_id IS NOT NULL;

-- ============================================================
-- OT Checklists (WHO Surgical Safety, Pre-op, Post-op)
-- ============================================================
CREATE TABLE IF NOT EXISTS ot_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES ot_schedules(id) ON DELETE CASCADE,
    checklist_type TEXT NOT NULL DEFAULT 'pre_op',  -- pre_op, post_op, who_safety_sign_in, who_safety_time_out, who_safety_sign_out
    items JSONB NOT NULL DEFAULT '[]',
    -- [{ item: "Patient identity confirmed", checked: true, checked_by: "Nurse A", checked_at: "..." }]
    is_complete BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ot_checklists_schedule ON ot_checklists(schedule_id);

-- Trigger auto-update
CREATE OR REPLACE FUNCTION update_ot_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ot_schedules_updated_at ON ot_schedules;
CREATE TRIGGER trg_ot_schedules_updated_at
    BEFORE UPDATE ON ot_schedules
    FOR EACH ROW EXECUTE FUNCTION update_ot_schedules_updated_at();
