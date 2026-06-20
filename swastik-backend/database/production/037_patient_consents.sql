-- ============================================================
-- 037: Patient Consents for Third-Party PHI Sharing
-- Generic consent tracking for entities like hospitals, pharmacies, research, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS patient_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('hospital', 'pharmacy', 'diagnostic_center', 'doctor', 'research', 'family', 'other')),
    entity_id UUID NOT NULL, -- Logical reference to the entity (no foreign key to avoid circular deps with generic types)
    entity_name TEXT NOT NULL, -- Human-readable name of the entity for the UI
    purpose TEXT NOT NULL, -- Why the consent was granted (e.g., 'Emergency Care', 'Research', 'Prescription Fulfillment')
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_status
ON patient_consents(patient_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_patient_consents_entity
ON patient_consents(entity_type, entity_id, status);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE TRIGGER trg_patient_consents_updated_at
    BEFORE UPDATE ON patient_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
