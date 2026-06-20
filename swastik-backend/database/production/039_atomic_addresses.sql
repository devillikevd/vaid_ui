-- Atomic append to saved_addresses
CREATE OR REPLACE FUNCTION append_saved_address(user_uuid UUID, new_address JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE patients
  SET saved_addresses = COALESCE(saved_addresses, '[]'::jsonb) || new_address
  WHERE user_id = user_uuid;
END;
$$;

-- Atomic delete from saved_addresses
CREATE OR REPLACE FUNCTION delete_saved_address(user_uuid UUID, address_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE patients
  SET saved_addresses = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(COALESCE(saved_addresses, '[]'::jsonb)) AS elem
    WHERE elem->>'id' != address_id
  )
  WHERE user_id = user_uuid;
END;
$$;
