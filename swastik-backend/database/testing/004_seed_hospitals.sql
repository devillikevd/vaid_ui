-- ============================================================
-- 004: SEED HOSPITALS
-- Hospitals, departments, managers (Bangalore locations)
-- ============================================================

INSERT INTO hospitals (id, owner_id, name, address, city, state, pincode, latitude, longitude, phone, email, website, emergency_phone, license_number, type, description, specializations, departments, facilities, accreditations, total_beds, beds_available, icu_beds, icu_beds_available, emergency_beds, is_24_hours, is_emergency_available, ambulance_available, image_url, is_active, is_approved, approval_status, approved_at, rating, total_reviews)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'Apollo Hospitals', 'No. 154/11, Bannerghatta Road, Opp IIM-B', 'Bangalore', 'Karnataka', '560076',
     12.8917, 77.5972, '+918044680000', 'info@apollobangalore.com', 'https://www.apollohospitals.com',
     '+918044680108', 'HOSP-KA-APL-001', 'Multi-Specialty',
     'One of India''s premier healthcare institutions offering comprehensive medical services.',
     ARRAY['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Gastroenterology', 'Nephrology'],
     ARRAY['Emergency', 'Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Radiology', 'Pathology'],
     ARRAY['ICU', 'NICU', 'Operation Theater', 'MRI', 'CT Scan', 'Blood Bank', 'Pharmacy', 'Cafeteria', 'Parking', 'Ambulance'],
     ARRAY['NABH', 'NABL', 'JCI'],
     500, 120, 50, 12, 20, true, true, true, 'https://example.com/apollo.jpg',
     true, true, 'approved', NOW(), 4.5, 1250),

    ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
     'Fortis Hospital', '14, Cunningham Road', 'Bangalore', 'Karnataka', '560052',
     12.9854, 77.5920, '+918066214444', 'info@fortisbangalore.com', 'https://www.fortishealthcare.com',
     '+918066214555', 'HOSP-KA-FRT-002', 'Multi-Specialty',
     'Leading multi-specialty hospital with advanced cardiac care and neurosurgery.',
     ARRAY['Cardiology', 'Neurosurgery', 'Urology', 'Pulmonology', 'Dermatology'],
     ARRAY['Emergency', 'Cardiology', 'Neurosurgery', 'Urology', 'Radiology'],
     ARRAY['ICU', 'Operation Theater', 'CT Scan', 'Blood Bank', 'Pharmacy', 'Parking', 'Ambulance'],
     ARRAY['NABH', 'NABL'],
     250, 60, 30, 8, 15, true, true, true, 'https://example.com/fortis.jpg',
     true, true, 'approved', NOW(), 4.3, 870),

    ('d1000000-0000-0000-0000-000000000003', NULL,
     'Manipal Hospital', '98, HAL Airport Road, Kodihalli', 'Bangalore', 'Karnataka', '560017',
     12.9608, 77.6483, '+918025024444', 'info@manipalhospital.com', 'https://www.manipalhospitals.com',
     '+918025024555', 'HOSP-KA-MNP-003', 'Super-Specialty',
     'Flagship hospital of Manipal Health Enterprises with cutting-edge technology.',
     ARRAY['Cardiology', 'Oncology', 'Organ Transplant', 'Orthopedics', 'Neurology', 'Pediatrics'],
     ARRAY['Emergency', 'Cardiology', 'Oncology', 'Transplant', 'Pediatrics', 'Radiology'],
     ARRAY['ICU', 'NICU', 'PICU', 'Operation Theater', 'MRI', 'CT Scan', 'PET Scan', 'Blood Bank', 'Pharmacy'],
     ARRAY['NABH', 'NABL', 'JCI'],
     600, 150, 60, 15, 25, true, true, true, 'https://example.com/manipal.jpg',
     true, true, 'approved', NOW(), 4.6, 1580),

    -- Pending hospital (for admin approval flow testing)
    ('d1000000-0000-0000-0000-000000000004', NULL,
     'HealthFirst Clinic & Hospital', '22, Jayanagar 4th Block', 'Bangalore', 'Karnataka', '560011',
     12.9257, 77.5838, '+918042001234', 'admin@healthfirst.in', NULL,
     NULL, 'HOSP-KA-HF-004', 'General',
     'New community hospital seeking approval.',
     ARRAY['General Medicine', 'Pediatrics'],
     ARRAY['General', 'Pediatrics'],
     ARRAY['Pharmacy', 'Lab'],
     ARRAY[]::TEXT[],
     50, 50, 5, 5, 5, false, false, false, NULL,
     true, false, 'pending', NULL, 0, 0)
ON CONFLICT DO NOTHING;

-- Hospital Manager
INSERT INTO hospital_managers (user_id, hospital_id, name, role, is_verified, is_active)
VALUES ('d0000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001',
        'Apollo Manager', 'manager', true, true)
ON CONFLICT DO NOTHING;

-- Hospital Departments
INSERT INTO hospital_departments (hospital_id, name, description, floor_number, is_active)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'Cardiology', 'Heart and cardiovascular care', '3', true),
    ('d1000000-0000-0000-0000-000000000001', 'Neurology', 'Brain and nervous system', '4', true),
    ('d1000000-0000-0000-0000-000000000001', 'Emergency', '24/7 emergency services', 'G', true),
    ('d1000000-0000-0000-0000-000000000001', 'Orthopedics', 'Bone and joint care', '2', true),
    ('d1000000-0000-0000-0000-000000000002', 'Cardiology', 'Cardiac care unit', '2', true),
    ('d1000000-0000-0000-0000-000000000002', 'Neurosurgery', 'Brain surgery department', '3', true)
ON CONFLICT DO NOTHING;
