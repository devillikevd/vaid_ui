-- ============================================================
-- 009: SEED APPOINTMENTS & CONSULTATIONS
-- Appointments, consultations, prescriptions, vitals
-- ============================================================

-- Appointments (upcoming, completed, today)
INSERT INTO appointments (id, appointment_number, patient_id, doctor_id, hospital_id, department_id, appointment_date, appointment_time, duration_minutes, type, status, reason, notes, queue_number, payment_status, payment_amount, created_at)
VALUES
    -- Upcoming appointment
    ('80000000-0000-0000-0000-000000000001', 'APT-20250201-0001',
     '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
     '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
     CURRENT_DATE + INTERVAL '3 days', '10:00', 30, 'in-person', 'confirmed',
     'Regular checkup and blood pressure monitoring', NULL, 1, 'completed', 500.00, NOW() - INTERVAL '1 day'),
    -- Completed appointment
    ('80000000-0000-0000-0000-000000000002', 'APT-20250115-0001',
     '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
     '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003',
     CURRENT_DATE - INTERVAL '15 days', '14:30', 30, 'in-person', 'completed',
     'Chest pain and difficulty breathing', 'Patient reports occasional chest tightness during exercise',
     3, 'completed', 800.00, NOW() - INTERVAL '20 days'),
    -- Today's appointment
    ('80000000-0000-0000-0000-000000000003', 'APT-20250201-0002',
     '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
     '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000005',
     CURRENT_DATE, '11:00', 45, 'video', 'confirmed',
     'Skin rash on hands and forearms for 2 weeks', NULL, 1, 'pending', 600.00, NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Consultation for completed appointment
INSERT INTO consultations (id, appointment_id, patient_id, doctor_id, diagnosis, symptoms, examination_notes, follow_up_date, follow_up_notes, status, started_at, ended_at, created_at)
VALUES
    ('81000000-0000-0000-0000-000000000001',
     '80000000-0000-0000-0000-000000000002',
     '20000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000002',
     'Mild angina - stable. Stress-induced chest tightness.',
     ARRAY['Chest tightness during exercise', 'Mild shortness of breath', 'No radiating pain'],
     'Cardiac auscultation normal. BP: 130/85. ECG shows no acute changes. Recommend stress test.',
     CURRENT_DATE + INTERVAL '30 days',
     'Follow up after stress test results. Continue medication.',
     'completed',
     NOW() - INTERVAL '15 days',
     NOW() - INTERVAL '15 days' + INTERVAL '25 minutes',
     NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- Patient vitals for the consultation
INSERT INTO patient_vitals (id, patient_id, consultation_id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic, temperature, blood_sugar, oxygen_level, weight, height, recorded_at)
VALUES
    ('84000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     '81000000-0000-0000-0000-000000000001',
     78, 130, 85, 98.4, 110, 97, 72.5, 175.0,
     NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- Prescription for the consultation
INSERT INTO prescriptions (id, consultation_id, patient_id, doctor_id, notes, is_active, created_at)
VALUES
    ('82000000-0000-0000-0000-000000000001',
     '81000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001',
     '30000000-0000-0000-0000-000000000002',
     'Take medications regularly. Avoid strenuous exercise until stress test. Follow low-sodium diet.',
     true, NOW() - INTERVAL '15 days')
ON CONFLICT DO NOTHING;

-- Prescription medicines
INSERT INTO prescription_medicines (id, prescription_id, medicine_name, dosage, frequency, duration, instructions, quantity)
VALUES
    (gen_random_uuid(), '82000000-0000-0000-0000-000000000001',
     'Aspirin 75mg', '75mg', 'Once daily', '30 days', 'Take after breakfast', 30),
    (gen_random_uuid(), '82000000-0000-0000-0000-000000000001',
     'Atorvastatin 10mg', '10mg', 'Once daily', '30 days', 'Take at bedtime', 30),
    (gen_random_uuid(), '82000000-0000-0000-0000-000000000001',
     'Metoprolol 25mg', '25mg', 'Twice daily', '30 days', 'Take morning and evening with food', 60)
ON CONFLICT DO NOTHING;
