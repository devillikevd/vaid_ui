-- ============================================================
-- 100: HOSPITAL WARDS
-- Ward/room hierarchy with configurable ward types
-- ============================================================

-- Ward type enum for Indian hospital standards
DO $$ BEGIN
    CREATE TYPE ward_type AS ENUM (
        'general', 'semi_private', 'private', 'deluxe', 'suite',
        'icu', 'nicu', 'picu', 'ccu', 'micu', 'sicu',
        'hdu', 'isolation', 'emergency', 'day_care', 'labour'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hospital_wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ward_type ward_type NOT NULL DEFAULT 'general',
    ward_code TEXT,                          -- short code e.g. GW-1, ICU-A
    floor TEXT,
    wing TEXT,
    building TEXT,
    total_beds INTEGER NOT NULL DEFAULT 0,
    occupied_beds INTEGER NOT NULL DEFAULT 0,
    charge_per_day DECIMAL(10,2) DEFAULT 0,
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,
    nurse_station TEXT,
    in_charge_nurse_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amenities TEXT[] DEFAULT '{}',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, ward_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_wards_hospital ON hospital_wards(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_wards_type ON hospital_wards(hospital_id, ward_type);
CREATE INDEX IF NOT EXISTS idx_hospital_wards_active ON hospital_wards(hospital_id, is_active);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_hospital_wards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospital_wards_updated_at ON hospital_wards;
CREATE TRIGGER trg_hospital_wards_updated_at
    BEFORE UPDATE ON hospital_wards
    FOR EACH ROW EXECUTE FUNCTION update_hospital_wards_updated_at();
