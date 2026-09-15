-- ============================================================
-- 113: ADD FACILITY PENDING ROLES TO USERS ROLE CHECK
-- Enables secure, tokenized registration lifecycle for facility providers
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN (
    'patient',
    'doctor', 'doctor_pending',
    'hospital_owner', 'hospital_owner_pending', 'hospital_manager',
    'clinic_owner', 'clinic_owner_pending',
    'pharmacy_owner', 'pharmacy_owner_pending', 'pharmacy_manager', 'pharmacy_staff',
    'diagnostic_center_owner', 'diagnostic_center_owner_pending', 'diagnostic_manager', 'lab_technician',
    'wellness_coach', 'wellness_coach_pending',
    'fitness_center_owner', 'fitness_center_owner_pending',
    'ambulance_operator', 'ambulance_driver',
    'admin', 'super_admin'
));

-- Optional verification document storage for fitness centers if needed
ALTER TABLE fitness_centers
ADD COLUMN IF NOT EXISTS license_document_url TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT;
