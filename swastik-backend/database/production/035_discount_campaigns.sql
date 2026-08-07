-- ==================== Discount Campaigns System ====================

CREATE TABLE IF NOT EXISTS discount_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value DECIMAL(10,2) NOT NULL,  -- e.g., 10.00 for 10% or 50.00 for ₹50 off
    scope_type VARCHAR(30) NOT NULL CHECK (scope_type IN ('global', 'category', 'brand', 'medicine')),
    scope_ref VARCHAR(255),  -- category_id, brand_id, or medicine_id (NULL for global)
    min_order_value DECIMAL(10,2) DEFAULT 0,
    max_discount_per_order DECIMAL(10,2),  -- cap on discount amount per order
    max_redemptions_total INT,  -- total uses across all pharmacies
    max_redemptions_per_user INT DEFAULT 1,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_at > start_at),
    CONSTRAINT valid_percentage CHECK (discount_type != 'percentage' OR (discount_value > 0 AND discount_value <= 100))
);

CREATE INDEX idx_discount_campaigns_active ON discount_campaigns (is_active, start_at, end_at);
CREATE INDEX idx_discount_campaigns_scope ON discount_campaigns (scope_type, scope_ref);

-- Pharmacy opt-in to campaigns
CREATE TABLE IF NOT EXISTS campaign_pharmacy_optins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES discount_campaigns(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    opted_in_at TIMESTAMPTZ DEFAULT NOW(),
    opted_out_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    UNIQUE (campaign_id, pharmacy_id)
);

CREATE INDEX idx_campaign_optins_pharmacy ON campaign_pharmacy_optins (pharmacy_id, is_active);
CREATE INDEX idx_campaign_optins_campaign ON campaign_pharmacy_optins (campaign_id, is_active);

-- Track redemptions for limits
CREATE TABLE IF NOT EXISTS campaign_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES discount_campaigns(id) ON DELETE CASCADE,
    pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10,2) NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_redemptions_campaign ON campaign_redemptions (campaign_id);
CREATE INDEX idx_campaign_redemptions_patient ON campaign_redemptions (patient_id, campaign_id);
CREATE INDEX idx_campaign_redemptions_order ON campaign_redemptions (order_id);

-- Updated trigger
CREATE TRIGGER update_discount_campaigns_updated_at
    BEFORE UPDATE ON discount_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
