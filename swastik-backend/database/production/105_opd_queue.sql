-- ============================================================
-- 105: OPD QUEUE / TOKEN MANAGEMENT
-- Digital token system for OPD queue management
-- ============================================================

-- Queue status enum
DO $$ BEGIN
    CREATE TYPE queue_status AS ENUM (
        'waiting', 'in_consultation', 'completed', 'skipped',
        'cancelled', 'no_show', 'on_hold'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS opd_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

    -- Token
    token_number INTEGER NOT NULL,
    token_prefix TEXT DEFAULT 'OPD',         -- OPD, EMR (emergency), FOL (follow-up), REV (revisit)
    display_token TEXT,                      -- computed: prefix + token_number e.g. "OPD-001"
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Status
    status queue_status NOT NULL DEFAULT 'waiting',
    priority INTEGER DEFAULT 0,              -- 0 = normal, 1 = urgent, 2 = emergency, 3 = vip
    source TEXT DEFAULT 'walk_in',           -- walk_in, appointment, follow_up, emergency

    -- Timing
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    consultation_start_time TIMESTAMPTZ,
    consultation_end_time TIMESTAMPTZ,
    estimated_wait_minutes INTEGER DEFAULT 0,

    -- Patient info snapshot (for walk-ins without full registration)
    patient_name TEXT,
    patient_phone TEXT,
    patient_age INTEGER,
    patient_gender TEXT,
    reason TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, doctor_id, queue_date, token_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opd_queue_hospital_date ON opd_queue(hospital_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_opd_queue_doctor_date ON opd_queue(doctor_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_opd_queue_status ON opd_queue(hospital_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_opd_queue_patient ON opd_queue(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opd_queue_appointment ON opd_queue(appointment_id) WHERE appointment_id IS NOT NULL;

-- Per-doctor per-day token counter
CREATE TABLE IF NOT EXISTS opd_queue_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_token INTEGER NOT NULL DEFAULT 0,
    UNIQUE(hospital_id, doctor_id, queue_date)
);

CREATE INDEX IF NOT EXISTS idx_opd_counters_lookup ON opd_queue_counters(hospital_id, doctor_id, queue_date);

-- Function to generate next token and auto-populate display_token
CREATE OR REPLACE FUNCTION generate_queue_token()
RETURNS TRIGGER AS $$
DECLARE
    next_token INTEGER;
BEGIN
    -- Atomically increment counter
    INSERT INTO opd_queue_counters (hospital_id, doctor_id, queue_date, last_token)
    VALUES (NEW.hospital_id, NEW.doctor_id, NEW.queue_date, 1)
    ON CONFLICT (hospital_id, doctor_id, queue_date)
    DO UPDATE SET last_token = opd_queue_counters.last_token + 1
    RETURNING last_token INTO next_token;

    NEW.token_number := next_token;
    NEW.display_token := NEW.token_prefix || '-' || LPAD(next_token::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_queue_token ON opd_queue;
CREATE TRIGGER trg_generate_queue_token
    BEFORE INSERT ON opd_queue
    FOR EACH ROW
    WHEN (NEW.token_number IS NULL OR NEW.token_number = 0)
    EXECUTE FUNCTION generate_queue_token();

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_opd_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_opd_queue_updated_at ON opd_queue;
CREATE TRIGGER trg_opd_queue_updated_at
    BEFORE UPDATE ON opd_queue
    FOR EACH ROW EXECUTE FUNCTION update_opd_queue_updated_at();
