-- ============================================================
-- 038: DB Idempotency Constraints
-- Prevent race conditions and duplicates
-- ============================================================

-- First, deduplicate any existing records that violate the new constraints

-- Deduplicate prescriptions by keeping the oldest one for a given (patient_id, consultation_id)
DELETE FROM prescriptions p1
USING prescriptions p2
WHERE p1.patient_id = p2.patient_id 
  AND p1.consultation_id = p2.consultation_id 
  AND p1.id > p2.id; -- Keep the oldest record (smaller UUID lexicographically or created_at)

-- Add unique constraint to prescriptions to prevent duplicate issuances per consultation
ALTER TABLE prescriptions 
DROP CONSTRAINT IF EXISTS unique_prescription_per_consultation;

ALTER TABLE prescriptions 
ADD CONSTRAINT unique_prescription_per_consultation UNIQUE (patient_id, consultation_id);

-- Add an idempotency_key column to prescriptions to allow safe retries
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;



