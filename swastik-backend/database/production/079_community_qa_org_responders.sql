-- ============================================================
-- 079: COMMUNITY Q&A PHASE 3A
-- Organization Responder Foundation
-- ============================================================

BEGIN;

-- 1. Add polymorphic identity columns
ALTER TABLE community_answers
ADD COLUMN IF NOT EXISTS responder_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS responder_organization_id UUID;

-- 2. Explicitly backfill historical answers
UPDATE community_answers
SET responder_type = 'doctor'
WHERE doctor_id IS NOT NULL AND responder_type IS NULL;

UPDATE community_answers
SET responder_type = 'patient'
WHERE patient_id IS NOT NULL AND responder_type IS NULL;

-- 3. Replace the author_check constraint with a strict invariant
ALTER TABLE community_answers DROP CONSTRAINT IF EXISTS author_check;

ALTER TABLE community_answers ADD CONSTRAINT author_check CHECK (
    -- Doctor answers
    (responder_type = 'doctor' AND doctor_id IS NOT NULL AND patient_id IS NULL AND responder_organization_id IS NULL) OR 
    
    -- Organization answers
    (responder_type IN ('hospital', 'clinic', 'pharmacy', 'diagnostic_center') AND responder_organization_id IS NOT NULL AND doctor_id IS NULL AND patient_id IS NULL) OR
    
    -- Patient legacy answers
    (responder_type = 'patient' AND patient_id IS NOT NULL AND doctor_id IS NULL AND responder_organization_id IS NULL)
);

-- 4. Create indexes for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_community_answers_responder_org 
ON community_answers(responder_organization_id)
WHERE responder_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_answers_responder_type 
ON community_answers(responder_type);

COMMIT;

