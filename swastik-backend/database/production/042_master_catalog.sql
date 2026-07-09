-- Migration for Master Catalog

-- 1. Create master_diagnostic_tests table
CREATE TABLE IF NOT EXISTS master_diagnostic_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    sample_type TEXT,
    preparation_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name)
);

-- 2. Add master_test_id to diagnostic_tests to link partner inventory with master catalog
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='diagnostic_tests' AND column_name='master_test_id') THEN
    ALTER TABLE diagnostic_tests ADD COLUMN master_test_id UUID REFERENCES master_diagnostic_tests(id);
  END IF;
END $$;
