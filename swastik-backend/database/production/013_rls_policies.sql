-- ============================================================
-- 013: ROW LEVEL SECURITY POLICIES
-- Enable RLS on all tables + service_role bypass
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
        'reminders', 'patient_vitals', 'chat_sessions', 'report_shares'
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
-- Fine-grained RLS policies (beyond service_role bypass)
-- ============================================================

-- Report shares: patients can see shares they created, doctors can see shares to them
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'report_shares_patient_select') THEN
    CREATE POLICY report_shares_patient_select ON report_shares
      FOR SELECT USING (
        shared_by = auth.uid()
        OR doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'report_shares_patient_insert') THEN
    CREATE POLICY report_shares_patient_insert ON report_shares
      FOR INSERT WITH CHECK (shared_by = auth.uid());
  END IF;
END $$;

-- Chat sessions: users can only access their own sessions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'chat_sessions_user') THEN
    CREATE POLICY chat_sessions_user ON chat_sessions
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;
