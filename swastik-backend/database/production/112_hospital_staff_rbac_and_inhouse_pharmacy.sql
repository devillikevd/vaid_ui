-- ============================================================
-- 112: HOSPITAL STAFF RBAC, IN-HOUSE PHARMACY & DOCTOR IPD
-- Staff role separation, in-house dispensary, and doctor ward rounds
-- ============================================================

-- ── 1. Enhance hospital_managers with Granular Staff Roles ──
ALTER TABLE hospital_managers 
ADD COLUMN IF NOT EXISTS staff_role TEXT DEFAULT 'hospital_admin',
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'general';

-- Create index on staff_role and department
CREATE INDEX IF NOT EXISTS idx_hospital_managers_role ON hospital_managers(staff_role);
CREATE INDEX IF NOT EXISTS idx_hospital_managers_dept ON hospital_managers(department_id);

-- ── 2. In-House Hospital Pharmacy Inventory ──
CREATE TABLE IF NOT EXISTS hospital_inhouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    generic_name TEXT,
    category TEXT DEFAULT 'Tablet', -- Tablet, Capsule, Syrup, Injection, IV Fluid, Ointment, Medical Supply
    batch_number TEXT,
    expiry_date DATE,
    mrp DECIMAL(10,2) NOT NULL CHECK (mrp >= 0),
    cost_price DECIMAL(10,2) DEFAULT 0 CHECK (cost_price >= 0),
    selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_alert_quantity INT NOT NULL DEFAULT 10,
    unit TEXT DEFAULT 'strips',      -- strips, vials, bottles, pieces, ampoules
    rack_location TEXT,             -- e.g. Shelf A-3, Cold Storage 2
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inhouse_inv_hospital ON hospital_inhouse_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inhouse_inv_med ON hospital_inhouse_inventory(hospital_id, medicine_name);
CREATE INDEX IF NOT EXISTS idx_inhouse_inv_expiry ON hospital_inhouse_inventory(hospital_id, expiry_date);

-- ── 3. Hospital Pharmacy Dispensations (Prescriptions & Ward Indents) ──
CREATE TABLE IF NOT EXISTS hospital_pharmacy_dispensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    prescription_id UUID,
    dispensation_number TEXT NOT NULL, -- e.g. DISP-20260826-0001
    dispense_type TEXT DEFAULT 'opd_prescription', -- opd_prescription, ipd_ward_indent, ot_requisition, direct_sale
    dispensed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'dispensed', -- pending, dispensed, returned, cancelled
    items JSONB NOT NULL DEFAULT '[]', -- [{ inventory_id, medicine_name, batch_number, quantity, unit_price, total_amount, instructions }]
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispensations_hospital ON hospital_pharmacy_dispensations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_patient ON hospital_pharmacy_dispensations(patient_id);
CREATE INDEX IF NOT EXISTS idx_dispensations_admission ON hospital_pharmacy_dispensations(admission_id);

-- ── 4. Doctor In-Patient (IPD) Daily Ward Rounds ──
CREATE TABLE IF NOT EXISTS ipd_doctor_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    admission_id UUID NOT NULL REFERENCES patient_admissions(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    round_date TIMESTAMPTZ DEFAULT NOW(),
    vitals_snapshot JSONB DEFAULT '{}', -- { bp, pulse, spo2, temperature, respiratory_rate, blood_sugar }
    clinical_notes TEXT NOT NULL,       -- Progress note, clinical assessment, patient complaints
    treatment_orders TEXT,              -- Special nursing instructions, IV fluids, oxygen support
    medication_changes JSONB DEFAULT '[]', -- [{ medicine_name, dosage, frequency, action: 'add'|'modify'|'stop' }]
    dietary_instructions TEXT,          -- NPO, Soft Diet, Diabetic Diet, High Protein
    discharge_recommended BOOLEAN DEFAULT FALSE,
    discharge_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipd_rounds_hospital ON ipd_doctor_rounds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ipd_rounds_admission ON ipd_doctor_rounds(admission_id);
CREATE INDEX IF NOT EXISTS idx_ipd_rounds_doctor ON ipd_doctor_rounds(doctor_id);

-- ── 5. Enable RLS ──
ALTER TABLE hospital_inhouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_pharmacy_dispensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipd_doctor_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on hospital_inhouse_inventory" ON hospital_inhouse_inventory FOR ALL USING (true);
CREATE POLICY "Service role full access on hospital_pharmacy_dispensations" ON hospital_pharmacy_dispensations FOR ALL USING (true);
CREATE POLICY "Service role full access on ipd_doctor_rounds" ON ipd_doctor_rounds FOR ALL USING (true);
