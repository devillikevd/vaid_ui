-- ============================================================
-- 011: SEED SYSTEM SETTINGS & AUDIT
-- System settings, audit log entries
-- ============================================================

-- System Settings
INSERT INTO system_settings (key, value, description, updated_by)
VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode for the entire system', NULL),
    ('max_appointments_per_day', '50', 'Maximum appointments a doctor can have per day', NULL),
    ('appointment_slot_duration', '30', 'Default appointment slot duration in minutes', NULL),
    ('max_emergency_radius_km', '25', 'Maximum radius in km to search for ambulances', NULL),
    ('consultation_timeout_minutes', '60', 'Auto-end consultation after this many minutes of inactivity', NULL),
    ('enable_video_consultation', 'true', 'Enable/disable video consultation feature globally', NULL),
    ('pharmacy_delivery_radius_km', '15', 'Maximum delivery radius for pharmacy orders', NULL),
    ('ambulance_broadcast_timeout_seconds', '120', 'Timeout for ambulance broadcast before marking as no_ambulance', NULL),
    ('max_file_upload_size_mb', '10', 'Maximum file upload size in megabytes', NULL),
    ('otp_expiry_minutes', '10', 'OTP expiry time in minutes', NULL)
ON CONFLICT (key) DO NOTHING;

-- Sample Audit Logs
INSERT INTO audit_logs (id, admin_id, action, entity_type, entity_id, details, ip_address, created_at)
VALUES
    (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001',
     'approve_doctor', 'doctor', '30000000-0000-0000-0000-000000000001',
     '{"doctor_name": "Dr. Priya Patel", "specialization": "General Medicine"}'::jsonb,
     '192.168.1.100', NOW() - INTERVAL '60 days'),
    (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001',
     'approve_hospital', 'hospital', '40000000-0000-0000-0000-000000000001',
     '{"hospital_name": "Apollo Hospital Bangalore", "registration": "HOSP-KA-APL-001"}'::jsonb,
     '192.168.1.100', NOW() - INTERVAL '90 days'),
    (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001',
     'approve_operator', 'ambulance_operator', 'f3000000-0000-0000-0000-000000000001',
     '{"operator_name": "Rajesh Ambulance Services", "vehicles": 3}'::jsonb,
     '192.168.1.100', NOW() - INTERVAL '45 days'),
    (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001',
     'update_setting', 'system_settings', NULL,
     '{"key": "max_emergency_radius_km", "old_value": "20", "new_value": "25"}'::jsonb,
     '192.168.1.100', NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PERSONAL TEST ACCOUNTS (for manual testing)
-- ============================================================
-- Ambulance Operator Login:
--   Email: nayanpr620@gmail.com
--   Password: test@123456
--   Role: ambulance_operator
--
-- Patient Login:
--   Email: nayanpr620+patient@gmail.com
--   Password: test@123456
--   Role: patient
-- ============================================================
