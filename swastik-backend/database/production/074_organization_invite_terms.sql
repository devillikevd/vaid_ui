-- ============================================================
-- 074: Organization Invite Terms
-- Adds schedule, fee, and practice_type to clinic/hospital invites
-- ============================================================

-- 1. Alter clinic_doctor_invites
ALTER TABLE clinic_doctor_invites
ADD COLUMN IF NOT EXISTS practice_type TEXT CHECK (practice_type IN ('full_time', 'part_time', 'visiting', 'contract')),
ADD COLUMN IF NOT EXISTS consultation_modes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payout_terms TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS counter_proposal TEXT;

-- Drop and recreate the status check constraint to include 'changes_requested'
ALTER TABLE clinic_doctor_invites DROP CONSTRAINT IF EXISTS clinic_doctor_invites_status_check;
ALTER TABLE clinic_doctor_invites ADD CONSTRAINT clinic_doctor_invites_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled', 'changes_requested'));

-- 2. Alter hospital_doctor_invites
ALTER TABLE hospital_doctor_invites
ADD COLUMN IF NOT EXISTS practice_type TEXT CHECK (practice_type IN ('full_time', 'part_time', 'visiting', 'contract')),
ADD COLUMN IF NOT EXISTS consultation_modes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payout_terms TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS counter_proposal TEXT;

-- Drop and recreate the status check constraint to include 'changes_requested'
ALTER TABLE hospital_doctor_invites DROP CONSTRAINT IF EXISTS hospital_doctor_invites_status_check;
ALTER TABLE hospital_doctor_invites ADD CONSTRAINT hospital_doctor_invites_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled', 'changes_requested'));
