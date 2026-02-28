-- ============================================================
-- 010: SEED REPORTS, REVIEWS, NOTIFICATIONS & ORDERS
-- Medical reports, emergency requests, pharmacy orders,
-- notifications, reviews, payments
-- ============================================================

-- Medical Reports
INSERT INTO reports (id, patient_id, name, type, file_url, file_size, doctor_notes, test_date, result_date, status, created_at)
VALUES
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001',
     'Complete Blood Count', 'blood_test',
     'reports/cbc_20250115.pdf', '245000',
     'All values within normal range',
     CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE - INTERVAL '14 days', 'normal',
     NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001',
     'Chest X-Ray', 'x_ray',
     'reports/chest_xray_20250110.pdf', '1850000',
     'No abnormalities detected. Heart size normal. Clear lung fields.',
     CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '19 days', 'normal',
     NOW() - INTERVAL '20 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000002',
     'Lipid Profile', 'blood_test',
     'reports/lipid_20250120.pdf', '180000',
     'LDL slightly elevated. Recommend dietary changes.',
     CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '9 days', 'abnormal',
     CURRENT_DATE - INTERVAL '10 days', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Emergency Request (completed)
INSERT INTO emergency_requests (id, request_number, patient_id, requester_name, requester_phone, emergency_type, description, priority, pickup_latitude, pickup_longitude, pickup_address, destination_hospital_id, vehicle_id, operator_id, status, requested_at, assigned_at, pickup_arrived_at, patient_loaded_at, completed_at, estimated_arrival_minutes, response_time_minutes, fare, payment_status, admin_notes)
VALUES
    ('83000000-0000-0000-0000-000000000001', 'EMR-20250120-0001',
     '20000000-0000-0000-0000-000000000001', 'Amit Sharma', '+919800000001',
     'cardiac', 'Patient experiencing severe chest pain and shortness of breath',
     'critical', 12.9352, 77.6245, '100, MG Road, Bangalore - 560001',
     '40000000-0000-0000-0000-000000000002',
     'f4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000001',
     'completed',
     NOW() - INTERVAL '10 days',
     NOW() - INTERVAL '10 days' + INTERVAL '2 minutes',
     NOW() - INTERVAL '10 days' + INTERVAL '12 minutes',
     NOW() - INTERVAL '10 days' + INTERVAL '15 minutes',
     NOW() - INTERVAL '10 days' + INTERVAL '30 minutes',
     15, 12, 1500.00, 'completed', NULL)
ON CONFLICT DO NOTHING;

-- Pharmacy Orders
INSERT INTO pharmacy_orders (id, order_number, patient_id, pharmacy_id, prescription_id, items, total_amount, delivery_address, delivery_type, payment_method, payment_status, status, created_at)
VALUES
    (gen_random_uuid(), 'ORD-20250120-0001',
     '20000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
     '82000000-0000-0000-0000-000000000001',
     '[{"medicine_name": "Aspirin 75mg", "quantity": 30, "price": 45.00}, {"medicine_name": "Atorvastatin 10mg", "quantity": 30, "price": 120.00}, {"medicine_name": "Metoprolol 25mg", "quantity": 60, "price": 180.00}]'::jsonb,
     345.00, '{"address": "42, Jayanagar 4th Block", "city": "Bangalore", "pincode": "560041"}'::jsonb, 'delivery', 'upi', 'paid', 'delivered',
     NOW() - INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, data, created_at)
VALUES
    (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000001',
     'Appointment Confirmed', 'Your appointment with Dr. Priya Patel is confirmed for ' || (CURRENT_DATE + INTERVAL '3 days')::TEXT,
     'appointment', false, '{"appointment_id": "80000000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000001',
     'Prescription Ready', 'Your prescription from Dr. Vikram Reddy is ready for pickup or delivery.',
     'prescription', true, '{"prescription_id": "82000000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '14 days'),
    (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000002',
     'Lab Results Available', 'Your lipid profile results are now available.',
     'report', false, NULL, NOW() - INTERVAL '10 days'),
    (gen_random_uuid(), 'f0000000-0000-0000-0000-000000000003',
     'New Appointment', 'You have a new appointment scheduled for ' || CURRENT_DATE::TEXT || ' at 11:00.',
     'appointment', false, '{"appointment_id": "80000000-0000-0000-0000-000000000003"}'::jsonb, NOW() - INTERVAL '3 days'),
    (gen_random_uuid(), 'f1000000-0000-0000-0000-000000000001',
     'Emergency Completed', 'Emergency request EMR-20250120-0001 has been completed successfully.',
     'emergency', true, '{"emergency_id": "83000000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Reviews (polymorphic — reviewable_type + reviewable_id)
INSERT INTO reviews (id, patient_id, reviewable_type, reviewable_id, rating, comment, is_anonymous, created_at)
VALUES
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001',
     'doctor', '30000000-0000-0000-0000-000000000001',
     5, 'Dr. Priya is extremely thorough and caring. She explained everything clearly and took time to answer all my questions.', false, NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001',
     'doctor', '30000000-0000-0000-0000-000000000002',
     4, 'Good cardiologist. Very knowledgeable. Wait time was a bit long.', false, NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000002',
     'doctor', '30000000-0000-0000-0000-000000000001',
     5, 'Best doctor I have ever visited. Highly recommended!', true, NOW() - INTERVAL '25 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000002',
     'doctor', '30000000-0000-0000-0000-000000000003',
     4, 'Dr. Sneha is very patient and professional. Good experience overall.', false, NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- Payments
INSERT INTO payments (id, patient_id, appointment_id, amount, payment_method, status, payment_reference, created_at)
VALUES
    (gen_random_uuid(),
     '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001',
     500.00, 'upi', 'completed', 'TXN_UPI_' || extract(epoch from now())::bigint,
     NOW() - INTERVAL '1 day'),
    (gen_random_uuid(),
     '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002',
     800.00, 'card', 'completed', 'TXN_CARD_' || (extract(epoch from now())::bigint - 1000000),
     NOW() - INTERVAL '15 days'),
    (gen_random_uuid(),
     '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003',
     600.00, 'upi', 'pending', NULL, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
