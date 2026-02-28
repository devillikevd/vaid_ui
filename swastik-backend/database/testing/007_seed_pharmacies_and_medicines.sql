-- ============================================================
-- 007: SEED PHARMACIES & MEDICINES
-- Pharmacies, medicine catalog, inventory
-- ============================================================

-- Pharmacies
INSERT INTO pharmacies (id, owner_id, name, license_number, drug_license_number, gst_number, address, city, state, pincode, latitude, longitude, phone, email, opening_time, closing_time, is_24_hours, is_open, delivery_available, offers_delivery, delivery_radius_km, is_active, is_approved, is_verified, approval_status, approved_at, rating, total_reviews)
VALUES
    ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
     'MedPlus Pharmacy', 'PHR-KA-MP-001', 'DL-KA-20B-12345', 'GST29XXXXX1Z5',
     '12, Brigade Road', 'Bangalore', 'Karnataka', '560001',
     12.9716, 77.6079, '+918043456789', 'medplus@test.com',
     '08:00', '22:00', false, true, true, true, 10,
     true, true, true, 'approved', NOW(), 4.3, 156),
    ('f2000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002',
     'Apollo Pharmacy', 'PHR-KA-AP-002', 'DL-KA-20B-23456', 'GST29XXXXX2Z6',
     '45, Koramangala 5th Block', 'Bangalore', 'Karnataka', '560095',
     12.9344, 77.6149, '+918044567890', 'apollopharmacy@test.com',
     NULL, NULL, true, true, true, true, 15,
     true, true, true, 'approved', NOW(), 4.5, 230)
ON CONFLICT DO NOTHING;

-- Medicines Catalog
INSERT INTO medicines (id, name, generic_name, manufacturer, category, form, dosage_form, strength, pack_size, price, mrp, requires_prescription, side_effects, description)
VALUES
    ('70000000-0000-0000-0000-000000000001', 'Dolo 650', 'Paracetamol', 'Micro Labs Ltd', 'Analgesic', 'Tablet', 'Tablet', '650mg', '15 tablets', 30.00, 35.00, false,
     ARRAY['Nausea', 'Rash'], 'Fever and mild pain reliever'),
    ('70000000-0000-0000-0000-000000000002', 'Azithral 500', 'Azithromycin', 'Alembic Pharma', 'Antibiotic', 'Tablet', 'Tablet', '500mg', '3 tablets', 95.00, 120.00, true,
     ARRAY['Diarrhea', 'Nausea', 'Stomach pain'], 'Broad-spectrum antibiotic'),
    ('70000000-0000-0000-0000-000000000003', 'Pan 40', 'Pantoprazole', 'Alkem Laboratories', 'Antacid', 'Tablet', 'Tablet', '40mg', '15 tablets', 80.00, 95.00, true,
     ARRAY['Headache', 'Dizziness'], 'Proton pump inhibitor for acidity'),
    ('70000000-0000-0000-0000-000000000004', 'Crocin Advance', 'Paracetamol', 'GSK', 'Analgesic', 'Tablet', 'Tablet', '500mg', '20 tablets', 25.00, 30.00, false,
     ARRAY['Nausea'], 'Pain and fever relief'),
    ('70000000-0000-0000-0000-000000000005', 'Allegra 120', 'Fexofenadine', 'Sanofi', 'Antihistamine', 'Tablet', 'Tablet', '120mg', '10 tablets', 120.00, 150.00, true,
     ARRAY['Drowsiness', 'Headache'], 'Non-drowsy antihistamine for allergies'),
    ('70000000-0000-0000-0000-000000000006', 'Metformin 500', 'Metformin HCl', 'USV Limited', 'Antidiabetic', 'Tablet', 'Tablet', '500mg', '20 tablets', 35.00, 40.00, true,
     ARRAY['Nausea', 'Diarrhea', 'Metallic taste'], 'First-line medication for Type 2 diabetes'),
    ('70000000-0000-0000-0000-000000000007', 'Atorvastatin 10', 'Atorvastatin', 'Ranbaxy', 'Statin', 'Tablet', 'Tablet', '10mg', '15 tablets', 90.00, 110.00, true,
     ARRAY['Muscle pain', 'Fatigue'], 'Cholesterol-lowering medication'),
    ('70000000-0000-0000-0000-000000000008', 'Amoxicillin 500', 'Amoxicillin', 'Cipla', 'Antibiotic', 'Capsule', 'Capsule', '500mg', '10 capsules', 65.00, 80.00, true,
     ARRAY['Diarrhea', 'Rash', 'Nausea'], 'Broad-spectrum penicillin antibiotic'),
    ('70000000-0000-0000-0000-000000000009', 'Cetirizine 10', 'Cetirizine', 'Cipla', 'Antihistamine', 'Tablet', 'Tablet', '10mg', '10 tablets', 20.00, 25.00, false,
     ARRAY['Drowsiness', 'Dry mouth'], 'Antihistamine for allergy relief'),
    ('70000000-0000-0000-0000-000000000010', 'ORS Electral', 'Oral Rehydration Salts', 'FDC', 'Rehydration', 'Powder', 'Sachet', '21.8g', '5 sachets', 25.00, 30.00, false,
     ARRAY[]::TEXT[], 'Oral rehydration for dehydration')
ON CONFLICT DO NOTHING;

-- Pharmacy Inventory
INSERT INTO pharmacy_inventory (pharmacy_id, medicine_id, name, generic_name, manufacturer, category, price, mrp, discount_percent, quantity, is_available, requires_prescription)
VALUES
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'Dolo 650', 'Paracetamol', 'Micro Labs', 'Analgesic', 28.00, 35.00, 20, 200, true, false),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'Azithral 500', 'Azithromycin', 'Alembic', 'Antibiotic', 90.00, 120.00, 25, 50, true, true),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', 'Pan 40', 'Pantoprazole', 'Alkem', 'Antacid', 75.00, 95.00, 21, 100, true, true),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000006', 'Metformin 500', 'Metformin HCl', 'USV', 'Antidiabetic', 32.00, 40.00, 20, 150, true, true),
    ('f2000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000009', 'Cetirizine 10', 'Cetirizine', 'Cipla', 'Antihistamine', 18.00, 25.00, 28, 300, true, false),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'Dolo 650', 'Paracetamol', 'Micro Labs', 'Analgesic', 30.00, 35.00, 14, 500, true, false),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000004', 'Crocin Advance', 'Paracetamol', 'GSK', 'Analgesic', 22.00, 30.00, 27, 400, true, false),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000005', 'Allegra 120', 'Fexofenadine', 'Sanofi', 'Antihistamine', 110.00, 150.00, 27, 80, true, true),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000007', 'Atorvastatin 10', 'Atorvastatin', 'Ranbaxy', 'Statin', 85.00, 110.00, 23, 120, true, true),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000008', 'Amoxicillin 500', 'Amoxicillin', 'Cipla', 'Antibiotic', 60.00, 80.00, 25, 90, true, true),
    ('f2000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000010', 'ORS Electral', 'ORS', 'FDC', 'Rehydration', 22.00, 30.00, 27, 200, true, false)
ON CONFLICT DO NOTHING;
