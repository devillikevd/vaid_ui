-- ============================================================
-- 099: Add consent statuses to Universal Referrals
-- ============================================================

ALTER TABLE universal_referrals DROP CONSTRAINT IF EXISTS universal_referrals_status_check;
ALTER TABLE universal_referrals ADD CONSTRAINT universal_referrals_status_check 
  CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected', 'awaiting_consent', 'consent_declined'));
