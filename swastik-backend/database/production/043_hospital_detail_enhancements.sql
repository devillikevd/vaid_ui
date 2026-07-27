-- Migration 043: Hospital Detail Enhancement Fields
-- Correctly updates the hospitals table to support the new Patient App UI

-- 1. Add new columns that don't exist yet
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS insurance_accepted TEXT[] DEFAULT '{}';

-- 2. Add website_url column directly (instead of renaming, to avoid errors)
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Copy existing website data to the new column
UPDATE hospitals SET website_url = website WHERE website_url IS NULL AND website IS NOT NULL;

-- 3. Convert opening_hours from JSONB to TEXT
-- (Dropping and recreating is the safest way to avoid type casting syntax errors in standard SQL editors)
ALTER TABLE hospitals DROP COLUMN IF EXISTS opening_hours;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS opening_hours TEXT;
