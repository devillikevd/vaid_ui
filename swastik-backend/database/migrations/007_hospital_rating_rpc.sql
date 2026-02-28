-- Migration: Create atomic hospital rating calculation RPC
-- This eliminates the race condition when multiple reviews are submitted concurrently.
-- The function computes AVG and COUNT in a single atomic SQL operation.

CREATE OR REPLACE FUNCTION calculate_hospital_rating(p_hospital_id UUID)
RETURNS TABLE(avg_rating NUMERIC, review_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(AVG(rating)::NUMERIC, 0) AS avg_rating,
    COUNT(*)::BIGINT AS review_count
  FROM reviews
  WHERE reviewable_type = 'hospital'
    AND reviewable_id = p_hospital_id;
$$;
