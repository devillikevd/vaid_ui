-- ============================================================
-- 089: Pharmacy Members (Manager + Staff Roles)
-- Introduces pharmacy_manager and pharmacy_staff to the platform
-- following the same pattern as hospital_managers.
-- ============================================================

-- Step 1: Extend users.role CHECK constraint to allow new roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN (
    'patient', 'doctor', 'doctor_pending', 'hospital_owner', 'hospital_manager',
    'clinic_owner', 'pharmacy_owner', 'pharmacy_manager', 'pharmacy_staff',
    'ambulance_operator', 'ambulance_driver', 'diagnostic_center_owner',
    'admin', 'super_admin',
    -- Legacy/wellness roles
    'wellness_coach', 'fitness_center_owner'
));

-- Step 2: Create pharmacy_members join table
-- Maps users to a pharmacy with an explicit member role and status.
-- pharmacy_owner rows are NOT required here — owners are resolved via
-- pharmacies.owner_id directly, keeping backward compatibility.
CREATE TABLE IF NOT EXISTS pharmacy_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    -- 'manager' or 'staff' — pharmacy_owner is resolved via pharmacies.owner_id
    member_role TEXT NOT NULL CHECK (member_role IN ('manager', 'staff')),
    -- Lifecycle: invited → active → suspended/removed
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
    -- Who created this membership record
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique: a user can only be a member of a given pharmacy once
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pharmacy_member
ON pharmacy_members(user_id, pharmacy_id);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_pharmacy_members_pharmacy_id
ON pharmacy_members(pharmacy_id, status);

CREATE INDEX IF NOT EXISTS idx_pharmacy_members_user_id
ON pharmacy_members(user_id, status);

-- Step 3: Auto-update updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_pharmacy_members_updated_at
    BEFORE UPDATE ON pharmacy_members
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: RLS policies
ALTER TABLE pharmacy_members ENABLE ROW LEVEL SECURITY;

-- Only authenticated service role (backend) has full access.
-- The backend uses supabaseAdmin (service_role key) so RLS does not restrict it.
-- These policies are for any direct Supabase client access.

-- Pharmacy owners can read their pharmacy's members
CREATE POLICY "pharmacy_owner_can_read_members"
ON pharmacy_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM pharmacies
        WHERE pharmacies.id = pharmacy_members.pharmacy_id
          AND pharmacies.owner_id = auth.uid()
    )
);

-- Members can read their own membership record
CREATE POLICY "member_can_read_own"
ON pharmacy_members
FOR SELECT
USING (user_id = auth.uid());

-- Only owners can insert/update/delete member records (via backend)
CREATE POLICY "pharmacy_owner_can_manage_members"
ON pharmacy_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM pharmacies
        WHERE pharmacies.id = pharmacy_members.pharmacy_id
          AND pharmacies.owner_id = auth.uid()
    )
);
