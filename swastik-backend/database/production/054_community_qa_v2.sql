-- Add topic and views to community_questions
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS topic VARCHAR(255);
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Create community_bookmarks table
CREATE TABLE IF NOT EXISTS community_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES community_questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

-- Index for bookmarks
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_user ON community_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_community_bookmarks_question ON community_bookmarks(question_id);

-- Add RPC function to increment views
CREATE OR REPLACE FUNCTION increment_question_views(q_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE community_questions
    SET views = COALESCE(views, 0) + 1
    WHERE id = q_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
