-- Add status_history to appointments to track the lifecycle audit trail
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';

-- Create table for doctor's private internal notes on patients
CREATE TABLE IF NOT EXISTS doctor_patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(doctor_id, patient_id)
);

-- Trigger to update timestamp on internal notes
DROP TRIGGER IF EXISTS update_doctor_patient_notes_updated_at ON doctor_patient_notes;
CREATE TRIGGER update_doctor_patient_notes_updated_at
    BEFORE UPDATE ON doctor_patient_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
