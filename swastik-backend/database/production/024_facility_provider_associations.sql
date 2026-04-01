-- ============================================================
-- 024: Facility Provider Associations
-- Hospital/Clinic -> Pharmacy/Diagnostic invite + association flow
-- ============================================================

CREATE TABLE IF NOT EXISTS facility_provider_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_type TEXT NOT NULL CHECK (facility_type IN ('hospital', 'clinic')),
    facility_id UUID NOT NULL,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('pharmacy', 'diagnostic_center')),
    provider_id UUID NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facility_provider_invites_provider_status
ON facility_provider_invites(provider_type, provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_facility_provider_invites_facility_status
ON facility_provider_invites(facility_type, facility_id, provider_type, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_facility_provider_pending_invite
ON facility_provider_invites(facility_type, facility_id, provider_type, provider_id)
WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS facility_provider_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_type TEXT NOT NULL CHECK (facility_type IN ('hospital', 'clinic')),
    facility_id UUID NOT NULL,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('pharmacy', 'diagnostic_center')),
    provider_id UUID NOT NULL,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_facility_provider_association UNIQUE (facility_type, facility_id, provider_type, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_provider_assoc_facility
ON facility_provider_associations(facility_type, facility_id, provider_type, is_active, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_facility_provider_assoc_provider
ON facility_provider_associations(provider_type, provider_id, facility_type, is_active, accepted_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) THEN
    CREATE TRIGGER trg_facility_provider_invites_updated_at
    BEFORE UPDATE ON facility_provider_invites
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_facility_provider_associations_updated_at
    BEFORE UPDATE ON facility_provider_associations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
