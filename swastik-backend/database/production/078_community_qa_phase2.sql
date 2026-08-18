BEGIN;

-- 078: COMMUNITY Q&A PHASE 2 (MODERATION & REPORTING)

-- 1. Add status column to questions and answers for moderation visibility
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden'));
ALTER TABLE community_answers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'hidden'));

-- 2. Create community_reports table
CREATE TABLE IF NOT EXISTS community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('question', 'answer')),
    target_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(reporter_user_id, target_type, target_id, reason)
);

-- 3. Indexes for fast report queries
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status);
CREATE INDEX IF NOT EXISTS idx_community_reports_target ON community_reports(target_type, target_id);

-- 4. Enable RLS on community_reports
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports" 
    ON community_reports FOR INSERT 
    WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view their own reports" 
    ON community_reports FOR SELECT 
    USING (auth.uid() = reporter_user_id);

-- 5. Update community_questions_with_stats view
-- MUST match the EXACT column order established by migration 077.
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
    COALESCE((SELECT COUNT(id)::int FROM community_answers WHERE question_id = q.id AND status = 'active'), 0) as answer_count,
    COALESCE(EXISTS (
        SELECT 1 FROM community_answers 
        WHERE question_id = q.id 
        AND is_doctor_verified = true
        AND status = 'active'
    ), false) as has_verified_answer,
    q.category,
    q.specialty_target,
    q.fts,
    q.status
FROM community_questions q;

GRANT SELECT ON community_questions_with_stats TO anon, authenticated, service_role;

COMMIT;
