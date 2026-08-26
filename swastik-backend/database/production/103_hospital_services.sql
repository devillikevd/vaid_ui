-- ============================================================
-- 103: HOSPITAL SERVICES (Rate Card / Service Catalog)
-- Billing-ready procedure/service catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS hospital_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,                              -- NHIS / hospital-specific service code
    category TEXT NOT NULL DEFAULT 'general',
    -- Categories: consultation, procedure, investigation, room_charge, nursing,
    --   ot, consumable, equipment, pharmacy, diet, ambulance, package, miscellaneous
    sub_category TEXT,
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,
    rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    hsn_code TEXT,                          -- GST HSN/SAC code
    is_package BOOLEAN DEFAULT FALSE,
    package_includes TEXT[] DEFAULT '{}',
    package_validity_days INTEGER,
    description TEXT,
    service_type TEXT DEFAULT 'one_time',    -- one_time, recurring, per_day
    requires_doctor BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on hospital + code (when code is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hospital_services_code
    ON hospital_services(hospital_id, code) WHERE code IS NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hospital_services_hospital ON hospital_services(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_services_category ON hospital_services(hospital_id, category);
CREATE INDEX IF NOT EXISTS idx_hospital_services_dept ON hospital_services(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hospital_services_active ON hospital_services(hospital_id, is_active);
CREATE INDEX IF NOT EXISTS idx_hospital_services_name ON hospital_services USING gin (to_tsvector('english', name));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_hospital_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospital_services_updated_at ON hospital_services;
CREATE TRIGGER trg_hospital_services_updated_at
    BEFORE UPDATE ON hospital_services
    FOR EACH ROW EXECUTE FUNCTION update_hospital_services_updated_at();
