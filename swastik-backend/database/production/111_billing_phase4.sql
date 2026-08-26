-- ============================================================
-- 111: BILLING PHASE 4 — Charge Aggregation, Revenue, TPA Claims, Tally
-- Encounter charges, invoices, TPA claims, Tally export log
-- ============================================================

-- ── Encounter Charges (line items) ──
CREATE TABLE IF NOT EXISTS encounter_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),

    -- Service reference
    service_id UUID REFERENCES hospital_services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    service_code TEXT,
    category TEXT,             -- consultation, lab, radiology, pharmacy, ot, nursing, room, misc

    -- Quantity & pricing
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_rate DECIMAL(10,2) NOT NULL CHECK (unit_rate >= 0),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_policy_id UUID REFERENCES hospital_discount_policies(id) ON DELETE SET NULL,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,           -- (quantity * unit_rate) - discount + gst

    -- Source
    source_type TEXT,          -- lab_order, radiology_order, pharmacy, ot_schedule, nursing_task, manual
    source_id UUID,            -- FK to the source table (polymorphic)

    -- Status
    status TEXT DEFAULT 'pending',   -- pending, billed, cancelled, waived
    billed_in_invoice_id UUID,       -- FK set when added to an invoice

    -- Doctor / department
    ordering_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    department_id UUID REFERENCES hospital_departments(id) ON DELETE SET NULL,

    -- Timestamps
    charge_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charges_hospital ON encounter_charges(hospital_id);
