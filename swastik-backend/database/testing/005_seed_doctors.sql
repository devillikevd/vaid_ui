-- ============================================================
-- 005: SEED DOCTORS
-- Doctor profiles, slots, associations, reviews
-- ============================================================

INSERT INTO doctors (id, user_id, hospital_id, name, specialization, sub_specialization, experience_years, qualifications, education, registration_number, license_number, medical_council, consultation_fee, video_consultation_fee, bio, languages, available_days, is_approved, approval_status, approved_at, is_available, rating, total_reviews, total_consultations)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
     'd1000000-0000-0000-0000-000000000001',
     'Dr. Arun Mehta', 'Cardiology', 'Interventional Cardiology', 15,
     ARRAY['MBBS', 'MD (Medicine)', 'DM (Cardiology)'],
     ARRAY['AIIMS Delhi - MBBS', 'PGI Chandigarh - MD', 'CMC Vellore - DM'],
     'KMC-2010-12345', 'DOC-KA-ARM-001', 'Karnataka Medical Council',
     800.00, 600.00,
     'Senior interventional cardiologist with 15+ years of experience in complex cardiac procedures.',
     ARRAY['English', 'Hindi', 'Kannada'],
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
     true, 'approved', NOW(), true, 4.7, 320, 2150),

    ('c1000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002',
     'd1000000-0000-0000-0000-000000000002',
     'Dr. Meena Iyer', 'Dermatology', 'Cosmetic Dermatology', 10,
     ARRAY['MBBS', 'MD (Dermatology)', 'Fellowship in Cosmetic Dermatology'],
     ARRAY['Bangalore Medical College - MBBS', 'St. Johns Medical College - MD'],
     'KMC-2014-23456', 'DOC-KA-MNI-002', 'Karnataka Medical Council',
     600.00, 500.00,
     'Experienced dermatologist specializing in acne treatment, laser therapy, and cosmetic procedures.',
     ARRAY['English', 'Hindi', 'Tamil', 'Kannada'],
     ARRAY['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
     true, 'approved', NOW(), true, 4.5, 180, 1200),

    ('c1000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003',
     'd1000000-0000-0000-0000-000000000003',
     'Dr. Vikram Reddy', 'General Medicine', 'Internal Medicine', 8,
     ARRAY['MBBS', 'MD (Internal Medicine)'],
     ARRAY['Osmania Medical College - MBBS', 'NIMHANS - MD'],
     'KMC-2016-34567', 'DOC-KA-VKR-003', 'Karnataka Medical Council',
     500.00, 400.00,
     'Internal medicine specialist with expertise in managing chronic diseases.',
     ARRAY['English', 'Hindi', 'Telugu', 'Kannada'],
     ARRAY['Monday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     true, 'approved', NOW(), true, 4.4, 250, 1800)
ON CONFLICT DO NOTHING;

-- Doctor Slots
INSERT INTO doctor_slots (doctor_id, day_of_week, start_time, end_time, slot_duration, is_video_enabled, is_clinic_enabled)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 1, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 1, '14:00', '17:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 2, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 3, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 4, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000001', 5, '09:00', '13:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000002', 1, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 1, '15:00', '18:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 2, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 4, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 5, '10:00', '13:00', 20, true, true),
    ('c1000000-0000-0000-0000-000000000002', 6, '10:00', '13:00', 20, false, true),
    ('c1000000-0000-0000-0000-000000000003', 1, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 3, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 4, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 5, '08:00', '12:00', 15, true, true),
    ('c1000000-0000-0000-0000-000000000003', 6, '09:00', '12:00', 15, false, true)
ON CONFLICT DO NOTHING;

-- Hospital-Doctor associations
INSERT INTO hospital_doctors (hospital_id, doctor_id, department, designation, is_active)
VALUES
    ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Cardiology', 'Senior Consultant', true),
    ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Dermatology', 'Consultant', true),
    ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'General Medicine', 'Associate Consultant', true)
ON CONFLICT DO NOTHING;

-- Doctor Reviews
INSERT INTO doctor_reviews (doctor_id, patient_id, rating, comment)
VALUES
    ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 5, 'Excellent cardiologist. Very thorough with diagnosis.'),
    ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 4, 'Very knowledgeable. Waiting time was a bit long.'),
    ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 5, 'Best dermatologist in Bangalore!'),
    ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 4, 'Good general physician. Manages my diabetes well.')
ON CONFLICT DO NOTHING;
