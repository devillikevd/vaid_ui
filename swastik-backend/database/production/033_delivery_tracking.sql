-- Delivery Agents Table
CREATE TABLE IF NOT EXISTS delivery_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL, -- references either pharmacies(id) or diagnostic_centers(id)
    facility_type TEXT CHECK (facility_type IN ('pharmacy', 'diagnostic')),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_details TEXT,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add agent tracking columns to pharmacy_orders
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Add agent tracking columns to diagnostic_bookings
ALTER TABLE diagnostic_bookings ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES delivery_agents(id) ON DELETE SET NULL;
ALTER TABLE diagnostic_bookings ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Add agent live location columns
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS last_location_update timestamp with time zone;

-- Enable Realtime for delivery tracking
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table delivery_agents;
