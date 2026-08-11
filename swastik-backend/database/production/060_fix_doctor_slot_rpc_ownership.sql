-- 060: M011 — enforce doctor ownership in rpc_replace_doctor_slots
-- The function is SECURITY DEFINER (bypasses RLS), so without an explicit
-- ownership check any caller who could invoke the RPC could replace ANY
-- doctor's slots. auth.uid() = the requesting user's id (from their JWT).
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
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM doctors WHERE id = p_doctor_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: you can only replace your own slots';
  END IF;

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
