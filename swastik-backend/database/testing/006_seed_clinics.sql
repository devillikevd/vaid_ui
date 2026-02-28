-- ============================================================
-- 006: SEED CLINICS
-- Clinic profiles, clinic-doctor associations
-- ============================================================

INSERT INTO clinics (id, owner_id, name, registration_number, address, city, state, pincode, latitude, longitude, phone, email, specializations, facilities, is_24_hours, is_active, is_approved, approval_status, approved_at, rating, total_reviews)
VALUES
    ('e1000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
     'HealthCare Family Clinic', 'CLN-KA-HC-001',
     '34, 100 Feet Road, Indiranagar', 'Bangalore', 'Karnataka', '560038',
     12.9719, 77.6412, '+918041234567', 'info@healthcareclinic.in',
     ARRAY['General Medicine', 'Pediatrics', 'ENT'],
     ARRAY['Lab', 'Pharmacy', 'ECG', 'X-Ray'],
     false, true, true, 'approved', NOW(), 4.2, 85),
    ('e1000000-0000-0000-0000-000000000002', NULL,
     'CityMed 24/7 Clinic', 'CLN-KA-CM-002',
     '56, BTM Layout 2nd Stage', 'Bangalore', 'Karnataka', '560076',
     12.9165, 77.6101, '+918042345678', 'info@citymed.in',
     ARRAY['General Medicine', 'Gynecology'],
     ARRAY['Lab', 'Ultrasound'],
     true, true, true, 'approved', NOW(), 4.0, 42)
ON CONFLICT DO NOTHING;

-- Clinic-Doctor association
INSERT INTO clinic_doctors (clinic_id, doctor_id, consultation_fee, is_active)
VALUES ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 400.00, true)
ON CONFLICT DO NOTHING;
