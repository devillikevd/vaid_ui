git@github.com:nayanpr620/SWASTIK-TELEMEDICINE.git-- ============================================================================
-- Migration 002: Atomic RPC Functions
-- Fixes: C7 (non-atomic consultation/appointment writes),
--        C11 (non-atomic ambulance dispatch),
--        M2 (non-atomic doctor slot replacement),
--        M3 (JSONB status_history race condition)
-- ============================================================================
-- Run with:  psql -f 002_atomic_rpc_functions.sql  OR via Supabase SQL editor

BEGIN;

-- ============================================================================
-- C7 Fix: Atomic start consultation
-- Creates a consultation record AND updates the appointment status in one TX.
-- Returns the new consultation row as JSON.
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_start_consultation(
  p_appointment_id UUID,
  p_doctor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment RECORD;
  v_consultation RECORD;
BEGIN
  -- Lock the appointment row to prevent concurrent starts
  SELECT * INTO v_appointment
    FROM appointments
    WHERE id = p_appointment_id
      AND doctor_id = p_doctor_id
      AND status IN ('scheduled', 'confirmed')
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'appointment_not_found'
    );
  END IF;

  -- Create consultation
  INSERT INTO consultations (
    appointment_id, doctor_id, patient_id, status, started_at, type
  ) VALUES (
    p_appointment_id, p_doctor_id, v_appointment.patient_id,
    'in_progress', now(), v_appointment.type
  )
  RETURNING * INTO v_consultation;

  -- Update appointment status atomically
  UPDATE appointments
    SET status = 'in_progress', updated_at = now()
    WHERE id = p_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'consultation', row_to_json(v_consultation)::jsonb
  );
END;
$$;

-- ============================================================================
-- C7 Fix: Atomic end consultation
-- Updates consultation to completed AND updates appointment in one TX.
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_end_consultation(
  p_consultation_id UUID,
  p_doctor_id UUID,
  p_diagnosis TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_follow_up_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consultation RECORD;
BEGIN
  -- Lock and update consultation
  UPDATE consultations
    SET status = 'completed',
        ended_at = now(),
        diagnosis = COALESCE(p_diagnosis, diagnosis),
        notes = COALESCE(p_notes, notes),
        follow_up_date = COALESCE(p_follow_up_date, follow_up_date)
    WHERE id = p_consultation_id
      AND doctor_id = p_doctor_id
    RETURNING * INTO v_consultation;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'consultation_not_found'
    );
  END IF;

  -- Update appointment atomically
  IF v_consultation.appointment_id IS NOT NULL THEN
    UPDATE appointments
      SET status = 'completed', updated_at = now()
      WHERE id = v_consultation.appointment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'consultation', row_to_json(v_consultation)::jsonb
  );
END;
$$;

-- ============================================================================
-- C11 Fix: Atomic ambulance dispatch
-- Creates/updates emergency_request status AND locks the ambulance in one TX.
-- Used by ambulanceService.requestAmbulance for non-broadcast direct dispatch.
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_dispatch_ambulance(
  p_request_id UUID,
  p_ambulance_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ambulance RECORD;
BEGIN
  -- Lock ambulance and verify it's available
  SELECT * INTO v_ambulance
    FROM ambulances
    WHERE id = p_ambulance_id
      AND status = 'available'
      AND is_active = true
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'ambulance_unavailable'
    );
  END IF;

  -- Update request status to dispatched + assign vehicle
  UPDATE emergency_requests
    SET status = 'dispatched',
        vehicle_id = p_ambulance_id,
        assigned_at = now()
    WHERE id = p_request_id
      AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'request_not_pending'
    );
  END IF;

  -- Lock the ambulance
  UPDATE ambulances
    SET status = 'dispatched',
        current_request_id = p_request_id
    WHERE id = p_ambulance_id;

  RETURN jsonb_build_object(
    'success', true,
    'ambulance', row_to_json(v_ambulance)::jsonb
  );
END;
$$;

-- ============================================================================
-- M2 Fix: Atomic doctor slot replacement
-- Deletes all existing slots for a doctor and inserts new ones in a single TX.
-- p_slots is a JSON array of {day_of_week, start_time, end_time} objects.
-- ============================================================================
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
  -- Delete all existing slots for this doctor
  DELETE FROM doctor_slots WHERE doctor_id = p_doctor_id;

  -- Insert new slots
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO doctor_slots (
      doctor_id, day_of_week, start_time, end_time, is_active
    ) VALUES (
      p_doctor_id,
      (v_slot->>'day_of_week')::INTEGER,
      v_slot->>'start_time',
      v_slot->>'end_time',
      true
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', v_inserted
  );
END;
$$;

-- ============================================================================
-- M3 Fix: Atomic JSONB status_history append
-- Appends a new entry to the status_history JSONB array without read-modify-write.
-- ============================================================================
CREATE OR REPLACE FUNCTION rpc_append_status_history(
  p_request_id UUID,
  p_entry JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE emergency_requests
    SET status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(p_entry)
    WHERE id = p_request_id;
END;
$$;

-- ============================================================================
-- Grant execute permissions to service_role (used by backend via supabaseAdmin)
-- ============================================================================
-- Note: In Supabase, the service_role key bypasses RLS and has full access.
-- These GRANTs ensure the functions can be called via supabaseAdmin.rpc().

GRANT EXECUTE ON FUNCTION rpc_start_consultation(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION rpc_end_consultation(UUID, UUID, TEXT, TEXT, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION rpc_dispatch_ambulance(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION rpc_replace_doctor_slots(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION rpc_append_status_history(UUID, JSONB) TO service_role;

COMMIT;
