-- ============================================================
-- 092: DIAGNOSTIC BOOKING SOURCE & HOSPITAL B2B
-- Adds hospital routing context and explicit source tracking.
-- ============================================================

-- 1. Add hospital_id to diagnostic_bookings to support Hospital B2B referrals
ALTER TABLE public.diagnostic_bookings
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;

-- 2. Add source tracking
-- Note: 'online' is used as the default for all existing historical rows,
-- as there is no reliable way to infer if they were walk-in vs app bookings.
ALTER TABLE public.diagnostic_bookings
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'online' CHECK (
    source IN ('online', 'walk_in', 'clinic_referral', 'hospital_referral')
);

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_source ON public.diagnostic_bookings(source);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_hospital_id ON public.diagnostic_bookings(hospital_id);
