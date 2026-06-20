-- ============================================================
-- 040: Add doctor_pending role to users check constraint
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN (
    'patient', 'doctor', 'doctor_pending', 'hospital_owner', 'hospital_manager',
    'clinic_owner', 'pharmacy_owner', 'ambulance_operator',
    'ambulance_driver', 'diagnostic_center_owner',
    'admin', 'super_admin'
));
