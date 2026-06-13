-- 034: Add pack_size and unit_type to pharmacy_inventory

ALTER TABLE pharmacy_inventory
ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50) DEFAULT 'unit';
