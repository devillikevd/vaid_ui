-- ============================================================
-- 059: SECURITY HARDENING — REAL ROW LEVEL SECURITY (CVE-001)
--
-- The original RLS setup (013_rls_policies.sql) only added a blanket
-- "Service role bypass" policy, which meant Row Level Security existed
-- in name only. This migration:
--
--   1. Drops the blanket service-role bypass policy on every table.
--   2. Grants the `authenticated` role DML on sensitive tables.
--   3. Adds real per-user RLS policies keyed off auth.uid() for the
--      most sensitive tables (users, patients, doctors, refresh_tokens,
--      otp_verifications, consultations, prescriptions).
--   4. Adds DB audit triggers on sensitive tables so anomalous access is
--      logged at the database layer even if app-layer checks fail.
--
-- SAFE-BY-DESIGN: The backend still uses the service-role client by
-- default (service_role inherently bypasses RLS). The policies below only
-- take effect for `authenticated`-role requests, which is exactly what the
-- per-request user-scoped client (USE_PER_REQUEST_SUPABASE=true) uses.
-- Idempotent: safe to re-run.
-- ============================================================

-- ── 1. Drop the blanket service-role bypass policies ─────────────
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
        IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
            EXECUTE format('DROP POLICY IF EXISTS "Service role bypass" ON public.%I', tbl);
            -- Fail closed: with RLS enabled and no policy, the `authenticated`
            -- role can read/write nothing unless a policy below explicitly grants it.
        END IF;
    END LOOP;
END $$;

-- ── 2. Grants for the `authenticated` role ──────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.users,
    public.patients,
    public.doctors,
    public.refresh_tokens,
    public.otp_verifications,
    public.consultations,
    public.prescriptions,
    public.prescription_medicines
TO authenticated;

-- ── 3. Per-user RLS policies keyed on auth.uid() ────────────────

-- users: a user can read/update their own row only.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_self_select" ON public.users;
CREATE POLICY "users_self_select" ON public.users
    FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- patients: a patient can read/update their own patient record.
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patients_self_select" ON public.patients;
CREATE POLICY "patients_self_select" ON public.patients
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "patients_self_update" ON public.patients;
CREATE POLICY "patients_self_update" ON public.patients
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- doctors: a doctor can read/update their own doctor record.
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctors_self_select" ON public.doctors;
CREATE POLICY "doctors_self_select" ON public.doctors
    FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "doctors_self_update" ON public.doctors;
CREATE POLICY "doctors_self_update" ON public.doctors
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- refresh_tokens: only the owning user can touch their tokens.
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "refresh_tokens_self" ON public.refresh_tokens;
CREATE POLICY "refresh_tokens_self" ON public.refresh_tokens
    FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- otp_verifications: the owning user OR the user matching the OTP email.
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otp_verifications_self" ON public.otp_verifications;
CREATE POLICY "otp_verifications_self" ON public.otp_verifications
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid() OR
        email = (SELECT email FROM public.users WHERE id = auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid() OR
        email = (SELECT email FROM public.users WHERE id = auth.uid())
    );

-- consultations: the linked patient OR the linked doctor.
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultations_participants" ON public.consultations;
CREATE POLICY "consultations_participants" ON public.consultations
    FOR SELECT TO authenticated
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

-- prescriptions: the linked patient OR the prescribing doctor.
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_participants" ON public.prescriptions;
CREATE POLICY "prescriptions_participants" ON public.prescriptions
    FOR SELECT TO authenticated
    USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    );

ALTER TABLE public.prescription_medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescription_medicines_participants" ON public.prescription_medicines;
CREATE POLICY "prescription_medicines_participants" ON public.prescription_medicines
    FOR SELECT TO authenticated
    USING (
        prescription_id IN (
            SELECT pm.id FROM public.prescriptions pm
            WHERE pm.patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
               OR pm.doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
        )
    );

-- ── 4. Database audit triggers (defense-in-depth) ───────────────
-- Log DML on sensitive tables at the database layer. This catches anomalous
-- access even if application-layer checks fail again in the future.

CREATE TABLE IF NOT EXISTS public.access_audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    row_id TEXT,
    actor_user TEXT,
    actor_role TEXT,
    actor_ip TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_audit_log_table_time
    ON public.access_audit_log (table_name, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.audit_sensitive_dml()
RETURNS TRIGGER AS $$
DECLARE
    row_id_val TEXT;
    rec_json JSONB;
BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        rec_json := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        rec_json := to_jsonb(OLD);
    ELSE
        rec_json := NULL;
    END IF;

    IF rec_json IS NOT NULL THEN
        row_id_val := COALESCE(rec_json->>'id', rec_json->>'user_id');
    ELSE
        row_id_val := NULL;
    END IF;

    INSERT INTO public.access_audit_log (
        table_name, operation, row_id, actor_user, actor_role, actor_ip
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        row_id_val,
        current_setting('request.jwt.claim.sub', true),
        current_setting('request.jwt.claim.role', true),
        current_setting('request.jwt.claim.ip', true)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    t TEXT;
    sensitive_tables TEXT[] := ARRAY[
        'users', 'patients', 'doctors', 'consultations',
        'prescriptions', 'refresh_tokens', 'otp_verifications'
    ];
BEGIN
    FOREACH t IN ARRAY sensitive_tables
    LOOP
        IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_sensitive ON public.%I', t);
            EXECUTE format(
                'CREATE TRIGGER trg_audit_sensitive AFTER INSERT OR UPDATE OR DELETE ON public.%I
                 FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_dml()',
                t
            );
        END IF;
    END LOOP;
END $$;
