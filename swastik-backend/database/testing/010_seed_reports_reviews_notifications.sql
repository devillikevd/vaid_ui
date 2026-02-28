-- ============================================================
-- 010: SEED REPORTS, REVIEWS, NOTIFICATIONS & ORDERS
-- Medical reports, emergency requests, pharmacy orders,
-- notifications, reviews, payments
-- ============================================================

-- Medical Reports
INSERT INTO reports (id, patient_id, title, type, file_url, file_name, file_size, notes, hospital_id, doctor_id, report_date, created_at)
VALUES
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001',
     'Complete Blood Count', 'lab_report',
     'reports/cbc_20250115.pdf', 'cbc_20250115.pdf', 245000,
     'All values within normal range', '40000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000001',
     'Chest X-Ray', 'radiology',
     'reports/chest_xray_20250110.pdf', 'chest_xray_20250110.pdf', 1850000,
     'No abnormalities detected. Heart size normal. Clear lung fields.',
     '40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
     CURRENT_DATE - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
    (gen_random_uuid(), '20000000-0000-0000-0000-000000000002',
     'Lipid Profile', 'lab_report',
     'reports/lipid_20250120.pdf', 'lipid_20250120.pdf', 180000,
     'LDL slightly elevated. Recommend dietary changes.',
     '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
     CURRENT_DATE - INTERVAL '10 days', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

-- Emergency Request (completed)
INSERT INTO emergency_requests (id, request_number, patient_id, patient_name, patient_phone, emergency_type, description, severity, pickup_latitude, pickup_longitude, pickup_address, destination_hospital_id, assigned_ambulance_id, assigned_operator_id, status, requested_at, accepted_at, pickup_arrived_at, patient_loaded_at, completed_at, estimated_arrival_minutes, actual_arrival_minutes, fare_amount, payment_status, admin_notes)
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
INSERT INTO pharmacy_orders (id, order_number, patient_id, pharmacy_id, prescription_id, items, total_amount, delivery_address, delivery_type, payment_method, payment_status, status, ordered_at)
VALUES
    (gen_random_uuid(), 'ORD-20250120-0001',
     '20000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001',
     '82000000-0000-0000-0000-000000000001',
     '[{"medicine_name": "Aspirin 75mg", "quantity": 30, "price": 45.00}, {"medicine_name": "Atorvastatin 10mg", "quantity": 30, "price": 120.00}, {"medicine_name": "Metoprolol 25mg", "quantity": 60, "price": 180.00}]'::jsonb,
     345.00, '42, Jayanagar 4th Block, Bangalore - 560041', 'delivery', 'online', 'completed', 'delivered',
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

-- Doctor Reviews
INSERT INTO doctor_reviews (id, doctor_id, patient_id, rating, comment, is_anonymous, created_at)
VALUES
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
     5, 'Dr. Priya is extremely thorough and caring. She explained everything clearly and took time to answer all my questions.', false, NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
     4, 'Good cardiologist. Very knowledgeable. Wait time was a bit long.', false, NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
     5, 'Best doctor I have ever visited. Highly recommended!', true, NOW() - INTERVAL '25 days'),
    (gen_random_uuid(), '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
     4, 'Dr. Sneha is very patient and professional. Good experience overall.', false, NOW() - INTERVAL '20 days')
ON CONFLICT DO NOTHING;

-- Payments
INSERT INTO payments (id, payment_number, patient_id, appointment_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at)
VALUES
    (gen_random_uuid(), 'PAY-20250201-0001',
     '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001',
     500.00, 'upi', 'completed', 'TXN_UPI_' || extract(epoch from now())::bigint,
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), 'PAY-20250115-0001',
     '20000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002',
     800.00, 'card', 'completed', 'TXN_CARD_' || (extract(epoch from now())::bigint - 1000000),
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
    (gen_random_uuid(), 'PAY-20250201-0002',
     '20000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003',
     600.00, 'upi', 'pending', NULL, NULL, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
