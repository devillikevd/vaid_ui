-- ============================================================
-- 094: Diagnostic Center Members (Multi-User RBAC)
-- Introduces diagnostic_manager and lab_technician to the platform
-- following the same pattern as pharmacy_members.
-- ============================================================

-- Step 1: Extend users.role CHECK constraint to allow new roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN (
    'patient', 'doctor', 'doctor_pending', 'hospital_owner', 'hospital_manager',
    'clinic_owner', 'pharmacy_owner', 'pharmacy_manager', 'pharmacy_staff',
    'ambulance_operator', 'ambulance_driver', 'diagnostic_center_owner',
    'diagnostic_manager', 'lab_technician',
    'admin', 'super_admin',
    -- Legacy/wellness roles
    'wellness_coach', 'fitness_center_owner'
));

-- Step 2: Create diagnostic_members join table
-- Maps users to a diagnostic center with an explicit member role and status.
-- diagnostic_center_owner rows are NOT required here — owners are resolved via
-- diagnostic_centers.owner_id directly, keeping backward compatibility.
CREATE TABLE IF NOT EXISTS diagnostic_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    diagnostic_center_id UUID NOT NULL REFERENCES diagnostic_centers(id) ON DELETE CASCADE,
    -- 'manager' or 'lab_technician'
    member_role TEXT NOT NULL CHECK (member_role IN ('manager', 'lab_technician')),
    -- Lifecycle: invited → active → suspended → removed
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
    -- Who created this membership record
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique: a user can only be a member of a given diagnostic center once
CREATE UNIQUE INDEX IF NOT EXISTS uniq_diagnostic_member
ON diagnostic_members(user_id, diagnostic_center_id);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_diagnostic_members_center_id
ON diagnostic_members(diagnostic_center_id, status);

CREATE INDEX IF NOT EXISTS idx_diagnostic_members_user_id
ON diagnostic_members(user_id, status);

-- Step 3: Auto-update updated_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_diagnostic_members_updated_at
    BEFORE UPDATE ON diagnostic_members
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 4: RLS policies
ALTER TABLE diagnostic_members ENABLE ROW LEVEL SECURITY;

-- Only authenticated service role (backend) has full access.
-- These policies are for any direct Supabase client access.

-- Diagnostic owners can read their center's members
CREATE POLICY "diagnostic_owner_can_read_members"
ON diagnostic_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM diagnostic_centers
        WHERE diagnostic_centers.id = diagnostic_members.diagnostic_center_id
          AND diagnostic_centers.owner_id = auth.uid()
    )
);

-- Members can read their own membership record
CREATE POLICY "diagnostic_member_can_read_own"
ON diagnostic_members
FOR SELECT
USING (user_id = auth.uid());

-- Only owners can insert/update/delete member records (via backend)
CREATE POLICY "diagnostic_owner_can_manage_members"
ON diagnostic_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM diagnostic_centers
        WHERE diagnostic_centers.id = diagnostic_members.diagnostic_center_id
          AND diagnostic_centers.owner_id = auth.uid()
    )
);
