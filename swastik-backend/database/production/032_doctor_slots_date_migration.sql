-- Migration script to change day_of_week to slot_date

-- 1. Drop the day_of_week column
ALTER TABLE doctor_slots DROP COLUMN IF EXISTS day_of_week;

-- 2. Add slot_date column
ALTER TABLE doctor_slots ADD COLUMN IF NOT EXISTS slot_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Remove the default now that we have populated it or the schema handles it
ALTER TABLE doctor_slots ALTER COLUMN slot_date DROP DEFAULT;

-- 3. Replace the RPC function
CREATE OR REPLACE FUNCTION rpc_replace_doctor_slots(
  p_doctor_id UUID,
  p_slots JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot JSONB;
  v_inserted INTEGER := 0;
BEGIN
  DELETE FROM doctor_slots WHERE doctor_id = p_doctor_id;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO doctor_slots (
      doctor_id, slot_date, start_time, end_time, is_active
    ) VALUES (
      p_doctor_id,
      (v_slot->>'slot_date')::DATE,
      v_slot->>'start_time',
      v_slot->>'end_time',
      true
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'inserted', v_inserted);
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_replace_doctor_slots(UUID, JSONB) TO service_role;
