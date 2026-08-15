-- ============================================================
-- 073: Platform Invites
-- Allows clinics/hospitals to invite unregistered users to join
-- Vaididea as doctors. Linked upon registration.
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_for_role TEXT NOT NULL DEFAULT 'doctor',
    organization_type TEXT CHECK (organization_type IN ('clinic', 'hospital')),
    organization_id UUID,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'expired', 'cancelled')),
    registered_user_id UUID REFERENCES users(id),
    registered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_invites_email ON platform_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_platform_invites_org ON platform_invites(organization_type, organization_id, status);

-- Only one pending invite per email per organization
CREATE UNIQUE INDEX IF NOT EXISTS uniq_platform_invite_pending
ON platform_invites(email, organization_type, organization_id)
WHERE status = 'pending';
