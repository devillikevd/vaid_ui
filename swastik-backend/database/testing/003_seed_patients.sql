-- ============================================================
-- 003: SEED PATIENTS
-- Patient profiles, emergency contacts, family members, admins
-- ============================================================

-- Admins
INSERT INTO admins (user_id, name, admin_role, is_active, permissions)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Swastik Super Admin', 'super_admin', true,
     '{"all": true, "manage_users": true, "manage_hospitals": true, "manage_doctors": true, "manage_pharmacies": true, "manage_ambulances": true, "view_analytics": true}'),
    ('a0000000-0000-0000-0000-000000000002', 'Platform Moderator', 'moderator', true,
     '{"manage_users": true, "manage_hospitals": true, "view_analytics": true}')
ON CONFLICT DO NOTHING;

-- Patients
INSERT INTO patients (id, user_id, name, date_of_birth, gender, blood_group, weight, height, address, city, state, pincode, allergies, medical_conditions, chronic_conditions, abha_number)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
     'Rahul Kumar', '1992-05-15', 'male', 'B+', 72.5, 175.0,
     '45 MG Road, Koramangala', 'Bangalore', 'Karnataka', '560034',
     ARRAY['Penicillin'], ARRAY['Mild Asthma'], ARRAY['Asthma'], 'ABHA-1001-2345-6789'),
    ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
     'Priya Sharma', '1988-11-22', 'female', 'A+', 58.0, 162.0,
     '12 Indiranagar Main Road', 'Bangalore', 'Karnataka', '560038',
     ARRAY['Sulfa drugs', 'Latex'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'ABHA-2002-3456-7890'),
    ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
     'Amit Patel', '1995-03-08', 'male', 'O+', 80.0, 180.0,
     '78 HSR Layout Sector 2', 'Bangalore', 'Karnataka', '560102',
     ARRAY[]::TEXT[], ARRAY['Type 2 Diabetes', 'Hypertension'], ARRAY['Diabetes', 'Hypertension'], 'ABHA-3003-4567-8901')
ON CONFLICT DO NOTHING;

-- Emergency contacts
INSERT INTO emergency_contacts (patient_id, name, phone, relationship, is_primary)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'Sunita Kumar', '+919100100001', 'Mother', true),
    ('b1000000-0000-0000-0000-000000000001', 'Vikas Kumar', '+919100100002', 'Brother', false),
    ('b1000000-0000-0000-0000-000000000002', 'Raj Sharma', '+919100200001', 'Husband', true),
    ('b1000000-0000-0000-0000-000000000003', 'Meera Patel', '+919100300001', 'Wife', true)
ON CONFLICT DO NOTHING;

-- Family members
INSERT INTO family_members (patient_id, name, relationship, date_of_birth, gender, blood_group)
VALUES
    ('b1000000-0000-0000-0000-000000000001', 'Sunita Kumar', 'Mother', '1965-01-20', 'female', 'B+'),
    ('b1000000-0000-0000-0000-000000000002', 'Raj Sharma', 'Husband', '1985-06-10', 'male', 'A+'),
    ('b1000000-0000-0000-0000-000000000002', 'Aarav Sharma', 'Son', '2020-02-14', 'male', 'A+'),
    ('b1000000-0000-0000-0000-000000000003', 'Meera Patel', 'Wife', '1996-08-25', 'female', 'O+')
ON CONFLICT DO NOTHING;
