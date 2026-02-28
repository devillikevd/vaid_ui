-- ============================================================
-- SWASTIK Healthcare Platform — TESTING DATABASE
-- Version: 3.0.0 | Date: 2026-02-22
-- ============================================================
--
-- This file includes the FULL production schema + realistic test
-- data. Run this in a fresh Supabase project for local/staging.
--
-- TEST CREDENTIALS (all passwords: "test123456")
-- ┌──────────────────────┬──────────────────────────────┬──────────────────────┐
-- │ Role                 │ Email                        │ Phone                │
-- ├──────────────────────┼──────────────────────────────┼──────────────────────┤
-- │ Super Admin          │ admin@swastik.health         │ +919000000001        │
-- │ Admin                │ moderator@swastik.health     │ +919000000002        │
-- │ Patient 1            │ rahul.kumar@test.com         │ +919100000001        │
-- │ Patient 2            │ priya.sharma@test.com        │ +919100000002        │
-- │ Patient 3            │ amit.patel@test.com          │ +919100000003        │
-- │ Doctor 1             │ dr.arun@test.com             │ +919200000001        │
-- │ Doctor 2             │ dr.meena@test.com            │ +919200000002        │
-- │ Doctor 3             │ dr.vikram@test.com           │ +919200000003        │
-- │ Hospital Owner       │ apollo.admin@test.com        │ +919300000001        │
-- │ Hospital Owner 2     │ fortis.admin@test.com        │ +919300000002        │
-- │ Hospital Manager     │ manager.apollo@test.com      │ +919300000003        │
-- │ Clinic Owner         │ clinic.owner@test.com        │ +919400000001        │
-- │ Pharmacy Owner       │ pharmacy.owner@test.com      │ +919500000001        │
-- │ Pharmacy Owner 2     │ medplus.owner@test.com       │ +919500000002        │
-- │ Ambulance Operator   │ ambulance.op@test.com        │ +919600000001        │
-- │ Ambulance Operator 2 │ ambulance.op2@test.com       │ +919600000002        │
-- └──────────────────────┴──────────────────────────────┴──────────────────────┘
--
-- ============================================================

-- ============================================================
-- STEP 1: LOAD PRODUCTION SCHEMA
-- (Copy-paste swastik_production.sql above this or run it first)
-- ============================================================

-- The schema is included inline below for convenience:

-- ======================= SCHEMA START =======================
-- (Identical to swastik_production.sql — all CREATE TABLE, INDEX,
--  RLS, TRIGGER, VIEW statements. To keep this file maintainable,
--  you can either:
--   A) Run swastik_production.sql first, then run this file, OR
--   B) Uncomment the \i directive below)
-- ======================= SCHEMA END =========================

-- Option A: Include production schema from separate file
-- \i swastik_production.sql

-- Option B: Run production schema inline (paste contents here)
-- For standalone operation, the schema is duplicated below:

-- ============================================================
-- INLINE SCHEMA (identical to swastik_production.sql)
-- ============================================================

-- ============================================================
-- STEP 0: DROP EVERYTHING (clean slate for re-runs)
-- ============================================================
-- Drop ALL public tables and views dynamically (clean slate)
-- Skips extension-owned objects (e.g. PostGIS geography_columns)
DO $$ DECLARE
    r RECORD;
BEGIN
    -- Drop all views first (skip extension-owned ones)
    FOR r IN (
        SELECT c.relname AS viewname
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'v'
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.objid = c.oid AND d.deptype = 'e'
          )
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    -- Drop all tables (skip extension-owned ones)
    FOR r IN (
        SELECT c.relname AS tablename
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.objid = c.oid AND d.deptype = 'e'
          )
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop helper function if exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN (
        'patient', 'doctor', 'hospital_owner', 'hospital_manager',
        'clinic_owner', 'pharmacy_owner', 'ambulance_operator',
        'admin', 'super_admin'
    )),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    fcm_token TEXT,
    profile_image_url TEXT,
    status_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_group TEXT,
    weight DECIMAL(5, 2),
    height DECIMAL(5, 2),
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    abha_number TEXT UNIQUE,
    profile_image_url TEXT,
    medical_conditions TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    current_medications JSONB DEFAULT '[]',
    medical_history JSONB DEFAULT '[]',
    insurance_provider TEXT,
    insurance_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_group TEXT,
    allergies TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    admin_role TEXT DEFAULT 'admin' CHECK (admin_role IN ('admin', 'super_admin', 'moderator')),
    permissions JSONB DEFAULT '{}',
    department TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('medicine', 'appointment', 'test')),
    time TIME NOT NULL,
    days TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    website TEXT,
    emergency_phone TEXT,
    license_number TEXT UNIQUE,
    type TEXT DEFAULT 'Multi-Specialty',
    description TEXT,
    specializations TEXT[] DEFAULT '{}',
    departments TEXT[] DEFAULT '{}',
    facilities TEXT[] DEFAULT '{}',
    accreditations TEXT[] DEFAULT '{}',
    total_beds INTEGER DEFAULT 0,
    beds_available INTEGER DEFAULT 0,
    icu_beds INTEGER DEFAULT 0,
    icu_beds_available INTEGER DEFAULT 0,
    emergency_beds INTEGER DEFAULT 0,
    opening_time TIME,
    closing_time TIME,
    is_24_hours BOOLEAN DEFAULT FALSE,
    is_emergency_available BOOLEAN DEFAULT FALSE,
    ambulance_available BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    license_document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    head_doctor_id UUID,
    description TEXT,
    floor_number TEXT,
    contact_extension TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'manager',
    permissions JSONB DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    sub_specialization TEXT,
    experience_years INTEGER DEFAULT 0,
    qualifications TEXT[] DEFAULT '{}',
    education TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    registration_number TEXT UNIQUE,
    license_number TEXT,
    medical_council TEXT,
    consultation_fee DECIMAL(10, 2) DEFAULT 0,
    video_consultation_fee DECIMAL(10, 2) DEFAULT 0,
    bio TEXT,
    languages TEXT[] DEFAULT '{}',
    available_days TEXT[] DEFAULT '{}',
    available_hours JSONB DEFAULT '{}',
    profile_image_url TEXT,
    license_document_url TEXT,
    degree_certificate_url TEXT,
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
    is_available BOOLEAN DEFAULT TRUE,
    is_accepting_new_patients BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 15,
    is_video_enabled BOOLEAN DEFAULT TRUE,
    is_clinic_enabled BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    consultation_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hospital_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    department TEXT,
    designation TEXT,
    schedule JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hospital_id, doctor_id)
);

CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    license_number TEXT,
    specializations TEXT[] DEFAULT '{}',
    facilities TEXT[] DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    is_24_hours BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    license_document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    schedule JSONB DEFAULT '{}',
    consultation_fee DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, doctor_id)
);

CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    license_number TEXT UNIQUE,
    drug_license_number TEXT,
    gst_number TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    phone TEXT,
    email TEXT,
    opening_time TIME,
    closing_time TIME,
    is_24_hours BOOLEAN DEFAULT FALSE,
    is_open BOOLEAN DEFAULT TRUE,
    delivery_available BOOLEAN DEFAULT FALSE,
    offers_delivery BOOLEAN DEFAULT FALSE,
    delivery_radius_km INTEGER DEFAULT 5,
    min_order_delivery DECIMAL(10, 2) DEFAULT 0,
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    opening_hours JSONB DEFAULT '{}',
    license_document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    generic_name TEXT,
    manufacturer TEXT,
    category TEXT,
    subcategory TEXT,
    description TEXT,
    form TEXT,
    dosage_form TEXT,
    strength TEXT,
    pack_size TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    mrp DECIMAL(10, 2) DEFAULT 0,
    side_effects TEXT[] DEFAULT '{}',
    contraindications TEXT[] DEFAULT '{}',
    storage_instructions TEXT,
    requires_prescription BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES medicines(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    generic_name TEXT,
    manufacturer TEXT,
    category TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    mrp DECIMAL(10, 2),
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    expiry_date DATE,
    batch_number TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    requires_prescription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pharmacy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    prescription_id UUID,
    prescription_url TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    delivery_address JSONB,
    delivery_type TEXT DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery')),
    delivery_instructions TEXT,
    estimated_delivery TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'processing', 'ready',
        'out_for_delivery', 'delivered', 'cancelled', 'refunded'
    )),
    status_history JSONB DEFAULT '[]',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'failed', 'refunded'
    )),
    payment_method TEXT,
    payment_id TEXT,
    payment_reference TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- DIAGNOSTIC CENTER TABLES
