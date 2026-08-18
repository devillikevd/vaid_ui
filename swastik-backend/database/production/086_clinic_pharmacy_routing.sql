-- Phase C: Clinic -> Pharmacy Routing
-- Add clinic_id to pharmacy_orders for safe, performant routing context

ALTER TABLE pharmacy_orders ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL;

CREATE INDEX idx_pharmacy_orders_clinic_id ON pharmacy_orders(clinic_id);
