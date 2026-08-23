-- ============================================================
-- 098: Universal Referrals Downstream Attribution
-- Implements Phase 7.1 Downstream Traceability
-- ============================================================

-- Consultations (Clinic / Hospital Doctors)
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultations') THEN
        ALTER TABLE consultations ADD COLUMN IF NOT EXISTS source_referral_id UUID REFERENCES universal_referrals(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_consultations_source_referral_id ON consultations(source_referral_id);
    END IF;
END $$;

-- Diagnostic Bookings
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'diagnostic_bookings') THEN
        ALTER TABLE diagnostic_bookings ADD COLUMN IF NOT EXISTS source_referral_id UUID REFERENCES universal_referrals(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_source_referral_id ON diagnostic_bookings(source_referral_id);
    END IF;
END $$;

-- Pharmacy Orders
DO $$ BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacy_orders') THEN
        ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS source_referral_id UUID REFERENCES universal_referrals(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_source_referral_id ON pharmacy_orders(source_referral_id);
    END IF;
END $$;
