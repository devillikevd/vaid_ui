-- ============================================================
-- 093: PLATFORM SOURCE ATTRIBUTION
-- Unifies acquisition source taxonomy across Appointments,
-- Diagnostic Bookings, and Pharmacy Orders.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. APPOINTMENTS
-- ============================================================

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'unknown';

-- Ensure no nulls before adding constraints
UPDATE public.appointments
SET source = 'unknown'
WHERE source IS NULL;

-- Drop constraint if it exists (for idempotency)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS check_appointments_source;

ALTER TABLE public.appointments
ADD CONSTRAINT check_appointments_source 
CHECK (source IN (
    'vaididea_app', 
    'vaididea_web', 
    'clinic_referral', 
    'hospital_referral', 
    'doctor_referral', 
    'affiliate', 
    'direct_walk_in', 
    'direct_phone', 
    'unknown'
));

CREATE INDEX IF NOT EXISTS idx_appointments_source ON public.appointments(source);

-- ============================================================
-- 2. DIAGNOSTIC BOOKINGS
-- ============================================================

-- Safely drop the auto-generated check constraint from 092
DO $$
DECLARE
    found_constraint text;
BEGIN
    SELECT conname INTO found_constraint
    FROM pg_constraint
    WHERE conrelid = 'public.diagnostic_bookings'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%source%';

    IF found_constraint IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.diagnostic_bookings DROP CONSTRAINT ' || found_constraint;
    END IF;
END $$;

-- Map legacy values deterministically without losing attribution
UPDATE public.diagnostic_bookings
SET source = 'unknown'
WHERE source IS NULL OR source = 'online';

UPDATE public.diagnostic_bookings
SET source = 'direct_walk_in'
WHERE source = 'walk_in';

-- (clinic_referral and hospital_referral remain identical)

-- Update the default behavior
ALTER TABLE public.diagnostic_bookings ALTER COLUMN source SET DEFAULT 'unknown';

-- Apply the canonical constraint
ALTER TABLE public.diagnostic_bookings
ADD CONSTRAINT check_diagnostic_bookings_source
CHECK (source IN (
    'vaididea_app', 
    'vaididea_web', 
    'clinic_referral', 
    'hospital_referral', 
    'doctor_referral', 
    'affiliate', 
    'direct_walk_in', 
    'direct_phone', 
    'unknown'
));

-- (Index already created in 092)

-- ============================================================
-- 3. PHARMACY ORDERS
-- ============================================================

-- Drop the named constraint created in 088
ALTER TABLE public.pharmacy_orders DROP CONSTRAINT IF EXISTS check_pharmacy_orders_source;

-- Map legacy values deterministically
UPDATE public.pharmacy_orders
SET source = 'unknown'
WHERE source IS NULL OR source = 'online';

UPDATE public.pharmacy_orders
SET source = 'direct_walk_in'
WHERE source = 'pos';

-- Update the default behavior
ALTER TABLE public.pharmacy_orders ALTER COLUMN source SET DEFAULT 'unknown';

-- Apply the canonical constraint
ALTER TABLE public.pharmacy_orders
ADD CONSTRAINT check_pharmacy_orders_source
CHECK (source IN (
    'vaididea_app', 
    'vaididea_web', 
    'clinic_referral', 
    'hospital_referral', 
    'doctor_referral', 
    'affiliate', 
    'direct_walk_in', 
    'direct_phone', 
    'unknown'
));

-- (Index already created in 088)

COMMIT;
