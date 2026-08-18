-- ============================================================
-- 075: DOCTOR LEAVES MANAGEMENT
-- Adds global and organization-specific leave management with
-- full-day and partial-day time interval support and soft cancellation.
-- ============================================================

CREATE TABLE IF NOT EXISTS doctor_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'organization')),
    organization_type TEXT CHECK (organization_type IN ('clinic', 'hospital')),
    organization_id UUID,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL DEFAULT 'full_day' CHECK (leave_type IN ('full_day', 'partial_day')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_date >= start_date),
    CHECK (leave_type = 'full_day' OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)),
    CHECK (scope = 'global' OR (organization_type IS NOT NULL AND organization_id IS NOT NULL))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_leaves_doctor_active_dates 
    ON doctor_leaves(doctor_id, start_date, end_date) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_doctor_leaves_org 
    ON doctor_leaves(organization_type, organization_id) 
    WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE doctor_leaves ENABLE ROW LEVEL SECURITY;

-- 1. Doctors can view and manage their own leaves
CREATE POLICY "Doctors can view own leaves"
    ON doctor_leaves FOR SELECT
    USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Doctors can manage own leaves"
    ON doctor_leaves FOR ALL
    USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- 2. Clinic Owners/Managers can view leaves specific to their clinic
CREATE POLICY "Clinic owners can view clinic-specific leaves"
    ON doctor_leaves FOR SELECT
    USING (
        organization_type = 'clinic' AND
        clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
    );

-- 3. Hospital Owners/Managers can view leaves specific to their hospital
CREATE POLICY "Hospital owners can view hospital-specific leaves"
    ON doctor_leaves FOR SELECT
    USING (
        organization_type = 'hospital' AND (
            hospital_id IN (SELECT id FROM hospitals WHERE owner_id = auth.uid()) OR
            hospital_id IN (SELECT hospital_id FROM hospital_managers WHERE user_id = auth.uid())
        )
    );

-- 4. Admins can view all leaves
CREATE POLICY "Admins can view all leaves"
    ON doctor_leaves FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    );
