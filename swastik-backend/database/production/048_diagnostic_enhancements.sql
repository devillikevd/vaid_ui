-- Migration: 048_diagnostic_enhancements.sql
-- Add premium columns to diagnostic_centers and create diagnostic_reels

-- 1. Add premium profile columns to diagnostic_centers
ALTER TABLE public.diagnostic_centers
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS established_year int,
ADD COLUMN IF NOT EXISTS virtual_tour_url text,
ADD COLUMN IF NOT EXISTS floor_guide_map_url text;

-- 2. Create diagnostic_reels table
CREATE TABLE IF NOT EXISTS public.diagnostic_reels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    diagnostic_center_id uuid REFERENCES public.diagnostic_centers(id) ON DELETE CASCADE,
    video_url text NOT NULL,
    thumbnail_url text,
    title text,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_reels_center_id ON public.diagnostic_reels(diagnostic_center_id);

-- Enable RLS
ALTER TABLE public.diagnostic_reels ENABLE ROW LEVEL SECURITY;

-- Policies for diagnostic_reels
-- Public can read all diagnostic_reels
CREATE POLICY "Public can view diagnostic reels"
ON public.diagnostic_reels FOR SELECT
USING (true);

-- Diagnostic Center owner can insert/update/delete their own reels
CREATE POLICY "Owners can manage their diagnostic reels"
ON public.diagnostic_reels FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.diagnostic_centers
        WHERE id = diagnostic_reels.diagnostic_center_id
        AND owner_id = auth.uid()
    )
);

-- Force schema cache reload in postgrest
NOTIFY pgrst, 'reload schema';
