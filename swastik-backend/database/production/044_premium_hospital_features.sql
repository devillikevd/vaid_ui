-- ============================================================
-- 044: PREMIUM HOSPITAL FEATURES
-- ER Wait Time, Doctor Video Reels, Virtual Tour, Floor Guide
-- ============================================================

-- 1. ER Wait Time (hospital admin updates from Emergency Dashboard)
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS er_wait_time_minutes INTEGER;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS er_last_updated_at TIMESTAMPTZ;

-- 2. 360° Virtual Room Tour URL
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;

-- 3. Indoor Navigation / Floor Guide (JSONB for wing→floor→department mapping)
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS floor_guide JSONB DEFAULT '{}';

-- 4. Doctor Intro Video Reel (15-sec video uploaded to Supabase Storage)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS intro_video_url TEXT;
