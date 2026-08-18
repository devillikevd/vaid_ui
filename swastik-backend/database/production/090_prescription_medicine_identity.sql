-- Migration 090: Add medicine_id to prescription_medicines for Global Medicine Identity
-- This establishes a canonical link to the global medicines catalog while preserving 
-- the string-based medicine_name and generic_name as historical snapshots.

BEGIN;

ALTER TABLE public.prescription_medicines
ADD COLUMN IF NOT EXISTS medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prescription_medicines_medicine_id 
ON public.prescription_medicines(medicine_id);

COMMIT;