CREATE INDEX IF NOT EXISTS idx_charges_encounter ON encounter_charges(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_charges_admission ON encounter_charges(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_charges_patient ON encounter_charges(patient_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON encounter_charges(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_charges_category ON encounter_charges(hospital_id, category);
CREATE INDEX IF NOT EXISTS idx_charges_date ON encounter_charges(hospital_id, charge_date);
CREATE INDEX IF NOT EXISTS idx_charges_invoice ON encounter_charges(billed_in_invoice_id) WHERE billed_in_invoice_id IS NOT NULL;

-- ── Patient Invoices ──
CREATE TABLE IF NOT EXISTS patient_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,

    -- Invoice number (hospital-specific sequence)
    invoice_number TEXT NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Amounts
    gross_amount DECIMAL(12,2) NOT NULL DEFAULT 0,       -- sum of charges before discount
    discount_amount DECIMAL(12,2) DEFAULT 0,
    taxable_amount DECIMAL(12,2) DEFAULT 0,
    cgst_amount DECIMAL(10,2) DEFAULT 0,
    sgst_amount DECIMAL(10,2) DEFAULT 0,
    igst_amount DECIMAL(10,2) DEFAULT 0,
    total_tax DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,          -- final payable
    paid_amount DECIMAL(12,2) DEFAULT 0,
    balance_amount DECIMAL(12,2) DEFAULT 0,

    -- Insurance
    insurance_amount DECIMAL(12,2) DEFAULT 0,            -- covered by insurance
    patient_payable DECIMAL(12,2) DEFAULT 0,             -- net - insurance
    preauth_id UUID REFERENCES insurance_preauth(id) ON DELETE SET NULL,

    -- Status
    status TEXT DEFAULT 'draft',    -- draft, finalized, paid, partially_paid, cancelled, refunded
    payment_mode TEXT,              -- cash, card, upi, neft, mixed
    payment_ref TEXT,

    -- Tally integration
    tally_voucher_number TEXT,
    tally_exported_at TIMESTAMPTZ,
    tally_ledger_name TEXT,

    -- Notes
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON patient_invoices(hospital_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_hospital ON patient_invoices(hospital_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON patient_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_encounter ON patient_invoices(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_admission ON patient_invoices(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON patient_invoices(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON patient_invoices(hospital_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_tally ON patient_invoices(hospital_id, tally_exported_at) WHERE tally_exported_at IS NOT NULL;

-- ── TPA Claims ──
CREATE TABLE IF NOT EXISTS tpa_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES patient_invoices(id) ON DELETE SET NULL,
    preauth_id UUID REFERENCES insurance_preauth(id) ON DELETE SET NULL,

    -- Claim details
    claim_number TEXT,
    insurance_provider TEXT NOT NULL,
    tpa_name TEXT,
    policy_number TEXT NOT NULL,
    member_id TEXT,

    -- Amounts
    claim_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2) DEFAULT 0,
    settled_amount DECIMAL(12,2) DEFAULT 0,
    tds_amount DECIMAL(10,2) DEFAULT 0,
    disallowance_amount DECIMAL(10,2) DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'submitted',   -- submitted, under_review, query, approved, partially_settled, settled, rejected, written_off
    sub_status TEXT,

    -- Clinical
    diagnosis TEXT,
    procedure_name TEXT,
    icd_codes TEXT[] DEFAULT '{}',
    admission_date DATE,
    discharge_date DATE,

    -- Tracking
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    query_raised_at TIMESTAMPTZ,
    query_response TEXT,
    approved_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    utr_number TEXT,            -- settlement UTR/reference

    -- Rejection/disallowance
    rejection_reason TEXT,
    disallowance_reasons JSONB DEFAULT '[]',
    -- [{ item, reason, amount }]

    -- Documents
    documents JSONB DEFAULT '[]',
    -- [{ name, url, type, uploaded_at }]

    -- Communication log
    communication_log JSONB DEFAULT '[]',

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tpa_hospital ON tpa_claims(hospital_id);
CREATE INDEX IF NOT EXISTS idx_tpa_patient ON tpa_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_tpa_admission ON tpa_claims(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tpa_invoice ON tpa_claims(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tpa_status ON tpa_claims(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_tpa_provider ON tpa_claims(hospital_id, insurance_provider);
CREATE INDEX IF NOT EXISTS idx_tpa_claim_number ON tpa_claims(claim_number) WHERE claim_number IS NOT NULL;

-- ── Tally Export Log ──
CREATE TABLE IF NOT EXISTS tally_export_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,

    -- Export metadata
    export_type TEXT NOT NULL,        -- sales, receipt, journal, credit_note
    export_date DATE DEFAULT CURRENT_DATE,
    period_from DATE,
    period_to DATE,

    -- Content
    voucher_count INTEGER DEFAULT 0,
    total_amount DECIMAL(14,2) DEFAULT 0,
    xml_content TEXT,                  -- Tally XML payload
    file_url TEXT,                     -- uploaded export file

    -- Status
    status TEXT DEFAULT 'generated',   -- generated, downloaded, imported, verified, error
    error_message TEXT,

    -- Tracking
    exported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tally_hospital ON tally_export_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_tally_date ON tally_export_log(hospital_id, export_date);
CREATE INDEX IF NOT EXISTS idx_tally_type ON tally_export_log(hospital_id, export_type);

-- ── Revenue Summary (materialized daily) ──
CREATE TABLE IF NOT EXISTS daily_revenue_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,

    -- Counts
    total_invoices INTEGER DEFAULT 0,
    new_patients INTEGER DEFAULT 0,
    total_encounters INTEGER DEFAULT 0,

    -- Revenue
    gross_revenue DECIMAL(14,2) DEFAULT 0,
    discount_given DECIMAL(14,2) DEFAULT 0,
    net_revenue DECIMAL(14,2) DEFAULT 0,
    tax_collected DECIMAL(12,2) DEFAULT 0,

    -- Collections
    cash_collected DECIMAL(14,2) DEFAULT 0,
    card_collected DECIMAL(14,2) DEFAULT 0,
    upi_collected DECIMAL(14,2) DEFAULT 0,
    neft_collected DECIMAL(14,2) DEFAULT 0,
    other_collected DECIMAL(14,2) DEFAULT 0,
    total_collected DECIMAL(14,2) DEFAULT 0,

    -- Insurance
    insurance_billed DECIMAL(14,2) DEFAULT 0,
    insurance_received DECIMAL(14,2) DEFAULT 0,
    insurance_outstanding DECIMAL(14,2) DEFAULT 0,

    -- Outstanding
    total_outstanding DECIMAL(14,2) DEFAULT 0,
    deposits_received DECIMAL(14,2) DEFAULT 0,

    -- Category-wise revenue (JSONB for flexibility)
    category_revenue JSONB DEFAULT '{}',
    -- { "consultation": 50000, "lab": 30000, "radiology": 20000, ... }
    department_revenue JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(hospital_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_revenue_hospital ON daily_revenue_summary(hospital_id);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_date ON daily_revenue_summary(hospital_id, summary_date);
