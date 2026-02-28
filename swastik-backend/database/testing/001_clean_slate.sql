-- ============================================================
-- 001: CLEAN SLATE — Drop all public tables/views for re-runs
-- ============================================================

DO $$ DECLARE
    r RECORD;
BEGIN
    -- Drop all views first (skip extension-owned ones)
    FOR r IN (
        SELECT c.relname AS viewname
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'v'
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.objid = c.oid AND d.deptype = 'e'
          )
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    -- Drop all tables (skip extension-owned ones)
    FOR r IN (
        SELECT c.relname AS tablename
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.objid = c.oid AND d.deptype = 'e'
          )
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop helper functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number(TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_appointment_number() CASCADE;
DROP FUNCTION IF EXISTS generate_prescription_number() CASCADE;
DROP FUNCTION IF EXISTS generate_emergency_number() CASCADE;
DROP FUNCTION IF EXISTS generate_diagnostic_booking_number() CASCADE;
DROP FUNCTION IF EXISTS auto_assign_appointment_number() CASCADE;
DROP FUNCTION IF EXISTS auto_assign_prescription_number() CASCADE;
DROP FUNCTION IF EXISTS auto_assign_emergency_number() CASCADE;
DROP FUNCTION IF EXISTS auto_assign_order_number() CASCADE;
DROP FUNCTION IF EXISTS auto_assign_diagnostic_booking_number() CASCADE;