-- ========================================

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

-- Diagnostic Centers (including spatial & partial indexes)
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_owner ON diagnostic_centers(owner_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_city ON diagnostic_centers(city);
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_approval ON diagnostic_centers(approval_status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_active_approved ON diagnostic_centers(is_active, is_approved) WHERE is_active = TRUE AND is_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_diagnostic_centers_location ON diagnostic_centers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Diagnostic Tests
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_center ON diagnostic_tests(center_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_category ON diagnostic_tests(category);
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_active ON diagnostic_tests(center_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_diagnostic_tests_price ON diagnostic_tests(price);

-- Diagnostic Bookings
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_patient ON diagnostic_bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_center ON diagnostic_bookings(center_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_test ON diagnostic_bookings(test_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_status ON diagnostic_bookings(status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_result_status ON diagnostic_bookings(result_status);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_date ON diagnostic_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_center_date ON diagnostic_bookings(center_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_number ON diagnostic_bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_pending_results ON diagnostic_bookings(center_id, result_status) WHERE result_status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS ambulance_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    registration_number TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    alternate_phone TEXT,
    email TEXT,
    total_vehicles INTEGER DEFAULT 0,
    available_vehicles INTEGER DEFAULT 0,
    license_document_url TEXT,
    license_expiry DATE,
    service_area TEXT[] DEFAULT '{}',
    base_fare DECIMAL(10, 2) DEFAULT 500,
    per_km_rate DECIMAL(10, 2) DEFAULT 20,
    is_active BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 'under_review', 'approved', 'rejected', 'suspended'
    )),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    approval_notes TEXT,
    total_requests INTEGER DEFAULT 0,
    completed_requests INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER,
    rating DECIMAL(3, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ambulances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES ambulance_operators(id) ON DELETE CASCADE,
    vehicle_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT DEFAULT 'basic' CHECK (vehicle_type IN (
        'basic', 'advanced', 'icu', 'neonatal', 'cardiac',
        'Basic Life Support', 'Advanced Life Support', 'ICU on Wheels'
    )),
    model TEXT,
    vehicle_model TEXT,
    year INTEGER,
    vehicle_year INTEGER,
    has_oxygen BOOLEAN DEFAULT TRUE,
    has_ventilator BOOLEAN DEFAULT FALSE,
    has_defibrillator BOOLEAN DEFAULT FALSE,
    equipment TEXT[] DEFAULT '{}',
    equipment_list TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'available' CHECK (status IN (
        'available', 'busy', 'dispatched', 'maintenance', 'offline'
    )),
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ,
    current_request_id UUID,
    driver_name TEXT,
    driver_phone TEXT,
    driver_license_number TEXT,
    driver_user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    is_on_duty BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW ambulance_vehicles AS SELECT * FROM ambulances;

CREATE TABLE IF NOT EXISTS ambulance_location_pings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambulance_id UUID REFERENCES ambulances(id) ON DELETE CASCADE,
    request_id UUID,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    requester_name TEXT NOT NULL,
    requester_phone TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_latitude DOUBLE PRECISION,
    pickup_longitude DOUBLE PRECISION,
    destination_hospital_id UUID REFERENCES hospitals(id),
    destination_address TEXT,
    emergency_type TEXT DEFAULT 'medical' CHECK (emergency_type IN (
        'medical', 'general', 'accident', 'cardiac', 'trauma', 'pregnancy', 'other'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN (
        'normal', 'high', 'critical'
    )),
    patient_condition TEXT,
    special_requirements TEXT,
    description TEXT,
    symptoms TEXT[] DEFAULT '{}',
    operator_id UUID REFERENCES ambulance_operators(id),
    vehicle_id UUID REFERENCES ambulances(id),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'dispatched',
        'en_route', 'en_route_pickup',
        'arrived', 'arrived_pickup',
        'picked_up', 'patient_onboard',
        'en_route_hospital', 'arrived_hospital',
        'completed', 'cancelled'
    )),
    status_history JSONB DEFAULT '[]',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    pickup_arrived_at TIMESTAMPTZ,
    patient_loaded_at TIMESTAMPTZ,
    hospital_arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    response_time_minutes INTEGER,
    total_time_minutes INTEGER,
    estimated_arrival_minutes INTEGER,
    distance_km DECIMAL(10, 2),
    fare DECIMAL(10, 2),
    payment_status TEXT DEFAULT 'pending',
    notes TEXT,
    admin_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW ambulance_requests AS SELECT * FROM emergency_requests;

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number TEXT UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id),
    clinic_id UUID REFERENCES clinics(id),
    appointment_date DATE NOT NULL,
    time_slot TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type TEXT DEFAULT 'video' CHECK (type IN (
        'video', 'clinic', 'home_visit', 'in_person'
    )),
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed',
        'cancelled', 'no_show', 'rescheduled'
    )),
    consultation_fee DECIMAL(10, 2) DEFAULT 0,
    fee DECIMAL(10, 2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'refunded', 'failed'
    )),
    payment_reference TEXT,
    payment_id TEXT,
    reason_for_visit TEXT,
    reason TEXT,
    symptoms TEXT[] DEFAULT '{}',
    notes TEXT,
    patient_notes TEXT,
    doctor_notes TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID,
    cancelled_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    room_id TEXT UNIQUE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'pending'
    )),
    type TEXT DEFAULT 'video',
    patient_joined_at TIMESTAMPTZ,
    doctor_joined_at TIMESTAMPTZ,
    chief_complaint TEXT,
    symptoms TEXT[] DEFAULT '{}',
    diagnosis TEXT,
    diagnosis_codes TEXT[] DEFAULT '{}',
    notes TEXT,
    advice TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    recording_url TEXT,
    rating INTEGER,
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    heart_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    temperature DECIMAL(4, 1),
    oxygen_level DECIMAL(5, 2),
    respiratory_rate INTEGER,
    weight DECIMAL(5, 2),
    height DECIMAL(5, 2),
    blood_sugar DECIMAL(6, 2),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_number TEXT UNIQUE,
    consultation_id UUID REFERENCES consultations(id),
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    diagnosis TEXT,
    instructions TEXT,
    dietary_advice TEXT,
    lifestyle_advice TEXT,
    medicines JSONB DEFAULT '[]',
    notes TEXT,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    file_url TEXT,
    pdf_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active', 'fulfilled', 'expired', 'cancelled'
    )),
    is_dispensed BOOLEAN DEFAULT FALSE,
    dispensed_at TIMESTAMPTZ,
    dispensed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescription_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    quantity INTEGER,
    before_food BOOLEAN DEFAULT FALSE,
    instructions TEXT,
    is_critical BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'failed', 'refunded'
    )),
    payment_method TEXT,
    payment_reference TEXT,
    gateway_response JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN (
        'blood_test', 'urine_test', 'x_ray', 'mri', 'ct_scan',
        'ecg', 'ultrasound', 'other'
    )),
    lab_name TEXT,
    test_date DATE,
    result_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'normal', 'abnormal', 'critical'
    )),
    doctor_notes TEXT,
    file_url TEXT,
    file_size TEXT,
    parameters JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    reviewable_type TEXT NOT NULL,
    reviewable_id UUID NOT NULL,
    consultation_id UUID REFERENCES consultations(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    response TEXT,
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    category TEXT DEFAULT 'general',
    data JSONB DEFAULT '{}',
    action_url TEXT,
    action_data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_pushed BOOLEAN DEFAULT FALSE,
    pushed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN (
        'text', 'image', 'file', 'prescription', 'report'
    )),
    file_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT,
    email TEXT,
    otp TEXT NOT NULL,
    purpose TEXT DEFAULT 'login' CHECK (purpose IN (
        'phone_verification', 'password_reset', 'login', 'transaction'
    )),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    resource_name TEXT,
    old_values JSONB,
    new_values JSONB,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    note TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADD MISSING COLUMNS (safe for existing databases)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight DECIMAL(5, 2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height DECIMAL(5, 2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_number TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_conditions TEXT[] DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions TEXT[] DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history JSONB DEFAULT '[]';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_id TEXT;

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS sub_specialization TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS medical_council TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS degree_certificate_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_document_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS accreditations TEXT[] DEFAULT '{}';
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS emergency_beds INTEGER DEFAULT 0;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS opening_time TIME;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS closing_time TIME;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_24_hours BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_emergency_available BOOLEAN DEFAULT FALSE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}';

ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION;
ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION;
ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS current_request_id UUID;
ALTER TABLE ambulances ADD COLUMN IF NOT EXISTS driver_user_id UUID;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_number TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS time_slot TIME;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason_for_visit TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by UUID;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS requester_name TEXT;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS requester_phone TEXT;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS pickup_address TEXT;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS pickup_latitude DOUBLE PRECISION;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS pickup_longitude DOUBLE PRECISION;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS vehicle_id UUID;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS operator_id UUID;
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_number TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS dietary_advice TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS lifestyle_advice TEXT;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medicines JSONB DEFAULT '[]';

ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS prescription_url TEXT;

-- Expand emergency_requests status CHECK to include simplified aliases
ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_status_check;
ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_status_check
    CHECK (status IN (
        'pending', 'assigned', 'dispatched',
        'en_route', 'en_route_pickup',
        'arrived', 'arrived_pickup',
        'picked_up', 'patient_onboard',
        'en_route_hospital', 'arrived_hospital',
        'completed', 'cancelled'
    ));

-- ============================================================
-- INDEXES (identical to production)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_city ON patients(city);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_approval_status ON doctors(approval_status);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_is_available ON doctors(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctors_is_approved ON doctors(is_approved);
CREATE INDEX IF NOT EXISTS idx_hospitals_owner_id ON hospitals(owner_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(type);
CREATE INDEX IF NOT EXISTS idx_hospitals_approval ON hospitals(approval_status);
CREATE INDEX IF NOT EXISTS idx_hospitals_lat_lng ON hospitals(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics(city);
CREATE INDEX IF NOT EXISTS idx_clinics_approval ON clinics(approval_status);
CREATE INDEX IF NOT EXISTS idx_clinics_lat_lng ON clinics(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner_id ON pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_city ON pharmacies(city);
CREATE INDEX IF NOT EXISTS idx_pharmacies_approval ON pharmacies(approval_status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_lat_lng ON pharmacies(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ambulances_operator ON ambulances(operator_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status);
CREATE INDEX IF NOT EXISTS idx_ambulances_lat_lng ON ambulances(current_latitude, current_longitude) WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ambulances_driver ON ambulances(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_operators_user_id ON ambulance_operators(user_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_operators_approval ON ambulance_operators(approval_status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment ON consultations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_priority ON emergency_requests(priority);
CREATE INDEX IF NOT EXISTS idx_emergency_operator ON emergency_requests(operator_id);
CREATE INDEX IF NOT EXISTS idx_emergency_patient ON emergency_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_location ON emergency_requests(pickup_latitude, pickup_longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy ON pharmacy_inventory(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_medicine ON pharmacy_inventory(medicine_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy ON pharmacy_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewable ON reviews(reviewable_type, reviewable_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_hospital_managers_user ON hospital_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_managers_hospital ON hospital_managers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_hospital ON hospital_doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_doctor ON hospital_doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinic_doctors_clinic ON clinic_doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_doctors_doctor ON clinic_doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_slots_doctor ON doctor_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);
CREATE INDEX IF NOT EXISTS idx_location_pings_ambulance ON ambulance_location_pings(ambulance_id);
CREATE INDEX IF NOT EXISTS idx_location_pings_created ON ambulance_location_pings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(type);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(patient_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_by ON patient_vitals(recorded_by);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_at ON patient_vitals(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_consultation ON patient_vitals(consultation_id);

-- ============================================================
-- RLS (identical to production)
-- ============================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'users', 'patients', 'doctors', 'hospitals', 'clinics', 'pharmacies',
        'diagnostic_centers', 'diagnostic_tests', 'diagnostic_bookings',
        'ambulance_operators', 'ambulances', 'admins', 'hospital_managers',
        'hospital_departments', 'hospital_doctors', 'clinic_doctors',
        'medicines', 'pharmacy_inventory', 'pharmacy_orders',
        'appointments', 'consultations', 'prescriptions', 'prescription_medicines',
        'emergency_requests', 'reports', 'reviews', 'notifications',
        'chat_messages', 'refresh_tokens', 'otp_verifications', 'audit_logs',
        'payments', 'emergency_contacts', 'family_members',
        'doctor_slots', 'doctor_reviews', 'ambulance_location_pings',
        'reminders', 'patient_vitals'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Service role bypass" ON %I', tbl);
            EXECUTE format('CREATE POLICY "Service role bypass" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================
-- TRIGGERS & FUNCTIONS (identical to production)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT c.table_name FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.column_name = 'updated_at' AND c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
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

CREATE OR REPLACE FUNCTION generate_order_number(prefix TEXT DEFAULT 'ORD')
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           lpad(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'APT-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           lpad(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'RX-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           lpad(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_emergency_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SOS-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           lpad(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_diagnostic_booking_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'DCB-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           lpad(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

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
-- VIEWS (identical to production)
-- ============================================================

CREATE OR REPLACE VIEW pending_approvals AS
SELECT 'doctor' as entity_type, id as entity_id, name, created_at, approval_status
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

CREATE OR REPLACE VIEW active_emergencies AS
SELECT
    er.*,
    p.name as patient_name,
    ao.name as operator_name,
    a.vehicle_number,
    a.driver_name,
    a.driver_phone
FROM emergency_requests er
LEFT JOIN patients p ON er.patient_id = p.id
LEFT JOIN ambulance_operators ao ON er.operator_id = ao.id
LEFT JOIN ambulances a ON er.vehicle_id = a.id
WHERE er.status NOT IN ('completed', 'cancelled')
ORDER BY
    CASE er.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        ELSE 3
    END,
    er.requested_at;

CREATE OR REPLACE VIEW todays_appointments AS
SELECT
    a.*,
    p.name as patient_name,
    d.name as doctor_name,
    d.specialization
FROM appointments a
JOIN patients p ON a.patient_id = p.id
JOIN doctors d ON a.doctor_id = d.id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.time_slot;

DO $$
BEGIN
    GRANT SELECT ON pending_approvals TO authenticated;
    GRANT SELECT ON active_emergencies TO authenticated;
    GRANT SELECT ON todays_appointments TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- ============================================================
--
--  ████████ ███████ ███████ ████████     ██████   █████  ████████  █████
--     ██    ██      ██         ██        ██   ██ ██   ██    ██    ██   ██
--     ██    █████   ███████    ██        ██   ██ ███████    ██    ███████
--     ██    ██           ██   ██        ██   ██ ██   ██    ██    ██   ██
--     ██    ███████ ███████    ██        ██████  ██   ██    ██    ██   ██
--
-- ============================================================
-- ============================================================

-- All passwords are "test123456" hashed with bcryptjs (12 rounds)
-- $2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG

-- ============================================================
-- STEP 2: SEED USERS
-- ============================================================

-- Super Admin
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('a0000000-0000-0000-0000-000000000001', 'admin@swastik.health', '+919000000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'super_admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Admin (moderator)
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('a0000000-0000-0000-0000-000000000002', 'moderator@swastik.health', '+919000000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Patient 1: Rahul Kumar
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('b0000000-0000-0000-0000-000000000001', 'rahul.kumar@test.com', '+919100000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- Patient 2: Priya Sharma
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('b0000000-0000-0000-0000-000000000002', 'priya.sharma@test.com', '+919100000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- Patient 3: Amit Patel
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('b0000000-0000-0000-0000-000000000003', 'amit.patel@test.com', '+919100000003',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- Doctor 1: Dr. Arun Mehta (Cardiologist)
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('c0000000-0000-0000-0000-000000000001', 'dr.arun@test.com', '+919200000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'doctor', true, true)
ON CONFLICT (email) DO NOTHING;

-- Doctor 2: Dr. Meena Iyer (Dermatologist)
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('c0000000-0000-0000-0000-000000000002', 'dr.meena@test.com', '+919200000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'doctor', true, true)
ON CONFLICT (email) DO NOTHING;

-- Doctor 3: Dr. Vikram Reddy (General Medicine)
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('c0000000-0000-0000-0000-000000000003', 'dr.vikram@test.com', '+919200000003',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'doctor', true, true)
ON CONFLICT (email) DO NOTHING;

-- Hospital Owner 1: Apollo
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('d0000000-0000-0000-0000-000000000001', 'apollo.admin@test.com', '+919300000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'hospital_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Hospital Owner 2: Fortis
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('d0000000-0000-0000-0000-000000000002', 'fortis.admin@test.com', '+919300000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'hospital_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Hospital Manager
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('d0000000-0000-0000-0000-000000000003', 'manager.apollo@test.com', '+919300000003',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'hospital_manager', true, true)
ON CONFLICT (email) DO NOTHING;

-- Clinic Owner
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('e0000000-0000-0000-0000-000000000001', 'clinic.owner@test.com', '+919400000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'clinic_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Pharmacy Owner 1
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('f0000000-0000-0000-0000-000000000001', 'pharmacy.owner@test.com', '+919500000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'pharmacy_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Pharmacy Owner 2
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('f0000000-0000-0000-0000-000000000002', 'medplus.owner@test.com', '+919500000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'pharmacy_owner', true, true)
ON CONFLICT (email) DO NOTHING;

-- Ambulance Operator 1
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('f1000000-0000-0000-0000-000000000001', 'ambulance.op@test.com', '+919600000001',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'ambulance_operator', true, true)
ON CONFLICT (email) DO NOTHING;

-- Ambulance Operator 2
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('f1000000-0000-0000-0000-000000000002', 'ambulance.op2@test.com', '+919600000002',
        '$2a$12$LQv3c1yqBo9SkvXS7QTJPe0DWKK67JnPXt1ARZZX5fD8vYSbl3JyG', 'ambulance_operator', true, true)
ON CONFLICT (email) DO NOTHING;

-- YOUR PERSONAL TEST USERS (password: test@123456)
-- Ambulance operator login for your emulator
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('ff000000-0000-0000-0000-000000000001', 'nayanpr620@gmail.com', '+919999999901',
        '$2a$12$n/X7Yzev0ItIvRzJ9fFJJ.xk4nH2K9ElikwGyhfSajCWag2eCgqQy', 'ambulance_operator', true, true)
ON CONFLICT (email) DO NOTHING;

-- Same email as patient (use a different UUID for patient role testing)
INSERT INTO users (id, email, phone, password_hash, role, is_active, is_verified)
VALUES ('ff000000-0000-0000-0000-000000000002', 'nayanpr620+patient@gmail.com', '+919999999902',
        '$2a$12$n/X7Yzev0ItIvRzJ9fFJJ.xk4nH2K9ElikwGyhfSajCWag2eCgqQy', 'patient', true, true)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- STEP 3: SEED ADMINS
-- ============================================================

INSERT INTO admins (user_id, name, admin_role, is_active, permissions)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Swastik Super Admin', 'super_admin', true,
     '{"all": true, "manage_users": true, "manage_hospitals": true, "manage_doctors": true, "manage_pharmacies": true, "manage_ambulances": true, "view_analytics": true}'),
    ('a0000000-0000-0000-0000-000000000002', 'Platform Moderator', 'moderator', true,
     '{"manage_users": true, "manage_hospitals": true, "view_analytics": true}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 4: SEED PATIENTS
-- ============================================================

INSERT INTO patients (id, user_id, name, date_of_birth, gender, blood_group, weight, height, address, city, state, pincode, allergies, medical_conditions, chronic_conditions, abha_number)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Rahul Kumar', '1992-05-15', 'male', 'B+', 72.5, 175.0,
     '45 MG Road, Koramangala', 'Bangalore', 'Karnataka', '560034',
     ARRAY['Penicillin'], ARRAY['Mild Asthma'], ARRAY['Asthma'], 'ABHA-1001-2345-6789'),
    ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
     'Priya Sharma', '1988-11-22', 'female', 'A+', 58.0, 162.0,
     '12 Indiranagar Main Road', 'Bangalore', 'Karnataka', '560038',
     ARRAY['Sulfa drugs', 'Latex'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'ABHA-2002-3456-7890'),
    ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
     'Amit Patel', '1995-03-08', 'male', 'O+', 80.0, 180.0,
     '78 HSR Layout Sector 2', 'Bangalore', 'Karnataka', '560102',
     ARRAY[]::TEXT[], ARRAY['Type 2 Diabetes', 'Hypertension'], ARRAY['Diabetes', 'Hypertension'], 'ABHA-3003-4567-8901')
ON CONFLICT DO NOTHING;

-- Emergency contacts for patients
INSERT INTO emergency_contacts (patient_id, name, phone, relationship, is_primary)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'Sunita Kumar', '+919100100001', 'Mother', true),
    ('b1000000-0000-0000-0000-000000000001', 'Vikas Kumar', '+919100100002', 'Brother', false),
    ('b1000000-0000-0000-0000-000000000002', 'Raj Sharma', '+919100200001', 'Husband', true),
    ('b1000000-0000-0000-0000-000000000003', 'Meera Patel', '+919100300001', 'Wife', true)
ON CONFLICT DO NOTHING;

-- Family members
INSERT INTO family_members (patient_id, name, relationship, date_of_birth, gender, blood_group)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'Sunita Kumar', 'Mother', '1965-01-20', 'female', 'B+'),
    ('b1000000-0000-0000-0000-000000000002', 'Raj Sharma', 'Husband', '1985-06-10', 'male', 'A+'),
    ('b1000000-0000-0000-0000-000000000002', 'Aarav Sharma', 'Son', '2020-02-14', 'male', 'A+'),
    ('b1000000-0000-0000-0000-000000000003', 'Meera Patel', 'Wife', '1996-08-25', 'female', 'O+')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 5: SEED HOSPITALS (Bangalore coordinates)
-- ============================================================

INSERT INTO hospitals (id, owner_id, name, address, city, state, pincode, latitude, longitude, phone, email, website, emergency_phone, license_number, type, description, specializations, departments, facilities, accreditations, total_beds, beds_available, icu_beds, icu_beds_available, emergency_beds, is_24_hours, is_emergency_available, ambulance_available, image_url, is_active, is_approved, approval_status, approved_at, rating, total_reviews)
VALUES
    -- Apollo Hospitals, Bannerghatta Road
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'Apollo Hospitals', 'No. 154/11, Bannerghatta Road, Opp IIM-B', 'Bangalore', 'Karnataka', '560076',
     12.8917, 77.5972, '+918044680000', 'info@apollobangalore.com', 'https://www.apollohospitals.com',
     '+918044680108', 'HOSP-KA-APL-001', 'Multi-Specialty',
     'One of India''s premier healthcare institutions offering comprehensive medical services.',
     ARRAY['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Gastroenterology', 'Nephrology'],
     ARRAY['Emergency', 'Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Radiology', 'Pathology'],
     ARRAY['ICU', 'NICU', 'Operation Theater', 'MRI', 'CT Scan', 'Blood Bank', 'Pharmacy', 'Cafeteria', 'Parking', 'Ambulance'],
     ARRAY['NABH', 'NABL', 'JCI'],
     500, 120, 50, 12, 20, true, true, true,
     'https://example.com/apollo.jpg',
     true, true, 'approved', NOW(), 4.5, 1250),

    -- Fortis Hospital, Cunningham Road
    ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
     'Fortis Hospital', '14, Cunningham Road', 'Bangalore', 'Karnataka', '560052',
     12.9854, 77.5920, '+918066214444', 'info@fortisbangalore.com', 'https://www.fortishealthcare.com',
     '+918066214555', 'HOSP-KA-FRT-002', 'Multi-Specialty',
     'Leading multi-specialty hospital with advanced cardiac care and neurosurgery.',
     ARRAY['Cardiology', 'Neurosurgery', 'Urology', 'Pulmonology', 'Dermatology'],
     ARRAY['Emergency', 'Cardiology', 'Neurosurgery', 'Urology', 'Radiology'],
     ARRAY['ICU', 'Operation Theater', 'CT Scan', 'Blood Bank', 'Pharmacy', 'Parking', 'Ambulance'],
     ARRAY['NABH', 'NABL'],
     250, 60, 30, 8, 15, true, true, true,
     'https://example.com/fortis.jpg',
     true, true, 'approved', NOW(), 4.3, 870),

    -- Manipal Hospital, HAL Airport Road
    ('d1000000-0000-0000-0000-000000000003', NULL,
     'Manipal Hospital', '98, HAL Airport Road, Kodihalli', 'Bangalore', 'Karnataka', '560017',
     12.9608, 77.6483, '+918025024444', 'info@manipalhospital.com', 'https://www.manipalhospitals.com',
     '+918025024555', 'HOSP-KA-MNP-003', 'Super-Specialty',
     'Flagship hospital of Manipal Health Enterprises with cutting-edge technology.',
     ARRAY['Cardiology', 'Oncology', 'Organ Transplant', 'Orthopedics', 'Neurology', 'Pediatrics'],
     ARRAY['Emergency', 'Cardiology', 'Oncology', 'Transplant', 'Pediatrics', 'Radiology'],
     ARRAY['ICU', 'NICU', 'PICU', 'Operation Theater', 'MRI', 'CT Scan', 'PET Scan', 'Blood Bank', 'Pharmacy'],
     ARRAY['NABH', 'NABL', 'JCI'],
     600, 150, 60, 15, 25, true, true, true,
     'https://example.com/manipal.jpg',
     true, true, 'approved', NOW(), 4.6, 1580),

    -- Pending hospital (for testing admin approval flow)
    ('d1000000-0000-0000-0000-000000000004', NULL,
     'HealthFirst Clinic & Hospital', '22, Jayanagar 4th Block', 'Bangalore', 'Karnataka', '560011',
     12.9257, 77.5838, '+918042001234', 'admin@healthfirst.in', NULL,
     NULL, 'HOSP-KA-HF-004', 'General',
     'New community hospital seeking approval.',
     ARRAY['General Medicine', 'Pediatrics'],
     ARRAY['General', 'Pediatrics'],
     ARRAY['Pharmacy', 'Lab'],
     ARRAY[]::TEXT[],
     50, 50, 5, 5, 5, false, false, false,
     NULL,
     true, false, 'pending', NULL, 0, 0)
ON CONFLICT DO NOTHING;

-- Hospital Manager
INSERT INTO hospital_managers (user_id, hospital_id, name, role, is_verified, is_active)
VALUES ('d0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001',
        'Apollo Manager', 'manager', true, true)
ON CONFLICT DO NOTHING;

-- Hospital Departments
INSERT INTO hospital_departments (hospital_id, name, description, floor_number, is_active)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'Cardiology', 'Heart and cardiovascular care', '3', true),
    ('d1000000-0000-0000-0000-000000000001', 'Neurology', 'Brain and nervous system', '4', true),
    ('d1000000-0000-0000-0000-000000000001', 'Emergency', '24/7 emergency services', 'G', true),
    ('d1000000-0000-0000-0000-000000000001', 'Orthopedics', 'Bone and joint care', '2', true),
    ('d1000000-0000-0000-0000-000000000002', 'Cardiology', 'Cardiac care unit', '2', true),
    ('d1000000-0000-0000-0000-000000000002', 'Neurosurgery', 'Brain surgery department', '3', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6: SEED DOCTORS
-- ============================================================

INSERT INTO doctors (id, user_id, hospital_id, name, specialization, sub_specialization, experience_years, qualifications, education, registration_number, license_number, medical_council, consultation_fee, video_consultation_fee, bio, languages, available_days, is_approved, approval_status, approved_at, is_available, rating, total_reviews, total_consultations)
VALUES
    -- Dr. Arun Mehta — Cardiologist at Apollo
    ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'd1000000-0000-0000-0000-000000000001',
     'Dr. Arun Mehta', 'Cardiology', 'Interventional Cardiology', 15,
     ARRAY['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
     ARRAY['AIIMS Delhi - MBBS', 'PGI Chandigarh - MD', 'CMC Vellore - DM'],
     'KMC-2010-12345', 'DOC-KA-ARM-001', 'Karnataka Medical Council',
     800.00, 600.00,
     'Senior interventional cardiologist with 15+ years of experience in complex cardiac procedures including angioplasty and pacemaker implantation.',
     ARRAY['English', 'Hindi', 'Kannada'],
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
     true, 'approved', NOW(), true, 4.7, 320, 2150),

    -- Dr. Meena Iyer — Dermatologist at Fortis
    ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
     'd1000000-0000-0000-0000-000000000002',
     'Dr. Meena Iyer', 'Dermatology', 'Cosmetic Dermatology', 10,
     ARRAY['MBBS', 'MD (Dermatology)', 'Fellowship in Cosmetic Dermatology'],
     ARRAY['Bangalore Medical College - MBBS', 'St. Johns Medical College - MD'],
     'KMC-2014-23456', 'DOC-KA-MNI-002', 'Karnataka Medical Council',
     600.00, 500.00,
     'Experienced dermatologist specializing in acne treatment, laser therapy, and cosmetic procedures.',
     ARRAY['English', 'Hindi', 'Tamil', 'Kannada'],
     ARRAY['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
     true, 'approved', NOW(), true, 4.5, 180, 1200),

    -- Dr. Vikram Reddy — General Medicine at Manipal
    ('c1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003',
     'd1000000-0000-0000-0000-000000000003',
     'Dr. Vikram Reddy', 'General Medicine', 'Internal Medicine', 8,
     ARRAY['MBBS', 'MD (Internal Medicine)'],
     ARRAY['Osmania Medical College - MBBS', 'NIMHANS - MD'],
     'KMC-2016-34567', 'DOC-KA-VKR-003', 'Karnataka Medical Council',
     500.00, 400.00,
     'Internal medicine specialist with expertise in managing chronic diseases including diabetes and hypertension.',
     ARRAY['English', 'Hindi', 'Telugu', 'Kannada'],
     ARRAY['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     true, 'approved', NOW(), true, 4.4, 250, 1800)
ON CONFLICT DO NOTHING;

-- Doctor Slots (availability)
INSERT INTO doctor_slots (doctor_id, day_of_week, start_time, end_time, slot_duration, is_video_enabled, is_clinic_enabled)
VALUES
    -- Dr. Arun: Mon-Fri 9am-1pm, 2pm-5pm
    ('c1000000-0000-0000-0000-000000000001', 1, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 1, '14:00', '17:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 2, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 3, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 4, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 5, '09:00', '13:00', 15, true, true),
    -- Dr. Meena: Mon,Tue,Thu,Fri 10am-1pm, 3pm-6pm, Sat 10am-1pm
    ('c1000000-0000-0000-0000-000000000002', 1, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 1, '15:00', '18:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 2, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 4, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 5, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 6, '10:00', '13:00', 20, false, true),
    -- Dr. Vikram: Mon,Wed,Thu,Fri 8am-12pm, Sat 9am-12pm
    ('c1000000-0000-0000-0000-000000000003', 1, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 3, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 4, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 5, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 6, '09:00', '12:00', 15, false, true)
ON CONFLICT DO NOTHING;

-- Hospital-Doctor associations
INSERT INTO hospital_doctors (hospital_id, doctor_id, department, designation, is_active)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Cardiology', 'Senior Consultant', true),
    ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Dermatology', 'Consultant', true),
    ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'General Medicine', 'Associate Consultant', true)
ON CONFLICT DO NOTHING;

-- Doctor Reviews
INSERT INTO doctor_reviews (doctor_id, patient_id, rating, comment)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 5, 'Excellent cardiologist. Very thorough with diagnosis and patient in explanations.'),
    ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 4, 'Very knowledgeable. Waiting time was a bit long.'),
    ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 5, 'Best dermatologist in Bangalore! Cleared my acne in 2 months.'),
    ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 4, 'Good general physician. Manages my diabetes well.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 7: SEED CLINICS
-- ============================================================

INSERT INTO clinics (id, owner_id, name, registration_number, address, city, state, pincode, latitude, longitude, phone, email, specializations, facilities, is_24_hours, is_active, is_approved, approval_status, approved_at, rating, total_reviews)
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     'HealthCare Family Clinic', 'CLN-KA-HC-001',
     '34, 100 Feet Road, Indiranagar', 'Bangalore', 'Karnataka', '560038',
     12.9719, 77.6412, '+918041234567', 'info@healthcareclinic.in',
     ARRAY['General Medicine', 'Pediatrics', 'ENT'],
     ARRAY['Lab', 'Pharmacy', 'ECG', 'X-Ray'],
     false, true, true, 'approved', NOW(), 4.2, 85),
    ('e1000000-0000-0000-0000-000000000002', NULL,
     'CityMed 24/7 Clinic', 'CLN-KA-CM-002',
     '56, BTM Layout 2nd Stage', 'Bangalore', 'Karnataka', '560076',
     12.9165, 77.6101, '+918042345678', 'info@citymed.in',
     ARRAY['General Medicine', 'Gynecology'],
     ARRAY['Lab', 'Ultrasound'],
     true, true, true, 'approved', NOW(), 4.0, 42)
ON CONFLICT DO NOTHING;

-- Clinic-Doctor association
INSERT INTO clinic_doctors (clinic_id, doctor_id, consultation_fee, is_active)
VALUES ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 400.00, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 8: SEED PHARMACIES
-- ============================================================

INSERT INTO pharmacies (id, owner_id, name, license_number, drug_license_number, gst_number, address, city, state, pincode, latitude, longitude, phone, email, opening_time, closing_time, is_24_hours, is_open, delivery_available, offers_delivery, delivery_radius_km, is_active, is_approved, is_verified, approval_status, approved_at, rating, total_reviews)
VALUES
    ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
     'MedPlus Pharmacy', 'PHR-KA-MP-001', 'DL-KA-20B-12345', 'GST29XXXXX1Z5',
     '12, Brigade Road', 'Bangalore', 'Karnataka', '560001',
     12.9716, 77.6079, '+918043456789', 'medplus@test.com',
     '08:00', '22:00', false, true, true, true, 10,
     true, true, true, 'approved', NOW(), 4.3, 156),
    ('f2000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002',
     'Apollo Pharmacy', 'PHR-KA-AP-002', 'DL-KA-20B-23456', 'GST29XXXXX2Z6',
     '45, Koramangala 5th Block', 'Bangalore', 'Karnataka', '560095',
     12.9344, 77.6149, '+918044567890', 'apollopharmacy@test.com',
     NULL, NULL, true, true, true, true, 15,
     true, true, true, 'approved', NOW(), 4.5, 230)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 9: SEED MEDICINES CATALOG
-- ============================================================

INSERT INTO medicines (id, name, generic_name, manufacturer, category, form, dosage_form, strength, pack_size, price, mrp, requires_prescription, side_effects, description)
VALUES
    ('70000000-0000-0000-0000-000000000001', 'Dolo 650', 'Paracetamol', 'Micro Labs Ltd', 'Analgesic', 'Tablet', 'Tablet', '650mg', '15 tablets', 30.00, 35.00, false,
     ARRAY['Nausea', 'Rash'], 'Fever and mild pain reliever'),
    ('70000000-0000-0000-0000-000000000002', 'Azithral 500', 'Azithromycin', 'Alembic Pharma', 'Antibiotic', 'Tablet', 'Tablet', '500mg', '3 tablets', 95.00, 120.00, true,
     ARRAY['Diarrhea', 'Nausea', 'Stomach pain'], 'Broad-spectrum antibiotic'),
    ('70000000-0000-0000-0000-000000000003', 'Pan 40', 'Pantoprazole', 'Alkem Laboratories', 'Antacid', 'Tablet', 'Tablet', '40mg', '15 tablets', 80.00, 95.00, true,
     ARRAY['Headache', 'Dizziness'], 'Proton pump inhibitor for acidity'),
    ('70000000-0000-0000-0000-000000000004', 'Crocin Advance', 'Paracetamol', 'GSK', 'Analgesic', 'Tablet', 'Tablet', '500mg', '20 tablets', 25.00, 30.00, false,
     ARRAY['Nausea'], 'Pain and fever relief'),
    ('70000000-0000-0000-0000-000000000005', 'Allegra 120', 'Fexofenadine', 'Sanofi', 'Antihistamine', 'Tablet', 'Tablet', '120mg', '10 tablets', 120.00, 150.00, true,
     ARRAY['Drowsiness', 'Headache'], 'Non-drowsy antihistamine for allergies'),
    ('70000000-0000-0000-0000-000000000006', 'Metformin 500', 'Metformin HCl', 'USV Limited', 'Antidiabetic', 'Tablet', 'Tablet', '500mg', '20 tablets', 35.00, 40.00, true,
     ARRAY['Nausea', 'Diarrhea', 'Metallic taste'], 'First-line medication for Type 2 diabetes'),
    ('70000000-0000-0000-0000-000000000007', 'Atorvastatin 10', 'Atorvastatin', 'Ranbaxy', 'Statin', 'Tablet', 'Tablet', '10mg', '15 tablets', 90.00, 110.00, true,
     ARRAY['Muscle pain', 'Fatigue'], 'Cholesterol-lowering medication'),
    ('70000000-0000-0000-0000-000000000008', 'Amoxicillin 500', 'Amoxicillin', 'Cipla', 'Antibiotic', 'Capsule', 'Capsule', '500mg', '10 capsules', 65.00, 80.00, true,
     ARRAY['Diarrhea', 'Rash', 'Nausea'], 'Broad-spectrum penicillin antibiotic'),
    ('70000000-0000-0000-0000-000000000009', 'Cetirizine 10', 'Cetirizine', 'Cipla', 'Antihistamine', 'Tablet', 'Tablet', '10mg', '10 tablets', 20.00, 25.00, false,
     ARRAY['Drowsiness', 'Dry mouth'], 'Antihistamine for allergy relief'),
    ('70000000-0000-0000-0000-000000000010', 'ORS Electral', 'Oral Rehydration Salts', 'FDC', 'Rehydration', 'Powder', 'Sachet', '21.8g', '5 sachets', 25.00, 30.00, false,
     ARRAY[]::TEXT[], 'Oral rehydration for dehydration')
ON CONFLICT DO NOTHING;

-- Pharmacy Inventory (stock in each pharmacy)
INSERT INTO pharmacy_inventory (pharmacy_id, medicine_id, name, generic_name, manufacturer, category, price, mrp, discount_percent, quantity, is_available, requires_prescription)
VALUES
    -- MedPlus stock
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Dolo 650', 'Paracetamol', 'Micro Labs', 'Analgesic', 28.00, 35.00, 20, 200, true, false),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Azithral 500', 'Azithromycin', 'Alembic', 'Antibiotic', 90.00, 120.00, 25, 50, true, true),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Pan 40', 'Pantoprazole', 'Alkem', 'Antacid', 75.00, 95.00, 21, 100, true, true),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', 'Metformin 500', 'Metformin HCl', 'USV', 'Antidiabetic', 32.00, 40.00, 20, 150, true, true),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Cetirizine 10', 'Cetirizine', 'Cipla', 'Antihistamine', 18.00, 25.00, 28, 300, true, false),
    -- Apollo Pharmacy stock
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'Dolo 650', 'Paracetamol', 'Micro Labs', 'Analgesic', 30.00, 35.00, 14, 500, true, false),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Crocin Advance', 'Paracetamol', 'GSK', 'Analgesic', 22.00, 30.00, 27, 400, true, false),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Allegra 120', 'Fexofenadine', 'Sanofi', 'Antihistamine', 110.00, 150.00, 27, 80, true, true),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000007', 'Atorvastatin 10', 'Atorvastatin', 'Ranbaxy', 'Statin', 85.00, 110.00, 23, 120, true, true),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000008', 'Amoxicillin 500', 'Amoxicillin', 'Cipla', 'Antibiotic', 60.00, 80.00, 25, 90, true, true),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000010', 'ORS Electral', 'ORS', 'FDC', 'Rehydration', 22.00, 30.00, 27, 200, true, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 10: SEED AMBULANCE OPERATORS & VEHICLES
-- ============================================================

INSERT INTO ambulance_operators (id, user_id, name, company_name, registration_number, address, city, state, phone, email, total_vehicles, available_vehicles, service_area, base_fare, per_km_rate, is_active, is_approved, approval_status, approved_at, rating, total_trips, completed_requests)
VALUES
    ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
     'Rajesh Ambulance Services', 'Rajesh Emergency Services Pvt Ltd', 'AMB-KA-RAS-001',
     '100, Wilson Garden', 'Bangalore', 'Karnataka', '+919600000001', 'rajesh.ambulance@test.com',
     3, 2, ARRAY['Bangalore', 'Bangalore Rural'], 500.00, 20.00,
     true, true, 'approved', NOW(), 4.4, 520, 485),
    ('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002',
     'City Ambulance Network', 'City Emergency Services', 'AMB-KA-CAN-002',
     '55, Whitefield Main Road', 'Bangalore', 'Karnataka', '+919600000002', 'city.ambulance@test.com',
     2, 1, ARRAY['Bangalore', 'Electronic City'], 600.00, 25.00,
     true, true, 'approved', NOW(), 4.2, 280, 250)
ON CONFLICT DO NOTHING;

INSERT INTO ambulances (id, operator_id, vehicle_number, vehicle_type, vehicle_model, vehicle_year, has_oxygen, has_ventilator, has_defibrillator, equipment, driver_name, driver_phone, status, current_latitude, current_longitude, is_active, is_available)
VALUES
    -- Rajesh fleet
    ('f4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001',
     'KA-01-AB-1234', 'Basic Life Support', 'Force Traveller', 2022,
     true, false, false, ARRAY['Stretcher', 'First Aid Kit', 'Oxygen Cylinder', 'Suction Machine'],
     'Suresh Kumar', '+919611111111', 'available', 12.9352, 77.6245, true, true),
    ('f4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000001',
     'KA-01-CD-5678', 'Advanced Life Support', 'Force Traveller BS6', 2023,
     true, true, true, ARRAY['Stretcher', 'First Aid Kit', 'Oxygen Cylinder', 'Ventilator', 'Defibrillator', 'Cardiac Monitor'],
     'Manoj Singh', '+919622222222', 'available', 12.9716, 77.5946, true, true),
    ('f4000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000001',
     'KA-01-EF-9012', 'ICU on Wheels', 'Tata Winger', 2023,
     true, true, true, ARRAY['ICU Bed', 'Ventilator', 'Defibrillator', 'Cardiac Monitor', 'Infusion Pump', 'Syringe Pump'],
     'Ravi Prasad', '+919633333333', 'maintenance', NULL, NULL, true, false),
    -- City fleet
    ('f4000000-0000-0000-0000-000000000004', 'f3000000-0000-0000-0000-000000000002',
     'KA-05-GH-3456', 'Basic Life Support', 'Force Traveller', 2021,
     true, false, false, ARRAY['Stretcher', 'First Aid Kit', 'Oxygen Cylinder'],
     'Dinesh Rao', '+919644444444', 'available', 12.9698, 77.7500, true, true),
    ('f4000000-0000-0000-0000-000000000005', 'f3000000-0000-0000-0000-000000000002',
     'KA-05-IJ-7890', 'Advanced Life Support', 'Force Traveller BS6', 2023,
     true, true, true, ARRAY['Stretcher', 'Ventilator', 'Defibrillator', 'Cardiac Monitor', 'Oxygen Cylinder'],
     'Prashanth Gowda', '+919655555555', 'busy', 12.8400, 77.6600, true, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 11: SEED SAMPLE APPOINTMENTS
-- ============================================================

INSERT INTO appointments (id, appointment_number, patient_id, doctor_id, hospital_id, appointment_date, time_slot, type, status, consultation_fee, fee, payment_status, reason_for_visit, symptoms)
VALUES
    -- Upcoming appointment
    ('80000000-0000-0000-0000-000000000001', 'APT-20260225-0001',
     'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
     'd1000000-0000-0000-0000-000000000001',
     CURRENT_DATE + 3, '10:00', 'video', 'confirmed', 800.00, 800.00, 'paid',
     'Regular cardiac checkup', ARRAY['Mild chest discomfort', 'Occasional palpitations']),
    -- Completed appointment
    ('80000000-0000-0000-0000-000000000002', 'APT-20260220-0002',
     'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
     'd1000000-0000-0000-0000-000000000002',
     CURRENT_DATE - 5, '11:00', 'clinic', 'completed', 600.00, 600.00, 'paid',
     'Skin rash treatment', ARRAY['Itchy rash on arms', 'Redness']),
    -- Today's appointment
    ('80000000-0000-0000-0000-000000000003', 'APT-20260222-0003',
     'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003',
     'd1000000-0000-0000-0000-000000000003',
     CURRENT_DATE, '09:00', 'video', 'scheduled', 500.00, 500.00, 'paid',
     'Diabetes follow-up', ARRAY['Increased thirst', 'Fatigue'])
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 12: SEED SAMPLE CONSULTATIONS & PRESCRIPTIONS
-- ============================================================

-- Completed consultation for Priya's derma visit
INSERT INTO consultations (id, appointment_id, patient_id, doctor_id, room_id, started_at, ended_at, duration_minutes, status, chief_complaint, symptoms, diagnosis, notes, advice, follow_up_required, follow_up_date)
VALUES ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002',
        'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002',
        'ROOM-20260220-001', CURRENT_DATE - 5 + TIME '11:05', CURRENT_DATE - 5 + TIME '11:25',
        20, 'completed',
        'Itchy rash on both arms for 1 week',
        ARRAY['Itchy rash', 'Redness', 'Mild swelling'],
        'Contact Dermatitis — likely allergic reaction to new detergent',
        'Patient advised to switch detergent and avoid scratching. Prescribed topical steroid and antihistamine.',
        'Avoid known allergens. Wear cotton clothes. Keep area moisturized.',
        true, CURRENT_DATE + 10)
ON CONFLICT DO NOTHING;

INSERT INTO prescriptions (id, prescription_number, consultation_id, patient_id, doctor_id, diagnosis, instructions, dietary_advice, lifestyle_advice, valid_until, status)
VALUES ('82000000-0000-0000-0000-000000000001', 'RX-20260220-0001',
        '81000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
        'c1000000-0000-0000-0000-000000000002',
        'Contact Dermatitis',
        'Apply cream twice daily on affected area. Take antihistamine at bedtime.',
        'Avoid spicy food and alcohol during treatment.',
        'Use mild soap. Wear cotton clothes. Avoid scratching.',
        CURRENT_DATE + 30, 'active')
ON CONFLICT DO NOTHING;

INSERT INTO prescription_medicines (prescription_id, medicine_name, generic_name, dosage, frequency, duration, quantity, before_food, instructions)
VALUES
    ('82000000-0000-0000-0000-000000000001', 'Betamethasone Cream 0.1%', 'Betamethasone', 'Apply thin layer', 'Twice daily', '14 days', 1, false, 'Apply on affected area only'),
    ('82000000-0000-0000-0000-000000000001', 'Cetirizine 10mg', 'Cetirizine', '10mg', 'Once daily at bedtime', '7 days', 7, false, 'May cause drowsiness'),
    ('82000000-0000-0000-0000-000000000001', 'Calamine Lotion', 'Calamine + Zinc Oxide', 'Apply as needed', 'As needed', '14 days', 1, false, 'For itch relief')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 13: SEED SAMPLE REPORTS
-- ============================================================

INSERT INTO reports (patient_id, name, type, lab_name, test_date, result_date, status, parameters)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'Complete Blood Count', 'blood_test', 'SRL Diagnostics',
     CURRENT_DATE - 15, CURRENT_DATE - 14, 'normal',
     '[{"name": "Hemoglobin", "value": "14.5", "unit": "g/dL", "range": "13.0-17.0", "status": "normal"},
       {"name": "WBC", "value": "7200", "unit": "/µL", "range": "4000-11000", "status": "normal"},
       {"name": "Platelets", "value": "250000", "unit": "/µL", "range": "150000-400000", "status": "normal"},
       {"name": "RBC", "value": "5.1", "unit": "M/µL", "range": "4.5-5.5", "status": "normal"}]'::JSONB),
    ('b1000000-0000-0000-0000-000000000003', 'HbA1c Test', 'blood_test', 'Thyrocare',
     CURRENT_DATE - 30, CURRENT_DATE - 29, 'abnormal',
     '[{"name": "HbA1c", "value": "7.8", "unit": "%", "range": "< 5.7", "status": "high"},
       {"name": "Fasting Blood Sugar", "value": "145", "unit": "mg/dL", "range": "70-100", "status": "high"},
       {"name": "Post-Prandial Sugar", "value": "210", "unit": "mg/dL", "range": "< 140", "status": "high"}]'::JSONB),
    ('b1000000-0000-0000-0000-000000000003', 'Lipid Profile', 'blood_test', 'Thyrocare',
     CURRENT_DATE - 30, CURRENT_DATE - 29, 'normal',
     '[{"name": "Total Cholesterol", "value": "195", "unit": "mg/dL", "range": "< 200", "status": "normal"},
       {"name": "LDL", "value": "110", "unit": "mg/dL", "range": "< 130", "status": "normal"},
       {"name": "HDL", "value": "52", "unit": "mg/dL", "range": "> 40", "status": "normal"},
       {"name": "Triglycerides", "value": "148", "unit": "mg/dL", "range": "< 150", "status": "normal"}]'::JSONB)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 14: SEED SAMPLE EMERGENCY REQUEST (completed)
-- ============================================================

INSERT INTO emergency_requests (id, request_number, patient_id, requester_name, requester_phone, pickup_address, pickup_latitude, pickup_longitude, destination_hospital_id, destination_address, emergency_type, priority, patient_condition, operator_id, vehicle_id, status, requested_at, assigned_at, dispatched_at, completed_at, response_time_minutes, total_time_minutes, distance_km, fare, payment_status)
VALUES ('83000000-0000-0000-0000-000000000001', 'SOS-20260215-0001',
        'b1000000-0000-0000-0000-000000000001', 'Rahul Kumar', '+919100000001',
        '45 MG Road, Koramangala', 12.9352, 77.6245,
        'd1000000-0000-0000-0000-000000000001', 'Apollo Hospitals, Bannerghatta Road',
        'cardiac', 'high', 'Chest pain and shortness of breath',
        'f3000000-0000-0000-0000-000000000001', 'f4000000-0000-0000-0000-000000000002',
        'completed',
        NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '2 minutes',
        NOW() - INTERVAL '7 days' + INTERVAL '3 minutes', NOW() - INTERVAL '7 days' + INTERVAL '28 minutes',
        2, 28, 8.5, 670.00, 'completed')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 15: SEED SAMPLE PHARMACY ORDER
-- ============================================================

INSERT INTO pharmacy_orders (order_number, pharmacy_id, patient_id, items, subtotal, discount, delivery_fee, total_amount, delivery_type, status, payment_status, payment_method)
VALUES ('ORD-20260218-0001', 'f2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
        '[{"name": "Dolo 650", "quantity": 2, "price": 28.00}, {"name": "Pan 40", "quantity": 1, "price": 75.00}]'::JSONB,
        131.00, 13.10, 30.00, 147.90, 'delivery', 'delivered', 'paid', 'UPI')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 16: SEED NOTIFICATIONS
-- ============================================================

INSERT INTO notifications (user_id, title, message, type, category, data, is_read)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Appointment Confirmed', 'Your appointment with Dr. Arun Mehta on ' || (CURRENT_DATE + 3)::TEXT || ' at 10:00 AM is confirmed.', 'appointment', 'appointment', '{"appointment_id": "80000000-0000-0000-0000-000000000001"}'::JSONB, false),
    ('b0000000-0000-0000-0000-000000000002', 'Prescription Ready', 'Your prescription from Dr. Meena Iyer is ready for pickup at MedPlus Pharmacy.', 'prescription', 'pharmacy', '{"prescription_id": "82000000-0000-0000-0000-000000000001"}'::JSONB, true),
    ('b0000000-0000-0000-0000-000000000003', 'Appointment Reminder', 'You have an appointment with Dr. Vikram Reddy today at 9:00 AM.', 'reminder', 'appointment', '{"appointment_id": "80000000-0000-0000-0000-000000000003"}'::JSONB, false),
    ('c0000000-0000-0000-0000-000000000001', 'New Appointment', 'New appointment scheduled with Rahul Kumar on ' || (CURRENT_DATE + 3)::TEXT || '.', 'appointment', 'appointment', '{}'::JSONB, false),
    ('d0000000-0000-0000-0000-000000000001', 'Hospital Approved', 'Apollo Hospitals has been approved by the admin team.', 'system', 'general', '{}'::JSONB, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 17: SEED SYSTEM SETTINGS
-- ============================================================

INSERT INTO system_settings (key, value, description)
VALUES
    ('platform_name', '"Swastik Health"'::JSONB, 'Platform display name'),
    ('support_email', '"support@swastik.health"'::JSONB, 'Support email address'),
    ('support_phone', '"+918001234567"'::JSONB, 'Support phone number'),
    ('max_ambulance_search_radius_km', '50'::JSONB, 'Maximum search radius for ambulances in km'),
    ('default_consultation_duration_minutes', '30'::JSONB, 'Default video consultation duration'),
    ('appointment_reminder_hours', '2'::JSONB, 'Hours before appointment to send reminder'),
    ('emergency_auto_cancel_minutes', '15'::JSONB, 'Auto-cancel unaccepted emergency requests after N minutes'),
    ('pharmacy_order_auto_cancel_hours', '24'::JSONB, 'Auto-cancel unpaid pharmacy orders after N hours'),
    ('min_app_version_android', '"1.0.0"'::JSONB, 'Minimum supported Android app version'),
    ('maintenance_mode', 'false'::JSONB, 'Whether platform is in maintenance mode')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- STEP 18: SEED PAYMENTS
-- ============================================================

INSERT INTO payments (appointment_id, patient_id, doctor_id, amount, status, payment_method, payment_reference)
VALUES
    ('80000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 800.00, 'completed', 'UPI', 'PAY-UPI-20260222-001'),
    ('80000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 600.00, 'completed', 'Card', 'PAY-CARD-20260220-001'),
    ('80000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 500.00, 'completed', 'UPI', 'PAY-UPI-20260222-002')
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 19: SEED REVIEWS
-- ============================================================

INSERT INTO reviews (patient_id, reviewable_type, reviewable_id, rating, title, comment, is_verified, is_visible, is_approved)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'hospital', 'd1000000-0000-0000-0000-000000000001', 5, 'Excellent Hospital', 'World-class facilities and caring staff. Apollo never disappoints.', true, true, true),
    ('b1000000-0000-0000-0000-000000000002', 'hospital', 'd1000000-0000-0000-0000-000000000002', 4, 'Good Experience', 'Clean and well-organized. Slightly expensive but worth it.', true, true, true),
    ('b1000000-0000-0000-0000-000000000002', 'pharmacy', 'f2000000-0000-0000-0000-000000000001', 4, 'Quick Delivery', 'Got my medicines delivered in 45 minutes. Good service.', true, true, true),
    ('b1000000-0000-0000-0000-000000000003', 'hospital', 'd1000000-0000-0000-0000-000000000003', 5, 'Best in Bangalore', 'Manipal Hospital is top-notch. Dr. Vikram is excellent.', true, true, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TESTING DATABASE SETUP COMPLETE
-- ============================================================

SELECT '✅ SWASTIK TESTING DATABASE v3.0 DEPLOYED!' as status;
SELECT '──────────────────────────────────────────────────' as separator;
SELECT '📋 TEST CREDENTIALS (password: test123456 for all)' as info;
SELECT '──────────────────────────────────────────────────' as separator;
SELECT role, email, phone FROM users ORDER BY
    CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'patient' THEN 3
        WHEN 'doctor' THEN 4
        WHEN 'hospital_owner' THEN 5
        WHEN 'hospital_manager' THEN 6
        WHEN 'clinic_owner' THEN 7
        WHEN 'pharmacy_owner' THEN 8
        WHEN 'ambulance_operator' THEN 9
    END;
