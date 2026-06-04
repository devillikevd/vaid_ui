-- Migration to support Hospital-Ambulance Affiliation

-- 1. Create hospital_ambulance_invites table
CREATE TABLE IF NOT EXISTS hospital_ambulance_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    driver_email VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    ambulance_id UUID REFERENCES ambulances(id) ON DELETE SET NULL,
    UNIQUE(hospital_id, driver_email)
);

-- 2. Add affiliated_hospital_id to ambulances table if it does not exist
ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS affiliated_hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_hosp_amb_invites_hospital ON hospital_ambulance_invites(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hosp_amb_invites_email ON hospital_ambulance_invites(driver_email);
CREATE INDEX IF NOT EXISTS idx_ambulances_affiliated_hospital ON ambulances(affiliated_hospital_id);

-- 4. Set RLS Policies (basic for admin/service role)
ALTER TABLE hospital_ambulance_invites ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'hospital_ambulance_invites' AND policyname = 'Enable all operations for service_role'
    ) THEN
        CREATE POLICY "Enable all operations for service_role" 
        ON hospital_ambulance_invites 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
