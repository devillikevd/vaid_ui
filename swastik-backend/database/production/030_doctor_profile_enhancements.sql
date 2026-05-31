-- ============================================================
-- 030: DOCTOR PROFILE ENHANCEMENTS & REAL-TIME LOGIC
-- ============================================================

-- 1. Add new fields to doctors table for premium profile
ALTER TABLE doctors
ADD COLUMN IF NOT EXISTS awards TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS consultation_types TEXT[] DEFAULT '{"In-Person", "Video"}';

-- 2. Real-time dynamic logic for "Patients Treated"
-- Function to increment total_consultations when an appointment is completed
CREATE OR REPLACE FUNCTION update_doctor_patients_treated()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is changed to completed
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
        UPDATE doctors
        SET total_consultations = COALESCE(total_consultations, 0) + 1
        WHERE id = NEW.doctor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS trigger_update_doctor_patients_treated ON appointments;

-- Create trigger on appointments table
CREATE TRIGGER trigger_update_doctor_patients_treated
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_doctor_patients_treated();

-- 3. Dynamic Logic for Queue Calculation
-- A function to count how many patients are ahead in the queue for a specific doctor today.
-- This counts pending/scheduled/in_progress appointments for the current day.
CREATE OR REPLACE FUNCTION get_doctor_queue_count(p_doctor_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_queue_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_queue_count
    FROM appointments
    WHERE doctor_id = p_doctor_id
      AND appointment_date = CURRENT_DATE
      AND status IN ('scheduled', 'confirmed', 'in_progress', 'active');
      
    RETURN v_queue_count;
END;
$$ LANGUAGE plpgsql;
