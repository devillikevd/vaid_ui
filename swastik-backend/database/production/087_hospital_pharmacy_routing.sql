-- Phase D: Hospital -> Pharmacy Routing
-- Add hospital_id to pharmacy_orders for safe, performant routing context

ALTER TABLE pharmacy_orders ADD COLUMN hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

CREATE INDEX idx_pharmacy_orders_hospital_id ON pharmacy_orders(hospital_id);
