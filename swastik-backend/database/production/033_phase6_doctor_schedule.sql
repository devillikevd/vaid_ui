-- ============================================================
-- 033: Phase 6 Doctor Schedule Updates
-- Adds leave management, home visit flags, and buffer times
-- ============================================================

-- 1. Add new columns to doctor_slots
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS is_home_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS buffer_time INTEGER DEFAULT 0;

-- 2. Update the RPC function to handle new columns
CREATE OR REPLACE FUNCTION rpc_replace_doctor_slots(
  p_doctor_id UUID,
  p_slots JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing slots for the doctor
  DELETE FROM doctor_slots WHERE doctor_id = p_doctor_id;

  -- Insert new slots from JSON array
  IF jsonb_array_length(p_slots) > 0 THEN
    INSERT INTO doctor_slots (
      doctor_id,
      slot_date,
      start_time,
      end_time,
      slot_duration,
      is_video_enabled,
      is_clinic_enabled,
      is_home_enabled,
      is_active,
      buffer_time
    )
    SELECT
      p_doctor_id,
      (slot->>'slot_date')::DATE,
      (slot->>'start_time')::TIME,
      (slot->>'end_time')::TIME,
      COALESCE((slot->>'slot_duration')::INTEGER, 15),
      COALESCE((slot->>'is_video_enabled')::BOOLEAN, true),
      COALESCE((slot->>'is_clinic_enabled')::BOOLEAN, true),
      COALESCE((slot->>'is_home_enabled')::BOOLEAN, false),
      COALESCE((slot->>'is_active')::BOOLEAN, true),
      COALESCE((slot->>'buffer_time')::INTEGER, 0)
    FROM jsonb_array_elements(p_slots) AS slot;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_replace_doctor_slots(UUID, JSONB) TO service_role;

-- 3. Create Doctor Leaves table
CREATE TABLE IF NOT EXISTS doctor_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_doctor_leaves_doctor_date ON doctor_leaves(doctor_id, start_date, end_date);

-- Enable RLS
ALTER TABLE doctor_leaves ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for doctor_leaves
-- Doctors can select their own leaves
CREATE POLICY "Doctors can view their own leaves"
    ON doctor_leaves FOR SELECT
    USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Doctors can insert their own leaves
CREATE POLICY "Doctors can manage their own leaves"
    ON doctor_leaves FOR ALL
    USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Admin policies
CREATE POLICY "Admins can view all leaves"
    ON doctor_leaves FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );
