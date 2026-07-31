-- ============================================================
-- 053: FITNESS CENTER REELS — GYM / STUDIO SHORT VIDEOS
-- Mirrors hospital/clinic/pharmacy/diagnostic reels so gyms and
-- studios can publish short video reels alongside their images.
-- Safe to re-run (all statements are idempotent / guarded).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fitness_center_reels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fitness_center_id uuid REFERENCES public.fitness_centers(id) ON DELETE CASCADE,
    video_url text NOT NULL,
    thumbnail_url text,
    title text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fitness_center_reels_center_id ON public.fitness_center_reels(fitness_center_id);

-- Enable RLS + revoke direct access (defense-in-depth; backend uses service role)
ALTER TABLE public.fitness_center_reels ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON public.fitness_center_reels FROM anon, authenticated;

-- Everyone can view gym/studio reels
DROP POLICY IF EXISTS "Public can view fitness center reels" ON public.fitness_center_reels;
CREATE POLICY "Public can view fitness center reels"
ON public.fitness_center_reels FOR SELECT
USING (true);

-- Fitness center owner can insert/update/delete their own reels
DROP POLICY IF EXISTS "Owners can manage their fitness center reels" ON public.fitness_center_reels;
CREATE POLICY "Owners can manage their fitness center reels"
ON public.fitness_center_reels FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.fitness_centers
        WHERE id = fitness_center_reels.fitness_center_id
        AND owner_user_id = auth.uid()
    )
);
