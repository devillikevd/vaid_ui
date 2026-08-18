BEGIN;

-- ============================================================
-- 076: DOCTOR SLOTS ORGANIZATION
-- Adds organization and department references for in-person schedules.
-- ============================================================

ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS organization_type TEXT CHECK (organization_type IN ('clinic', 'hospital'));
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE;
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS department_name TEXT;

-- Drop the existing function to prevent ERROR 42P13 (cannot change return type of existing function)
DROP FUNCTION IF EXISTS rpc_replace_doctor_slots(UUID, JSONB);

-- Recreate the RPC function to handle the new columns
CREATE FUNCTION rpc_replace_doctor_slots(
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
      buffer_time,
      organization_type,
      clinic_id,
      hospital_id,
      department_id,
      department_name
    )
    SELECT
      p_doctor_id,
      (slot->>'slot_date')::DATE,
      (slot->>'start_time')::TIME,
      (slot->>'end_time')::TIME,
      (slot->>'slot_duration')::INTEGER,
      (slot->>'is_video_enabled')::BOOLEAN,
      (slot->>'is_clinic_enabled')::BOOLEAN,
      (slot->>'is_home_enabled')::BOOLEAN,
      (slot->>'is_active')::BOOLEAN,
      (slot->>'buffer_time')::INTEGER,
      slot->>'organization_type',
      NULLIF(slot->>'clinic_id', '')::UUID,
      NULLIF(slot->>'hospital_id', '')::UUID,
      NULLIF(slot->>'department_id', '')::UUID,
      slot->>'department_name'
    FROM jsonb_array_elements(p_slots) AS slot;
  END IF;
END;
$$;

-- Grant EXECUTE permission back to the authenticated role (Standard pattern for Supabase RPCs)
GRANT EXECUTE ON FUNCTION rpc_replace_doctor_slots(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_replace_doctor_slots(UUID, JSONB) TO service_role;

COMMIT;
