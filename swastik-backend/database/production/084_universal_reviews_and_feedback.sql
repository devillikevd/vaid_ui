-- ============================================================
-- 084: UNIVERSAL REVIEWS & PLATFORM FEEDBACK ENHANCEMENTS
-- Note: Reference migration for repository documentation (do not run automatically in production)
-- ============================================================

-- 1. Ensure indexes on reviews for entity & source lookups
CREATE INDEX IF NOT EXISTS idx_reviews_reviewable ON reviews(reviewable_type, reviewable_id, is_visible);
CREATE INDEX IF NOT EXISTS idx_reviews_patient ON reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- 2. Helpful comments explaining polymorphic target and source architecture
COMMENT ON TABLE reviews IS 'Polymorphic patient reviews for doctors, clinics, hospitals, pharmacies, and diagnostic centers with server-verified transaction eligibility.';
COMMENT ON COLUMN reviews.is_verified IS 'Server-derived flag indicating verified completed healthcare or service transaction.';
COMMENT ON COLUMN reviews.response IS 'Provider response to patient review.';
COMMENT ON COLUMN reviews.admin_response IS 'Admin moderation notes or JSON metadata for reported reviews.';
