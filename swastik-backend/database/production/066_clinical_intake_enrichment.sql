-- ============================================================
-- 066: CLINICAL INTAKE ENRICHMENT
-- Adds structured pre-consultation intake fields to appointments
-- for medical-grade data capture (severity, onset, allergies,
-- voice notes, supporting documents).
-- ============================================================

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('mild','moderate','severe')),
  ADD COLUMN IF NOT EXISTS onset_type TEXT CHECK (onset_type IN ('sudden','gradual')),
  ADD COLUMN IF NOT EXISTS symptom_duration TEXT,
  ADD COLUMN IF NOT EXISTS symptom_pattern TEXT CHECK (symptom_pattern IN ('constant','comes_and_goes')),
  ADD COLUMN IF NOT EXISTS severity_current INTEGER CHECK (severity_current >= 0 AND severity_current <= 10),
  ADD COLUMN IF NOT EXISTS severity_worst INTEGER CHECK (severity_worst >= 0 AND severity_worst <= 10),
  ADD COLUMN IF NOT EXISTS known_allergies TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_medications TEXT,
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  ADD COLUMN IF NOT EXISTS voice_note_url TEXT,
  ADD COLUMN IF NOT EXISTS supporting_documents TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reason_for_visit TEXT;

-- Update reason_for_visit from existing reason column for backfill
UPDATE appointments
SET reason_for_visit = reason
WHERE reason IS NOT NULL AND reason_for_visit IS NULL;
