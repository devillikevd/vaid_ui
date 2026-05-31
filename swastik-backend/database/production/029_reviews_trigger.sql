-- ============================================================
-- 029: REVIEWS TRIGGER
-- Auto-update rating and total_reviews columns on entity tables
-- ============================================================

CREATE OR REPLACE FUNCTION update_entity_rating_from_review()
RETURNS TRIGGER AS $$
DECLARE
    v_entity_type TEXT;
    v_entity_id UUID;
    v_avg_rating NUMERIC;
    v_review_count BIGINT;
BEGIN
    -- Determine which row we are working with (NEW for INSERT/UPDATE, OLD for DELETE)
    IF TG_OP = 'DELETE' THEN
        v_entity_type := OLD.reviewable_type;
        v_entity_id := OLD.reviewable_id;
    ELSE
        v_entity_type := NEW.reviewable_type;
        v_entity_id := NEW.reviewable_id;
    END IF;

    -- Calculate the new average and count
    SELECT 
        COALESCE(AVG(rating)::NUMERIC, 0),
        COUNT(*)::BIGINT
    INTO v_avg_rating, v_review_count
    FROM reviews
    WHERE reviewable_type = v_entity_type
      AND reviewable_id = v_entity_id
      AND is_approved = true; -- only count approved reviews

    -- Update the respective entity table
    IF v_entity_type = 'doctor' THEN
        UPDATE doctors
        SET rating = ROUND(v_avg_rating, 2),
            total_reviews = v_review_count
        WHERE id = v_entity_id;
    ELSIF v_entity_type = 'hospital' THEN
        UPDATE hospitals
        SET rating = ROUND(v_avg_rating, 2),
            total_reviews = v_review_count
        WHERE id = v_entity_id;
    ELSIF v_entity_type = 'clinic' THEN
        UPDATE clinics
        SET rating = ROUND(v_avg_rating, 2),
            total_reviews = v_review_count
        WHERE id = v_entity_id;
    ELSIF v_entity_type = 'pharmacy' THEN
        UPDATE pharmacies
        SET rating = ROUND(v_avg_rating, 2),
            total_reviews = v_review_count
        WHERE id = v_entity_id;
    ELSIF v_entity_type = 'diagnostic_center' THEN
        UPDATE diagnostic_centers
        SET rating = ROUND(v_avg_rating, 2),
            total_reviews = v_review_count
        WHERE id = v_entity_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to reviews table
DROP TRIGGER IF EXISTS trg_update_entity_rating ON reviews;
CREATE TRIGGER trg_update_entity_rating
AFTER INSERT OR UPDATE OF rating, is_approved OR DELETE
ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_entity_rating_from_review();
