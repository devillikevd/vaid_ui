-- ============================================================
-- DIAGNOSTIC CENTER ECOSYSTEM — PRODUCTION MIGRATION
-- Version: 1.0.0 | Date: 2026-02-24
-- ============================================================
--
-- Run this file on an existing Swastik production database
-- to add full Diagnostic Center support.
--
-- Safe to re-run (all statements are idempotent).
--
-- Contains: Tables, Indexes, RLS, Triggers, Functions, Views
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLES
-- ============================================================

-- 1.1 Diagnostic Centers (facility registration + approval)
CREATE TABLE IF NOT EXISTS diagnostic_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE,
    license_number TEXT,
    nabl_accreditation TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    website TEXT,
    emergency_phone TEXT,
    test_categories TEXT[] DEFAULT '{}',
    accreditations TEXT[] DEFAULT '{}',
    sample_collection_available BOOLEAN DEFAULT TRUE,
    home_collection_available BOOLEAN DEFAULT FALSE,
    home_collection_fee DECIMAL(10, 2) DEFAULT 0,
    opening_hours JSONB DEFAULT '{}',
    is_24_hours BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    gallery_urls TEXT[] DEFAULT '{}',
    license_document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    rejection_reason TEXT,
    suspension_reason TEXT,
    suspended_at TIMESTAMPTZ,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Diagnostic Tests (catalog of tests offered by each center)
CREATE TABLE IF NOT EXISTS diagnostic_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES diagnostic_centers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    discounted_price DECIMAL(10, 2) CHECK (discounted_price IS NULL OR discounted_price >= 0),
    turnaround_hours INTEGER DEFAULT 24 CHECK (turnaround_hours > 0),
    sample_type TEXT,
    preparation_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Diagnostic Bookings (patient → center + test)
CREATE TABLE IF NOT EXISTS diagnostic_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    center_id UUID REFERENCES diagnostic_centers(id) ON DELETE SET NULL,
    test_id UUID REFERENCES diagnostic_tests(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    booking_time TIME,
    collection_type TEXT DEFAULT 'walk_in' CHECK (collection_type IN (
        'walk_in', 'home_collection'
    )),
    collection_address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'booked' CHECK (status IN (
        'booked', 'sample_collected', 'processing', 'completed', 'cancelled'
    )),
    result_status TEXT DEFAULT 'pending' CHECK (result_status IN (
        'pending', 'processing', 'completed', 'delivered'
    )),
    result_url TEXT,
    result_notes TEXT,
    result_uploaded_at TIMESTAMPTZ,
    result_uploaded_by UUID REFERENCES users(id),
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

-- Diagnostic Centers
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_owner
    ON diagnostic_centers(owner_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_city
    ON diagnostic_centers(city);
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_approval
    ON diagnostic_centers(approval_status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_active_approved
    ON diagnostic_centers(is_active, is_approved)
    WHERE is_active = TRUE AND is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_location
    ON diagnostic_centers(latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Diagnostic Tests
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_center
    ON diagnostic_tests(center_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_category
    ON diagnostic_tests(category);
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_active
    ON diagnostic_tests(center_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_price
    ON diagnostic_tests(price);

-- Diagnostic Bookings
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_patient
    ON diagnostic_bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_center
    ON diagnostic_bookings(center_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_test
    ON diagnostic_bookings(test_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_status
    ON diagnostic_bookings(status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_result_status
    ON diagnostic_bookings(result_status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_date
    ON diagnostic_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_center_date
    ON diagnostic_bookings(center_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_number
    ON diagnostic_bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_pending_results
    ON diagnostic_bookings(center_id, result_status)
    WHERE result_status IN ('pending', 'processing');

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'diagnostic_centers',
        'diagnostic_tests',
        'diagnostic_bookings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Service role bypass" ON %I', tbl);
            EXECUTE format(
                'CREATE POLICY "Service role bypass" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                tbl
            );
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 4. TRIGGERS (auto-update updated_at)
-- ============================================================

-- Ensure the update function exists (safe to re-create)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to diagnostic tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'diagnostic_centers',
        'diagnostic_tests',
        'diagnostic_bookings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', tbl, tbl);
            EXECUTE format('
                CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
            ', tbl, tbl);
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Generate unique booking number (DCB-YYYYMMDD-XXXX)
CREATE OR REPLACE FUNCTION generate_diagnostic_booking_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'DCB-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           lpad(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-assign booking_number on INSERT if null
CREATE OR REPLACE FUNCTION auto_assign_diagnostic_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_number IS NULL THEN
        NEW.booking_number := generate_diagnostic_booking_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diagnostic_booking_number ON diagnostic_bookings;
CREATE TRIGGER trg_diagnostic_booking_number
    BEFORE INSERT ON diagnostic_bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_diagnostic_booking_number();

-- ============================================================
-- 6. VIEWS (update admin dashboard)
-- ============================================================

-- Replace pending_approvals view to include diagnostic centers
CREATE OR REPLACE VIEW pending_approvals AS
SELECT 'doctor' AS entity_type, id AS entity_id, name, created_at, approval_status
FROM doctors WHERE approval_status = 'pending'
UNION ALL
SELECT 'hospital', id, name, created_at, approval_status
FROM hospitals WHERE approval_status = 'pending'
UNION ALL
SELECT 'clinic', id, name, created_at, approval_status
FROM clinics WHERE approval_status = 'pending'
UNION ALL
SELECT 'pharmacy', id, name, created_at, approval_status
FROM pharmacies WHERE approval_status = 'pending'
UNION ALL
SELECT 'diagnostic_center', id, name, created_at, approval_status
FROM diagnostic_centers WHERE approval_status = 'pending'
UNION ALL
SELECT 'ambulance', id, name, created_at, approval_status
FROM ambulance_operators WHERE approval_status = 'pending'
ORDER BY created_at DESC;

-- Grant view access
DO $$
BEGIN
    GRANT SELECT ON pending_approvals TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

SELECT '✅ Diagnostic Center migration v1.0 applied successfully!' AS status;
SELECT '📋 Tables: diagnostic_centers, diagnostic_tests, diagnostic_bookings' AS created;
SELECT '🔐 RLS enabled on all 3 tables' AS security;
