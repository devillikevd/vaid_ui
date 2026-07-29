-- ============================================================
-- 050: EXERCISE LIBRARY SCHEMA ENHANCEMENT
-- Adds body_part, target_muscle, category columns and indexes
-- for the comprehensive ExerciseDB dataset integration.
-- ============================================================

ALTER TABLE exercise_library
ADD COLUMN IF NOT EXISTS body_part TEXT,
ADD COLUMN IF NOT EXISTS target_muscle TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_exercise_library_body_part ON exercise_library(body_part);
CREATE INDEX IF NOT EXISTS idx_exercise_library_target ON exercise_library(target_muscle);
CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_slug ON exercise_library(slug);

-- Composite index for common filter combo: body_part + level
CREATE INDEX IF NOT EXISTS idx_exercise_library_body_level ON exercise_library(body_part, level);
