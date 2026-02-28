-- ============================================================
-- 014: TRIGGERS & FUNCTIONS
-- updated_at auto-trigger, number generators, auto-assign triggers
-- ============================================================

-- ============================================
-- Auto-update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to ALL tables that have the column
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT c.table_name FROM information_schema.columns c
        JOIN information_schema.tables t ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        WHERE c.column_name = 'updated_at' AND c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', tbl, tbl);
            EXECUTE format('
                CREATE TRIGGER update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
            ', tbl, tbl);
        EXCEPTION WHEN undefined_table THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================
-- Unique number generators (collision-resistant using gen_random_uuid)
-- ============================================

CREATE OR REPLACE FUNCTION generate_order_number(prefix TEXT DEFAULT 'ORD')
RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'APT-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'RX-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_emergency_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'SOS-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_diagnostic_booking_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'DCB-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Auto-assign triggers for all *_number columns
-- ============================================

-- Appointment number
CREATE OR REPLACE FUNCTION auto_assign_appointment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.appointment_number IS NULL THEN
        NEW.appointment_number := generate_appointment_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointment_number ON appointments;
CREATE TRIGGER trg_appointment_number
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_appointment_number();

-- Prescription number
CREATE OR REPLACE FUNCTION auto_assign_prescription_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prescription_number IS NULL THEN
        NEW.prescription_number := generate_prescription_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prescription_number ON prescriptions;
CREATE TRIGGER trg_prescription_number
    BEFORE INSERT ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_prescription_number();

-- Emergency request number
CREATE OR REPLACE FUNCTION auto_assign_emergency_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := generate_emergency_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_emergency_number ON emergency_requests;
CREATE TRIGGER trg_emergency_number
    BEFORE INSERT ON emergency_requests
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_emergency_number();

-- Pharmacy order number
CREATE OR REPLACE FUNCTION auto_assign_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_number ON pharmacy_orders;
CREATE TRIGGER trg_order_number
    BEFORE INSERT ON pharmacy_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_order_number();

-- Diagnostic booking number
CREATE OR REPLACE FUNCTION auto_assign_diagnostic_booking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_number IS NULL THEN
        NEW.booking_number := generate_diagnostic_booking_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_diagnostic_booking_number ON diagnostic_bookings;
CREATE TRIGGER trg_diagnostic_booking_number
    BEFORE INSERT ON diagnostic_bookings
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_diagnostic_booking_number();
