-- ============================================================
-- 057: WELLNESS ASSESSMENT & PATIENT GYM CLASS BOOKING
-- Adds structured fields to fitness_profiles for the patient
-- wellness assessment (Goals / Bio / Health Screening) and
-- supporting indexes for patient-facing gym class schedule
-- queries. Safe to re-run (all statements are idempotent).
-- ============================================================

-- ── 1. Assessment Goals ──────────────────────────────────────
ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS target_weight DECIMAL(5, 2);

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS workout_frequency INTEGER;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS preferred_workout_time TEXT;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS preferred_workout_types TEXT[] DEFAULT '{}';

-- ── 2. Assessment Bio ────────────────────────────────────────
ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS height DECIMAL(5, 2);

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS weight DECIMAL(5, 2);

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS body_fat_percentage DECIMAL(5, 2);

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}';

-- ── 3. Assessment Health Screening ───────────────────────────
ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS has_medical_conditions BOOLEAN DEFAULT FALSE;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS has_injuries BOOLEAN DEFAULT FALSE;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN DEFAULT FALSE;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS takes_medication BOOLEAN DEFAULT FALSE;

ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS doctor_clearance BOOLEAN DEFAULT FALSE;

-- ── 4. Assessment lifecycle ──────────────────────────────────
ALTER TABLE fitness_profiles
ADD COLUMN IF NOT EXISTS assessment_status TEXT DEFAULT 'pending'
CHECK (assessment_status IN ('pending', 'in_progress', 'completed'));

-- ── 5. Patient-facing class schedule indexes ─────────────────
CREATE INDEX IF NOT EXISTS idx_fitness_classes_center_starts
ON fitness_classes(center_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_fitness_bookings_patient_class
ON fitness_bookings(patient_id, class_id, status);
