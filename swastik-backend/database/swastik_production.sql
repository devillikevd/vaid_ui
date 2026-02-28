-- ============================================================
-- SWASTIK Healthcare Platform — PRODUCTION DATABASE SCHEMA
-- Version: 3.1.0 | Date: 2026-02-24
-- ============================================================
--
-- This is the SINGLE SOURCE OF TRUTH for the Swastik database.
-- Run this entire file in Supabase SQL Editor for a fresh setup.
-- Safe to re-run (all statements are idempotent).
--
-- Contains: Tables, Indexes, RLS, Triggers, Functions, Views
-- Does NOT contain: Test data (see swastik_testing.sql)
--
-- ============================================================

-- ============================================================
-- PART 1: CORE TABLES
-- ============================================================

-- 1.1 Users (authentication)
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

-- 1.2 Patients
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

-- 1.3 Emergency Contacts (separate table, linked to patient)
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Family Members (linked to patient)
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

-- 1.5 Admins
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

-- 1.6 Reminders
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

-- 1.7 Patient Vitals — MOVED to Part 5.6 (after consultations table, which it references)

-- ============================================================
-- PART 2: PROVIDER TABLES (Hospitals, Doctors, Clinics, etc.)
-- ============================================================

-- 2.1 Hospitals
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

-- 2.2 Hospital Departments
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

-- 2.3 Hospital Managers
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

-- 2.4 Doctors
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

-- 2.5 Doctor Slots (availability schedule)
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

-- 2.6 Doctor Reviews
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

-- 2.7 Hospital-Doctor Association
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

-- 2.8 Clinics
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

-- 2.9 Clinic-Doctor Association
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

-- ============================================================
-- PART 3: PHARMACY & MEDICINE TABLES
-- ============================================================

-- 3.1 Pharmacies
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

-- 3.2 Medicines Catalog
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

-- 3.3 Pharmacy Inventory
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

-- 3.4 Pharmacy Orders
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

-- ============================================================
-- PART 3B: DIAGNOSTIC CENTER TABLES
-- ============================================================

-- 3B.1 Diagnostic Centers (facility registration + approval)
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

-- 3B.2 Diagnostic Tests (catalog of tests offered by each center)
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

-- 3B.3 Diagnostic Bookings (patient → center + test)
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
-- PART 4: AMBULANCE & EMERGENCY TABLES
-- ============================================================

-- 4.1 Ambulance Operators (fleet owners)
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

-- 4.2 Ambulances (individual vehicles)
-- NOTE: Service code uses .from('ambulances') for fleet queries
-- and 'vehicle:ambulance_vehicles(...)' in joins. We create the
-- primary table as 'ambulances' and add a VIEW alias.
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

-- VIEW alias: some services join as 'ambulance_vehicles'
CREATE OR REPLACE VIEW ambulance_vehicles AS SELECT * FROM ambulances;

-- 4.3 Ambulance Location Pings (high-frequency fallback when MongoDB unavailable)
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

-- 4.4 Emergency Requests
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

-- VIEW alias: patient & ambulance routes query 'ambulance_requests'
CREATE OR REPLACE VIEW ambulance_requests AS SELECT * FROM emergency_requests;

-- ============================================================
-- PART 5: APPOINTMENT & CONSULTATION TABLES
-- ============================================================

-- 5.1 Appointments
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

-- 5.2 Consultations (video call sessions)
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

-- 5.3 Patient Vitals (moved here so consultations FK resolves)
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

-- 5.4 Prescriptions
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

-- 5.5 Prescription Medicines (individual items)
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

-- 5.6 Payments
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

-- ============================================================
-- PART 6: MEDICAL RECORDS & REPORTS
-- ============================================================

-- 6.1 Medical Reports
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

-- ============================================================
-- PART 7: REVIEWS, NOTIFICATIONS, CHAT
-- ============================================================

-- 7.1 Reviews & Ratings (polymorphic)
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

-- 7.2 Notifications
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

-- 7.3 Chat Messages (consultation context)
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

-- ============================================================
-- PART 8: AUTH & SYSTEM TABLES
-- ============================================================

-- 8.1 Refresh Tokens
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

-- 8.2 OTP Verifications
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

-- 8.3 Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.4 Audit Logs
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

-- 8.5 Admin Notes
CREATE TABLE IF NOT EXISTS admin_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    note TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.6 System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PART 9: ADD MISSING COLUMNS (safe for existing databases)
-- ============================================================
-- These ALTER statements ensure existing databases get new columns
-- without breaking. Only adds if column doesn't exist.

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

-- Expand emergency_requests status CHECK to include simplified aliases used by mobile apps
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
-- PART 10: PERFORMANCE INDEXES
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Patients
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_city ON patients(city);

