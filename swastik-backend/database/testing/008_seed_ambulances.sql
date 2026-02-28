-- ============================================================
-- 008: SEED AMBULANCES
-- Ambulance operators, vehicles
-- ============================================================

INSERT INTO ambulance_operators (id, user_id, name, company_name, registration_number, address, city, state, phone, email, total_vehicles, available_vehicles, service_area, base_fare, per_km_rate, is_active, is_approved, approval_status, approved_at, rating, total_trips, completed_requests)
VALUES
    ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
     'Rajesh Ambulance Services', 'Rajesh Emergency Services Pvt Ltd', 'AMB-KA-RAS-001',
     '100, Wilson Garden', 'Bangalore', 'Karnataka', '+919600000001', 'rajesh.ambulance@test.com',
     3, 2, ARRAY['Bangalore', 'Bangalore Rural'], 500.00, 20.00,
     true, true, 'approved', NOW(), 4.4, 520, 485),
    ('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002',
     'City Ambulance Network', 'City Emergency Services', 'AMB-KA-CAN-002',
     '55, Whitefield Main Road', 'Bangalore', 'Karnataka', '+919600000002', 'city.ambulance@test.com',
     2, 1, ARRAY['Bangalore', 'Electronic City'], 600.00, 25.00,
     true, true, 'approved', NOW(), 4.2, 280, 250)
ON CONFLICT DO NOTHING;

INSERT INTO ambulances (id, operator_id, vehicle_number, vehicle_type, vehicle_model, vehicle_year, has_oxygen, has_ventilator, has_defibrillator, equipment, driver_name, driver_phone, status, current_latitude, current_longitude, is_active, is_available)
VALUES
    ('f4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001',
     'KA-01-AB-1234', 'Basic Life Support', 'Force Traveller', 2022,
     true, false, false, ARRAY['Stretcher', 'First Aid Kit', 'Oxygen Cylinder', 'Suction Machine'],
     'Suresh Kumar', '+919611111111', 'available', 12.9352, 77.6245, true, true),
    ('f4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000001',
     'KA-01-CD-5678', 'Advanced Life Support', 'Force Traveller BS6', 2023,
     true, true, true, ARRAY['Stretcher', 'First Aid Kit', 'Oxygen Cylinder', 'Ventilator', 'Defibrillator', 'Cardiac Monitor'],
     'Manoj Singh', '+919622222222', 'available', 12.9716, 77.5946, true, true),
    ('f4000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000001',
     'KA-01-EF-9012', 'ICU on Wheels', 'Tata Winger', 2023,
     true, true, true, ARRAY['ICU Bed', 'Ventilator', 'Defibrillator', 'Cardiac Monitor', 'Infusion Pump', 'Syringe Pump'],
     'Ravi Prasad', '+919633333333', 'maintenance', NULL, NULL, true, false),
    ('f4000000-0000-0000-0000-000000000004', 'f3000000-0000-0000-0000-000000000002',
     'KA-05-GH-3456', 'Basic Life Support', 'Force Traveller', 2021,
     true, false, false, ARRAY['Stretcher', 'First Aid Kit', 'Oxygen Cylinder'],
     'Dinesh Rao', '+919644444444', 'available', 12.9698, 77.7500, true, true),
    ('f4000000-0000-0000-0000-000000000005', 'f3000000-0000-0000-0000-000000000002',
     'KA-05-IJ-7890', 'Advanced Life Support', 'Force Traveller BS6', 2023,
     true, true, true, ARRAY['Stretcher', 'Ventilator', 'Defibrillator', 'Cardiac Monitor', 'Oxygen Cylinder'],
     'Prashanth Gowda', '+919655555555', 'busy', 12.8400, 77.6600, true, false)
ON CONFLICT DO NOTHING;
