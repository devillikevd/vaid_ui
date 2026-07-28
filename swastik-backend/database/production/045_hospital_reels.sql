-- 045_hospital_reels.sql
-- Create hospital_reels table for video reels

CREATE TABLE IF NOT EXISTS hospital_reels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_reels_hospital_id ON hospital_reels(hospital_id);

-- Add RLS Policies
ALTER TABLE hospital_reels ENABLE ROW LEVEL SECURITY;

-- Everyone can view hospital reels
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON hospital_reels;
CREATE POLICY "Public profiles are viewable by everyone" 
ON hospital_reels FOR SELECT 
USING (true);

-- Only hospital owner/manager can insert/update/delete their reels
DROP POLICY IF EXISTS "Users can insert their own hospital reels" ON hospital_reels;
CREATE POLICY "Users can insert their own hospital reels" 
ON hospital_reels FOR INSERT 
WITH CHECK (
    hospital_id IN (
        SELECT id FROM hospitals 
        WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their own hospital reels" ON hospital_reels;
CREATE POLICY "Users can update their own hospital reels" 
ON hospital_reels FOR UPDATE 
USING (
    hospital_id IN (
        SELECT id FROM hospitals 
        WHERE owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their own hospital reels" ON hospital_reels;
CREATE POLICY "Users can delete their own hospital reels" 
ON hospital_reels FOR DELETE 
USING (
    hospital_id IN (
        SELECT id FROM hospitals 
        WHERE owner_id = auth.uid()
    )
);

