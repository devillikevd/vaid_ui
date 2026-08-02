-- Add is_anonymous and attachments to community_questions
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE community_questions ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
