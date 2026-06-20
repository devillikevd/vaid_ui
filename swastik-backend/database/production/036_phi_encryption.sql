-- ============================================================
-- 036: PHI Encryption & Blind Indexes
-- Adds blind index columns for searching encrypted medical conditions
-- ============================================================

-- Add blind index arrays to patients table for searchable PHI
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS medical_conditions_idx TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS chronic_conditions_idx TEXT[] DEFAULT '{}';

-- We do not add blind indexes for allergies because the recommendation engine
-- doesn't currently search by allergies.

-- Ensure existing rows have empty arrays instead of null
UPDATE patients
SET 
  medical_conditions_idx = '{}' WHERE medical_conditions_idx IS NULL;

UPDATE patients
SET 
  chronic_conditions_idx = '{}' WHERE chronic_conditions_idx IS NULL;

-- Create GIN indexes to allow fast array searches using the @> operator
CREATE INDEX IF NOT EXISTS idx_patients_medical_conditions_idx ON patients USING GIN (medical_conditions_idx);
CREATE INDEX IF NOT EXISTS idx_patients_chronic_conditions_idx ON patients USING GIN (chronic_conditions_idx);