-- Doctors
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_approval_status ON doctors(approval_status);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_is_available ON doctors(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctors_is_approved ON doctors(is_approved);

-- Hospitals (including spatial)
CREATE INDEX IF NOT EXISTS idx_hospitals_owner_id ON hospitals(owner_id);
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(type);
CREATE INDEX IF NOT EXISTS idx_hospitals_approval ON hospitals(approval_status);
CREATE INDEX IF NOT EXISTS idx_hospitals_lat_lng ON hospitals(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Clinics (including spatial)
CREATE INDEX IF NOT EXISTS idx_clinics_owner_id ON clinics(owner_id);
CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics(city);
CREATE INDEX IF NOT EXISTS idx_clinics_approval ON clinics(approval_status);
CREATE INDEX IF NOT EXISTS idx_clinics_lat_lng ON clinics(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Pharmacies (including spatial)
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner_id ON pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_city ON pharmacies(city);
CREATE INDEX IF NOT EXISTS idx_pharmacies_approval ON pharmacies(approval_status);
CREATE INDEX IF NOT EXISTS idx_pharmacies_lat_lng ON pharmacies(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Diagnostic Centers (including spatial)
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

-- Ambulances (including spatial)
CREATE INDEX IF NOT EXISTS idx_ambulances_operator ON ambulances(operator_id);
CREATE INDEX IF NOT EXISTS idx_ambulances_status ON ambulances(status);
CREATE INDEX IF NOT EXISTS idx_ambulances_lat_lng ON ambulances(current_latitude, current_longitude) WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ambulances_driver ON ambulances(driver_user_id);

-- Ambulance Operators
CREATE INDEX IF NOT EXISTS idx_ambulance_operators_user_id ON ambulance_operators(user_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_operators_approval ON ambulance_operators(approval_status);

-- Appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON appointments(hospital_id);

-- Consultations
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment ON consultations(appointment_id);

-- Prescriptions
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation ON prescriptions(consultation_id);

-- Emergency Requests
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_requests(status);
CREATE INDEX IF NOT EXISTS idx_emergency_priority ON emergency_requests(priority);
CREATE INDEX IF NOT EXISTS idx_emergency_operator ON emergency_requests(operator_id);
CREATE INDEX IF NOT EXISTS idx_emergency_patient ON emergency_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_location ON emergency_requests(pickup_latitude, pickup_longitude);

-- Pharmacy
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy ON pharmacy_inventory(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_medicine ON pharmacy_inventory(medicine_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy ON pharmacy_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status);

-- Medicines
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines(generic_name);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewable ON reviews(reviewable_type, reviewable_id);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Auth
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone);

-- Hospital Associations
CREATE INDEX IF NOT EXISTS idx_hospital_managers_user ON hospital_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_hospital_managers_hospital ON hospital_managers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_hospital ON hospital_doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_doctor ON hospital_doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinic_doctors_clinic ON clinic_doctors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_doctors_doctor ON clinic_doctors(doctor_id);

-- Doctor Slots
CREATE INDEX IF NOT EXISTS idx_doctor_slots_doctor ON doctor_slots(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);

-- Location Pings
CREATE INDEX IF NOT EXISTS idx_location_pings_ambulance ON ambulance_location_pings(ambulance_id);
CREATE INDEX IF NOT EXISTS idx_location_pings_created ON ambulance_location_pings(created_at DESC);

-- Reminders
CREATE INDEX IF NOT EXISTS idx_reminders_patient ON reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_reminders_type ON reminders(type);
CREATE INDEX IF NOT EXISTS idx_reminders_active ON reminders(patient_id, is_active) WHERE is_active = TRUE;

-- Patient Vitals
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_by ON patient_vitals(recorded_by);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_recorded_at ON patient_vitals(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_consultation ON patient_vitals(consultation_id);

-- ============================================================
-- PART 11: ROW LEVEL SECURITY
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
-- PART 12: TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
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

-- Generate unique number functions
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
-- PART 13: VIEWS FOR ADMIN DASHBOARD
-- ============================================================

-- Pending approvals across all provider types
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

-- Active (in-progress) emergencies
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

-- Today's appointments
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

-- Grant view access
DO $$
BEGIN
    GRANT SELECT ON pending_approvals TO authenticated;
    GRANT SELECT ON active_emergencies TO authenticated;
    GRANT SELECT ON todays_appointments TO authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- PRODUCTION SCHEMA COMPLETE
-- ============================================================

SELECT '✅ SWASTIK PRODUCTION SCHEMA v3.1 DEPLOYED!' as status;
SELECT '📋 Next: Create your first admin user (see swastik_testing.sql or use the template below)' as next_step;
SELECT '──────────────────────────────────────────────────' as separator;

-- ============================================================
-- ADMIN CREATION TEMPLATE (uncomment and fill in your values)
-- ============================================================
--
-- Step 1: Generate bcrypt hash:
--   node -e "console.log(require('bcryptjs').hashSync('YourPassword', 12))"
--
-- Step 2: Insert admin user:
-- INSERT INTO users (email, phone, password_hash, role, is_active, is_verified)
-- VALUES ('admin@yourcompany.com', '+91XXXXXXXXXX', '$2a$12$YOUR_HASH', 'admin', true, true);
--
-- INSERT INTO admins (user_id, name, admin_role, is_active)
-- SELECT id, 'Admin Name', 'super_admin', true
-- FROM users WHERE email = 'admin@yourcompany.com';
