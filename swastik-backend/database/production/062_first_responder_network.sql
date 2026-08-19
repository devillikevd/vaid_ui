-- ==========================================================
-- 062_first_responder_network.sql
-- SWASTIK Community First-Responder Emergency Network (Hero Mesh)
-- ==========================================================

-- 1. First Responders Registry
CREATE TABLE IF NOT EXISTS first_responders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(30) NOT NULL, -- 'DOCTOR', 'NURSE', 'PARAMEDIC', 'CPR_VOLUNTEER', 'SAMARITAN'
    skills TEXT[] DEFAULT ARRAY['CPR', 'FIRST_AID'],
    registration_no VARCHAR(100),
    council_name VARCHAR(150),
    cert_document_url TEXT,
    is_verified BOOLEAN DEFAULT TRUE, -- Auto-verify for standard samaritan/cpr in development
    is_on_duty BOOLEAN DEFAULT TRUE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    last_ping_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_emergencies_resolved INT DEFAULT 0,
    rating DOUBLE PRECISION DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_responder UNIQUE (user_id)
);

-- 2. Emergency Broadcast Sessions
CREATE TABLE IF NOT EXISTS emergency_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    victim_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    victim_name VARCHAR(150) DEFAULT 'Emergency Victim',
    victim_phone VARCHAR(50),
    victim_blood_group VARCHAR(10),
    incident_type VARCHAR(50) NOT NULL, -- 'CRASH_DETECTED', 'FALL_DETECTED', 'CARDIAC_SOS', 'ASTHMA_DISTRESS'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_text TEXT,
    victim_vitals_snapshot JSONB DEFAULT '{}'::jsonb,
    triage_level VARCHAR(20) DEFAULT 'RED', -- 'RED' (Immediate), 'YELLOW' (Urgent), 'GREEN' (Delayed)
    status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESPONDER_EN_ROUTE', 'ON_SCENE', 'AMBULANCE_DISPATCHED', 'RESOLVED', 'CANCELLED'
    broadcast_radius_meters INT DEFAULT 2000,
    ambulance_request_id UUID REFERENCES emergency_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 3. Emergency Responder Assignments
CREATE TABLE IF NOT EXISTS emergency_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID REFERENCES emergency_broadcasts(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES first_responders(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'NOTIFIED', -- 'NOTIFIED', 'ACCEPTED', 'DECLINED', 'ARRIVED', 'COMPLETED'
    distance_meters DOUBLE PRECISION DEFAULT 0.0,
    eta_seconds INT DEFAULT 0,
    notes TEXT,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for ultra-fast spatial search & status lookup
CREATE INDEX IF NOT EXISTS idx_first_responders_duty ON first_responders(is_on_duty, is_verified);
CREATE INDEX IF NOT EXISTS idx_first_responders_lat_lng ON first_responders(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_status ON emergency_broadcasts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcasts_lat_lng ON emergency_broadcasts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_emergency_assignments_broadcast ON emergency_assignments(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_emergency_assignments_responder ON emergency_assignments(responder_id);
