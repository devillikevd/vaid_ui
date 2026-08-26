-- ============================================================
-- 109: BILLING FOUNDATION
-- Patient deposits, insurance pre-authorization
-- (No billing UI — foundation for Tally integration later)
-- ============================================================

-- Patient deposits / advance payments
CREATE TABLE IF NOT EXISTS patient_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,

    -- Amount
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT DEFAULT 'cash',      -- cash, card, upi, neft, rtgs, cheque, dd, online
    receipt_number TEXT,
    transaction_ref TEXT,

    -- Type
    type TEXT DEFAULT 'advance',           -- advance, refund, adjustment, settlement
    status TEXT DEFAULT 'collected',       -- collected, refunded, adjusted, cancelled

    -- Cheque/DD details
    instrument_number TEXT,
    instrument_date DATE,
    bank_name TEXT,

    -- Tracking
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    refunded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    refunded_at TIMESTAMPTZ,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_hospital ON patient_deposits(hospital_id);
CREATE INDEX IF NOT EXISTS idx_deposits_patient ON patient_deposits(patient_id);
CREATE INDEX IF NOT EXISTS idx_deposits_encounter ON patient_deposits(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_admission ON patient_deposits(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_status ON patient_deposits(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_deposits_receipt ON patient_deposits(receipt_number) WHERE receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_created ON patient_deposits(hospital_id, created_at);

-- ============================================================
-- Insurance Pre-Authorization (TPA)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_preauth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    encounter_id UUID REFERENCES patient_encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES patient_admissions(id) ON DELETE SET NULL,

    -- Insurance details
    insurance_provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    tpa_name TEXT,
    member_id TEXT,
    group_policy_number TEXT,
    employee_id TEXT,
    company_name TEXT,

    -- Pre-auth
    pre_auth_number TEXT,
    pre_auth_type TEXT DEFAULT 'cashless', -- cashless, reimbursement
    requested_amount DECIMAL(10,2),
    approved_amount DECIMAL(10,2),
    co_pay_percent DECIMAL(5,2) DEFAULT 0,
    deductible_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',         -- pending, query_raised, approved, partially_approved, rejected, expired, cancelled
    sub_status TEXT,                       -- awaiting_documents, under_review, escalated

    -- Clinical
    diagnosis TEXT,
    procedure_name TEXT,
    icd_codes TEXT[] DEFAULT '{}',
    procedure_codes TEXT[] DEFAULT '{}',
    estimated_stay_days INTEGER,
    estimated_cost DECIMAL(10,2),

    -- Dates
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expiry_date DATE,
    admission_date DATE,

    -- Documents
    documents JSONB DEFAULT '[]',
    -- [{ name, url, type, uploaded_at }]
    query_details TEXT,
    rejection_reason TEXT,
    notes TEXT,

    -- TPA communication log
    communication_log JSONB DEFAULT '[]',
    -- [{ date, type: "call/email/portal", summary, by }]

    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_preauth_hospital ON insurance_preauth(hospital_id);
CREATE INDEX IF NOT EXISTS idx_preauth_patient ON insurance_preauth(patient_id);
CREATE INDEX IF NOT EXISTS idx_preauth_encounter ON insurance_preauth(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preauth_admission ON insurance_preauth(admission_id) WHERE admission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preauth_status ON insurance_preauth(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_preauth_provider ON insurance_preauth(hospital_id, insurance_provider);
CREATE INDEX IF NOT EXISTS idx_preauth_number ON insurance_preauth(pre_auth_number) WHERE pre_auth_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preauth_policy ON insurance_preauth(policy_number);

-- ============================================================
-- Hospital discount policies
-- ============================================================
CREATE TABLE IF NOT EXISTS hospital_discount_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percent', -- percent, flat
    discount_value DECIMAL(10,2) NOT NULL,
    max_discount DECIMAL(10,2),
    applies_to TEXT DEFAULT 'all',         -- all, category, service, department
    applies_to_id UUID,                    -- FK to category/service/department
    category TEXT,                         -- service category if applies_to = 'category'
    min_bill_amount DECIMAL(10,2) DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_authority TEXT,               -- manager, owner, cmo
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discount_policies_hospital ON hospital_discount_policies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_discount_policies_active ON hospital_discount_policies(hospital_id, is_active);
