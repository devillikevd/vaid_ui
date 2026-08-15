-- ============================================================
-- 066: DOCTORS SPECIALIZATIONS ARRAY
-- Adds a specializations array column to support multiple specializations
-- ============================================================

-- Add the array column if it doesn't exist
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';

-- Migrate existing singular specializations into the array
UPDATE doctors 
SET specializations = ARRAY[specialization] 
WHERE (specializations = '{}' OR specializations IS NULL) AND specialization IS NOT NULL AND specialization != '';

-- Note: The existing 'specialization' column is retained and now serves 
-- as the designated "Primary Specialization" for backward compatibility.
