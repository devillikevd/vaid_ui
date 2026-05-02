-- 026: Diagnostic booking manual confirmation and dispatch-aware statuses
-- Expands booking lifecycle to:
-- pending -> confirmed -> dispatched? -> sample_collected -> processing -> completed

UPDATE diagnostic_bookings
SET status = 'pending',
    updated_at = NOW()
WHERE status = 'booked';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'diagnostic_bookings'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'diagnostic_bookings_status_check'
  ) THEN
    ALTER TABLE diagnostic_bookings DROP CONSTRAINT diagnostic_bookings_status_check;
  END IF;

  ALTER TABLE diagnostic_bookings
    ADD CONSTRAINT diagnostic_bookings_status_check
    CHECK (status IN (
      'pending', 'confirmed', 'dispatched', 'sample_collected', 'processing', 'completed', 'cancelled'
    ));
END $$;
