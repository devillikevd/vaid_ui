-- ============================================================
-- 101: HOSPITAL BEDS
-- Individual bed tracking with real-time status
-- ============================================================

-- Bed status enum
DO $$ BEGIN
    CREATE TYPE bed_status AS ENUM (
        'available', 'occupied', 'reserved', 'maintenance',
        'housekeeping', 'blocked'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hospital_beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    ward_id UUID NOT NULL REFERENCES hospital_wards(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    bed_type TEXT DEFAULT 'standard',       -- standard, electric, icu, ventilator, cradle, bariatric
    status bed_status NOT NULL DEFAULT 'available',
    current_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    current_admission_id UUID,              -- FK added after patient_admissions table
    features TEXT[] DEFAULT '{}',           -- oxygen, suction, cardiac_monitor, ventilator, iv_stand
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_sanitized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, ward_id, bed_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_beds_hospital ON hospital_beds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_ward ON hospital_beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_status ON hospital_beds(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_patient ON hospital_beds(current_patient_id) WHERE current_patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hospital_beds_admission ON hospital_beds(current_admission_id) WHERE current_admission_id IS NOT NULL;

-- Bed status change log (audit trail)
CREATE TABLE IF NOT EXISTS bed_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_id UUID NOT NULL REFERENCES hospital_beds(id) ON DELETE CASCADE,
    previous_status bed_status,
    new_status bed_status NOT NULL,
    changed_by UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bed_status_log_bed ON bed_status_log(bed_id);
CREATE INDEX IF NOT EXISTS idx_bed_status_log_created ON bed_status_log(created_at);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_hospital_beds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospital_beds_updated_at ON hospital_beds;
CREATE TRIGGER trg_hospital_beds_updated_at
    BEFORE UPDATE ON hospital_beds
    FOR EACH ROW EXECUTE FUNCTION update_hospital_beds_updated_at();

-- Trigger to log bed status changes
CREATE OR REPLACE FUNCTION log_bed_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO bed_status_log (bed_id, previous_status, new_status, patient_id)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.current_patient_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bed_status_change ON hospital_beds;
CREATE TRIGGER trg_bed_status_change
    AFTER UPDATE ON hospital_beds
    FOR EACH ROW EXECUTE FUNCTION log_bed_status_change();

-- Trigger to sync ward occupied_beds count
CREATE OR REPLACE FUNCTION sync_ward_bed_count()
RETURNS TRIGGER AS $$
DECLARE
    target_ward_id UUID;
BEGIN
    target_ward_id := COALESCE(NEW.ward_id, OLD.ward_id);
    UPDATE hospital_wards
    SET occupied_beds = (
        SELECT COUNT(*) FROM hospital_beds
        WHERE ward_id = target_ward_id AND status = 'occupied' AND is_active = TRUE
    ),
    total_beds = (
        SELECT COUNT(*) FROM hospital_beds
        WHERE ward_id = target_ward_id AND is_active = TRUE
    )
    WHERE id = target_ward_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ward_bed_count ON hospital_beds;
CREATE TRIGGER trg_sync_ward_bed_count
    AFTER INSERT OR UPDATE OR DELETE ON hospital_beds
    FOR EACH ROW EXECUTE FUNCTION sync_ward_bed_count();
