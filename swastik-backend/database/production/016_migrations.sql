-- ============================================================
-- 016: MIGRATIONS (safe column additions for existing databases)
-- These ALTER statements ensure existing databases get new columns
-- without breaking. Only adds if column doesn't already exist.
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
