-- Community Q&A v4: stats view for DB-level filtering
--
-- The Answered / Unanswered / Verified filters in getQuestions rely on joined
-- answer data. Filtering after the DB page was fetched drops rows from the page
-- and breaks pagination (the client stops early because a page comes back short).
-- This view exposes answer_count and has_verified_answer so those filters can be
-- applied in SQL, keeping offsets and totals correct.

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
    COALESCE(va.has_verified_answer, false)::boolean AS has_verified_answer
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

-- Expose the view to the API roles (service_role bypasses RLS but still needs privileges)
GRANT SELECT ON community_questions_with_stats TO anon, authenticated, service_role;
