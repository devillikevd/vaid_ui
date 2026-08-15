-- ============================================================
-- 071: Doctor Join Requests
-- Allows doctors to request affiliation with clinics/hospitals
-- (reverse direction of the existing invite flow)
-- ============================================================

-- 1. Doctor → Clinic join requests
CREATE TABLE IF NOT EXISTS doctor_clinic_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    specialization TEXT,
    department TEXT,
    practice_type TEXT CHECK (practice_type IN ('full_time', 'part_time', 'visiting', 'contract')),
    consultation_modes TEXT[] DEFAULT '{}',
    preferred_days TEXT[] DEFAULT '{}',
    preferred_start_time TIME,
    preferred_end_time TIME,
    preferred_start_date DATE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'changes_requested')),
    response_message TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_clinic_jr_doctor ON doctor_clinic_join_requests(doctor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_clinic_jr_clinic ON doctor_clinic_join_requests(clinic_id, status, created_at DESC);

-- Only one pending request per doctor-clinic pair
CREATE UNIQUE INDEX IF NOT EXISTS uniq_doctor_clinic_pending_jr
ON doctor_clinic_join_requests(doctor_id, clinic_id)
WHERE status = 'pending';

-- 2. Doctor → Hospital join requests
CREATE TABLE IF NOT EXISTS doctor_hospital_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    specialization TEXT,
    department TEXT,
    practice_type TEXT CHECK (practice_type IN ('full_time', 'part_time', 'visiting', 'contract')),
    consultation_modes TEXT[] DEFAULT '{}',
    preferred_days TEXT[] DEFAULT '{}',
    preferred_start_time TIME,
    preferred_end_time TIME,
    preferred_start_date DATE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'changes_requested')),
    response_message TEXT,
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_hospital_jr_doctor ON doctor_hospital_join_requests(doctor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doctor_hospital_jr_hospital ON doctor_hospital_join_requests(hospital_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_doctor_hospital_pending_jr
ON doctor_hospital_join_requests(doctor_id, hospital_id)
WHERE status = 'pending';

-- 3. Auto-update triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE TRIGGER trg_doctor_clinic_jr_updated_at
    BEFORE UPDATE ON doctor_clinic_join_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_doctor_hospital_jr_updated_at
    BEFORE UPDATE ON doctor_hospital_join_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
