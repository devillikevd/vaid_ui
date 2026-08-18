BEGIN;

-- Community Q&A Routing Foundation - Phase 1
-- Adds category and specialty_target taxonomy without breaking legacy `topic`
-- Implements Full-Text Search (FTS) vector column and triggers

-- 1. Add Taxonomy Columns
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS specialty_target VARCHAR(100);

-- 2. Add Taxonomy Indexes
CREATE INDEX IF NOT EXISTS idx_community_questions_category ON community_questions(category);
CREATE INDEX IF NOT EXISTS idx_community_questions_specialty ON community_questions(specialty_target);

-- 3. Add TSVector Column for FTS
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS fts tsvector;

-- 4. Create trigger function to auto-update FTS column
CREATE OR REPLACE FUNCTION update_community_questions_fts() RETURNS trigger AS $$
BEGIN
    NEW.fts :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.specialty_target, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.topic, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger
DROP TRIGGER IF EXISTS trg_community_questions_fts ON community_questions;
CREATE TRIGGER trg_community_questions_fts
    BEFORE INSERT OR UPDATE OF title, content, topic, category, specialty_target
    ON community_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_community_questions_fts();

-- 6. Backfill existing rows (safely triggers the FTS generation)
-- Doing an empty UPDATE will fire the trigger for existing rows
UPDATE community_questions SET id = id;

-- 7. Add GIN Index on the FTS column
CREATE INDEX IF NOT EXISTS idx_community_questions_fts ON community_questions USING GIN (fts);

-- 8. Recreate the View to include category and specialty_target at the VERY END
-- We must preserve the existing answer_count and has_verified_answer stats AND column order
CREATE OR REPLACE VIEW community_questions_with_stats AS
SELECT
    q.id,
    q.patient_id,
    q.title,
    q.content,
    q.topic,
    q.upvotes,
    q.views,
    q.is_anonymous,
    q.attachments,
    q.created_at,
    q.updated_at,
    COALESCE(ac.answer_count, 0)::int AS answer_count,
    COALESCE(va.has_verified_answer, false)::boolean AS has_verified_answer,
    q.category,
    q.specialty_target,
    q.fts
FROM community_questions q
LEFT JOIN (
    SELECT question_id, COUNT(*)::int AS answer_count
    FROM community_answers
    GROUP BY question_id
) ac ON ac.question_id = q.id
LEFT JOIN (
    SELECT question_id, BOOL_OR(is_doctor_verified) AS has_verified_answer
    FROM community_answers
    GROUP BY question_id
) va ON va.question_id = q.id;

-- Ensure privileges are still applied
GRANT SELECT ON community_questions_with_stats TO anon, authenticated, service_role;

COMMIT;
