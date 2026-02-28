-- ============================================================================
-- Swastik Backend Audit Migration
-- Fixes: C5 (missing tables), C6 (UNIQUE constraints), I9 (CHECK constraints),
--        I10 (performance indexes), M12 (secure number generators)
-- ============================================================================
-- Run with:  psql -f 001_backend_audit_fixes.sql  OR via Supabase SQL editor

BEGIN;

-- ============================================================================
-- C5: Missing tables
-- ============================================================================

-- report_shares: Track which doctors have access to patient reports
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (report_id, doctor_id)
);

-- chat_sessions: Track chatbot conversation sessions (referenced by patientService)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_key TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- refresh_tokens: Persist refresh tokens for C1 (blacklist/revocation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- C6: Missing UNIQUE constraints on user_id for single-profile tables
-- ============================================================================

-- Ensure each user can only have ONE patient profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'patients_user_id_unique'
  ) THEN
    ALTER TABLE patients ADD CONSTRAINT patients_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Ensure each user can only have ONE admin profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'admins_user_id_unique'
  ) THEN
    ALTER TABLE admins ADD CONSTRAINT admins_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================================
-- I9: Missing CHECK & UNIQUE constraints
-- ============================================================================

-- Prevent double-booking: same doctor, same date, same time slot, same active status
-- (C3 partial fix — service code already checks, this is DB safety net)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'appointments_no_double_booking'
  ) THEN
    CREATE UNIQUE INDEX appointments_no_double_booking
      ON appointments (doctor_id, appointment_date, time_slot)
      WHERE status IN ('scheduled', 'confirmed');
  END IF;
END $$;

-- Rating must be 1-5
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'reviews_rating_range'
  ) THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

-- Hospital beds must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'hospitals_beds_non_negative'
  ) THEN
    ALTER TABLE hospitals ADD CONSTRAINT hospitals_beds_non_negative
      CHECK (total_beds >= 0 AND available_beds >= 0);
  END IF;
END $$;

-- Pharmacy inventory quantity must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'pharmacy_inventory_qty_non_negative'
  ) THEN
    ALTER TABLE pharmacy_inventory ADD CONSTRAINT pharmacy_inventory_qty_non_negative
      CHECK (quantity >= 0);
  END IF;
END $$;

-- Ensure medicine price is positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'medicines_price_positive'
  ) THEN
    ALTER TABLE medicines ADD CONSTRAINT medicines_price_positive CHECK (price >= 0);
  END IF;
END $$;

-- ============================================================================
-- I10: Missing performance indexes
-- ============================================================================

-- Appointments: frequent queries by patient_id + status + date
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status
  ON appointments (patient_id, status, appointment_date);

-- Appointments: frequent queries by doctor_id + date
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
  ON appointments (doctor_id, appointment_date);

-- Consultations: lookup by appointment_id
CREATE INDEX IF NOT EXISTS idx_consultations_appointment_id
  ON consultations (appointment_id);

-- Consultations: stale consultation cleanup (I19 cron)
CREATE INDEX IF NOT EXISTS idx_consultations_status_started
  ON consultations (status, started_at)
  WHERE status = 'in_progress';

-- Reports: patient_id + date for report list queries
CREATE INDEX IF NOT EXISTS idx_reports_patient_date
  ON reports (patient_id, date DESC);

-- Prescriptions: patient_id + created_at
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_created
  ON prescriptions (patient_id, created_at DESC);

-- Pharmacy orders: pharmacy_id + status for dashboard queries
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy_status
  ON pharmacy_orders (pharmacy_id, status);

-- Emergency requests: status for active request queries
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status
  ON emergency_requests (status);

-- Doctors: user_id for frequent profile lookups
CREATE INDEX IF NOT EXISTS idx_doctors_user_id
  ON doctors (user_id);

-- Patients: user_id for frequent profile lookups
CREATE INDEX IF NOT EXISTS idx_patients_user_id
  ON patients (user_id);

-- Refresh tokens: lookup by hashed token + not revoked
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON refresh_tokens (token)
  WHERE is_revoked = false;

-- Refresh tokens: cleanup old tokens by user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id, is_revoked);

-- Report shares: lookup by report_id
CREATE INDEX IF NOT EXISTS idx_report_shares_report
  ON report_shares (report_id);

-- Chat sessions: lookup by user_id
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON chat_sessions (user_id, created_at DESC);

-- Diagnostic bookings: patient lookup
CREATE INDEX IF NOT EXISTS idx_diagnostic_bookings_patient
  ON diagnostic_bookings (patient_id, booking_date DESC);

-- Pharmacy inventory: pharmacy + medicine for stock queries
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_pharmacy
  ON pharmacy_inventory (pharmacy_id, medicine_id);

-- Reviews: hospital_id for rating aggregation
CREATE INDEX IF NOT EXISTS idx_reviews_hospital
  ON reviews (hospital_id);

-- ============================================================================
-- M12: Replace random() with gen_random_uuid() for number generators
-- (Applies to any DB functions that used random() for IDs/numbers)
-- ============================================================================

-- Ensure the order_number generation uses a secure function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'ORD-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Ensure appointment number generation uses a secure function
CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'APT-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================

ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for report_shares
CREATE POLICY report_shares_patient_select ON report_shares
  FOR SELECT USING (
    shared_by = auth.uid()
    OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

CREATE POLICY report_shares_patient_insert ON report_shares
  FOR INSERT WITH CHECK (shared_by = auth.uid());

-- RLS policies for chat_sessions (user can only see their own)
CREATE POLICY chat_sessions_user ON chat_sessions
  FOR ALL USING (user_id = auth.uid());

-- RLS policies for refresh_tokens (service_role only — no direct user access)
-- No user-facing policies; managed exclusively via service_role key

COMMIT;
