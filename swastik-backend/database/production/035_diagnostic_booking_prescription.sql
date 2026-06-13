-- ============================================================
-- Add prescription_id to diagnostic_bookings
-- ============================================================

ALTER TABLE public.diagnostic_bookings
ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL;
