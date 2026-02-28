-- Migration 005: Prevent double-booking via unique constraint
-- Ensures only one active appointment per doctor + date + time slot combination

-- Create a unique partial index (only for active appointments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment 
ON appointments (doctor_id, appointment_date, time_slot)
WHERE status IN ('scheduled', 'confirmed', 'in_progress');

-- Create an RPC function for atomic conflict-safe booking
CREATE OR REPLACE FUNCTION rpc_book_appointment(
    p_patient_id UUID,
    p_doctor_id UUID,
    p_appointment_date DATE,
    p_time_slot TEXT,
    p_type TEXT DEFAULT 'clinic',
    p_notes TEXT DEFAULT NULL,
    p_hospital_id UUID DEFAULT NULL,
    p_fee NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_appointment RECORD;
    v_conflict_count INT;
BEGIN
    -- Lock the row range to prevent concurrent inserts
    PERFORM pg_advisory_xact_lock(hashtext(p_doctor_id::text || p_appointment_date::text || p_time_slot));
    
    -- Check for conflicts
    SELECT COUNT(*) INTO v_conflict_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = p_appointment_date
      AND time_slot = p_time_slot
      AND status IN ('scheduled', 'confirmed', 'in_progress');
    
    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'slot_taken');
    END IF;
    
    -- Insert the appointment
    INSERT INTO appointments (patient_id, doctor_id, appointment_date, time_slot, type, notes, hospital_id, fee, status)
    VALUES (p_patient_id, p_doctor_id, p_appointment_date, p_time_slot, p_type, p_notes, p_hospital_id, p_fee, 'scheduled')
    RETURNING * INTO v_appointment;
    
    RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment.id,
        'appointment_number', v_appointment.appointment_number
    );
END;
$$ LANGUAGE plpgsql;
