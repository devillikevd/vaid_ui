-- ============================================================
-- 095_normalize_diagnostic_tests.sql
-- Normalize diagnostic test catalog and add price snapshot
-- ============================================================

-- 1. Add price_snapshot to diagnostic_bookings to lock prices at booking time
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='diagnostic_bookings' AND column_name='price_snapshot') THEN
    ALTER TABLE diagnostic_bookings ADD COLUMN price_snapshot DECIMAL(10, 2);
  END IF;
END $$;

-- 2. Prevent a Diagnostic Center from adding the same Master Test multiple times.
-- We use a partial index where master_test_id is NOT NULL, so legacy unmapped records don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_center_master_test 
ON diagnostic_tests (center_id, master_test_id) 
WHERE master_test_id IS NOT NULL;

-- Note: We DO NOT drop the canonical columns (name, category, description, sample_type, preparation_instructions) yet.
-- We DO NOT enforce master_test_id NOT NULL yet, because we have legacy records (like 'diabetes' with ID d649cff1-0e2a-47ff-9ee7-608b30f187c6) that are unmapped but have existing bookings.
