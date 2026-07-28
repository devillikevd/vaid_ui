-- 047_pharmacy_enhancements.sql
-- Bring pharmacies to full feature parity with hospitals/clinics

-- 1. Add enhanced detail columns to pharmacies (if missing)
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS accreditations TEXT[] DEFAULT '{}';
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT '{}';

-- Convert opening_hours from JSONB to TEXT if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pharmacies'
      AND column_name = 'opening_hours'
      AND data_type = 'jsonb'
  ) THEN
    ALTER TABLE pharmacies DROP COLUMN opening_hours;
    ALTER TABLE pharmacies ADD COLUMN opening_hours TEXT;
  END IF;
END $$;

-- 2. Pharmacy Reels table
CREATE TABLE IF NOT EXISTS pharmacy_reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_reels_pharmacy_id ON pharmacy_reels(pharmacy_id);

ALTER TABLE pharmacy_reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view pharmacy reels" ON pharmacy_reels;
CREATE POLICY "Public can view pharmacy reels"
ON pharmacy_reels FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Pharmacy owner can insert reels" ON pharmacy_reels;
CREATE POLICY "Pharmacy owner can insert reels"
ON pharmacy_reels FOR INSERT
WITH CHECK (
    pharmacy_id IN (
        SELECT id FROM pharmacies
        WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Pharmacy owner can update reels" ON pharmacy_reels;
CREATE POLICY "Pharmacy owner can update reels"
ON pharmacy_reels FOR UPDATE
USING (
    pharmacy_id IN (
        SELECT id FROM pharmacies
        WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Pharmacy owner can delete reels" ON pharmacy_reels;
CREATE POLICY "Pharmacy owner can delete reels"
ON pharmacy_reels FOR DELETE
USING (
    pharmacy_id IN (
        SELECT id FROM pharmacies
        WHERE owner_id = auth.uid()
    )
);
