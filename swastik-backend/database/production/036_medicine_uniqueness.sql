-- ==================== 036: Medicine catalog uniqueness ====================
--
-- The medicines table had no unique constraint on (name, manufacturer), which
-- allowed duplicate / near-duplicate rows to accumulate (e.g.
-- "Paracetamol 500mg Tablet" vs "Paracetamol 500mg", both Cipla).
--
-- The companion script `scripts/dedupe-medicines.js` performs an idempotent
-- consolidation pass that remaps pharmacy_inventory.medicine_id and
-- discount_campaigns.scope_ref to a canonical row and deletes the dupes.
-- This migration adds the constraint that prevents regression; it will FAIL
-- if any duplicate groups remain, which is intentional — re-run the dedupe
-- script first.
--
-- NOTE: matching is case-insensitive and whitespace-insensitive via
-- lower(trim(...)). Rows that differ only in case/spacing are also caught.
-- For semantic duplicates whose `strength` is embedded in the `name` (e.g.
-- "Paracetamol 500mg" w/ strength=NULL) but otherwise identical, the dedupe
-- script's fuzzy report flags them for manual review rather than auto-merging.

-- 036.1 Constraint: one medicine per (lower(name), lower(manufacturer))
-- (case- and whitespace-insensitive). PostgreSQL's ALTER TABLE ... ADD CONSTRAINT
-- UNIQUE (...) only accepts bare column names, so we express the normalized
-- uniqueness with a unique *index* on the lower(trim(...)) expressions instead.
-- CREATE UNIQUE INDEX also supports the partial form (is_active = true) so
-- soft-deleted medicines don't block re-adding the same catalogue entry.
CREATE UNIQUE INDEX IF NOT EXISTS idx_medicines_uniq_name_manufacturer_active
  ON medicines (lower(trim(name)), lower(trim(manufacturer)))
  WHERE is_active = true;

-- 036.2 Performance index for the availability/discovery lookups
-- (inventory join + the inventoryMatchesMedicine name fallback path)
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_medicine_id
  ON pharmacy_inventory (medicine_id)
  WHERE quantity > 0;

-- 036.3 Index for scoped campaign resolution (medicine/brand/category scope_ref)
CREATE INDEX IF NOT EXISTS idx_discount_campaigns_scope
  ON discount_campaigns (scope_type, scope_ref)
  WHERE is_active = true;
