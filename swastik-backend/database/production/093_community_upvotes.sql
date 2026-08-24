-- Migration 093: Community Question & Answer Upvotes Tracking
-- Prevents duplicate upvoting from the same user across all platforms

CREATE TABLE IF NOT EXISTS public.community_question_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_community_question_upvotes_user ON public.community_question_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_question_upvotes_question ON public.community_question_upvotes(question_id);

CREATE TABLE IF NOT EXISTS public.community_answer_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    answer_id UUID NOT NULL REFERENCES public.community_answers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, answer_id)
);

CREATE INDEX IF NOT EXISTS idx_community_answer_upvotes_user ON public.community_answer_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_answer_upvotes_answer ON public.community_answer_upvotes(answer_id);

-- Enable RLS
ALTER TABLE public.community_question_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_answer_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view question upvotes" ON public.community_question_upvotes;
CREATE POLICY "Anyone can view question upvotes" ON public.community_question_upvotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own question upvotes" ON public.community_question_upvotes;
CREATE POLICY "Users can insert own question upvotes" ON public.community_question_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own question upvotes" ON public.community_question_upvotes;
CREATE POLICY "Users can delete own question upvotes" ON public.community_question_upvotes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view answer upvotes" ON public.community_answer_upvotes;
CREATE POLICY "Anyone can view answer upvotes" ON public.community_answer_upvotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own answer upvotes" ON public.community_answer_upvotes;
CREATE POLICY "Users can insert own answer upvotes" ON public.community_answer_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own answer upvotes" ON public.community_answer_upvotes;
CREATE POLICY "Users can delete own answer upvotes" ON public.community_answer_upvotes FOR DELETE USING (auth.uid() = user_id);
