-- 046_clinic_enhancements.sql
-- Bring clinics to full feature parity with hospitals

-- 1. Add enhanced detail columns to clinics (if missing)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS insurance_accepted TEXT[] DEFAULT '{}';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS accreditations TEXT[] DEFAULT '{}';

-- Convert opening_hours from JSONB to TEXT (match hospital behavior)
-- Only runs if column type is JSONB; safe to skip if already TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics'
      AND column_name = 'opening_hours'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE clinics DROP COLUMN opening_hours;
    ALTER TABLE clinics ADD COLUMN opening_hours TEXT;
  END IF;
END $$;

-- 2. Clinic Reels table
CREATE TABLE IF NOT EXISTS clinic_reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_reels_clinic_id ON clinic_reels(clinic_id);

ALTER TABLE clinic_reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view clinic reels" ON clinic_reels;
CREATE POLICY "Public can view clinic reels"
ON clinic_reels FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Clinic owner can insert reels" ON clinic_reels;
CREATE POLICY "Clinic owner can insert reels"
ON clinic_reels FOR INSERT
WITH CHECK (
    clinic_id IN (
        SELECT id FROM clinics
        WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Clinic owner can update reels" ON clinic_reels;
CREATE POLICY "Clinic owner can update reels"
ON clinic_reels FOR UPDATE
USING (
    clinic_id IN (
        SELECT id FROM clinics
        WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Clinic owner can delete reels" ON clinic_reels;
CREATE POLICY "Clinic owner can delete reels"
ON clinic_reels FOR DELETE
USING (
    clinic_id IN (
        SELECT id FROM clinics
        WHERE owner_id = auth.uid()
    )
);

-- 3. Clinic Departments table
CREATE TABLE IF NOT EXISTS clinic_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    head_doctor_id UUID,
    description TEXT,
    contact_extension TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_departments_clinic_id ON clinic_departments(clinic_id);

ALTER TABLE clinic_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view clinic departments" ON clinic_departments;
CREATE POLICY "Public can view clinic departments"
ON clinic_departments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Clinic owner can manage departments" ON clinic_departments;
CREATE POLICY "Clinic owner can manage departments"
ON clinic_departments FOR ALL
USING (
    clinic_id IN (
        SELECT id FROM clinics
        WHERE owner_id = auth.uid()
    )
);
