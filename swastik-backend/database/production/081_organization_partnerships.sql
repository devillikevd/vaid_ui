-- ============================================================
-- 081: Organization Partnerships (Connected Care Foundation)
-- Symmetric relationship model for Clinic <-> Hospital <-> Pharmacy <-> Diagnostics
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Canonical ordering ensures A < B for uniqueness
    org_a_type TEXT NOT NULL CHECK (org_a_type IN ('clinic', 'hospital', 'pharmacy', 'diagnostic_center')),
    org_a_id UUID NOT NULL,
    
    org_b_type TEXT NOT NULL CHECK (org_b_type IN ('clinic', 'hospital', 'pharmacy', 'diagnostic_center')),
    org_b_id UUID NOT NULL,
    
    -- Track who actually sent the request, distinct from ordering
    initiated_by_type TEXT NOT NULL CHECK (initiated_by_type IN ('clinic', 'hospital', 'pharmacy', 'diagnostic_center')),
    initiated_by_id UUID NOT NULL,
    initiated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'changes_requested', 'active', 'rejected', 'cancelled', 'terminated'
    )),
    
    partnership_type TEXT, -- e.g., 'referral', 'fulfillment', 'diagnostics'
    metadata JSONB DEFAULT '{}'::jsonb, -- Store capabilities, request changes messages, etc.
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    terminated_at TIMESTAMPTZ,
    
    -- Core canonical logic: enforce lexicographical order
    -- If types are the same, order by UUID string representation
    CONSTRAINT chk_canonical_order CHECK (
        org_a_type < org_b_type OR 
        (org_a_type = org_b_type AND org_a_id < org_b_id)
    ),
    
    -- Ensure an org cannot partner with itself
    CONSTRAINT chk_different_orgs CHECK (
        org_a_type != org_b_type OR org_a_id != org_b_id
    )
);

-- Guarantee exactly one logical partnership record exists between two organizations
CREATE UNIQUE INDEX IF NOT EXISTS uniq_organization_partnership
ON organization_partnerships (org_a_type, org_a_id, org_b_type, org_b_id);

CREATE INDEX IF NOT EXISTS idx_org_partnerships_org_a
ON organization_partnerships (org_a_type, org_a_id, status);

CREATE INDEX IF NOT EXISTS idx_org_partnerships_org_b
ON organization_partnerships (org_b_type, org_b_id, status);

-- Update trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_organization_partnerships_updated_at
    BEFORE UPDATE ON organization_partnerships
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
