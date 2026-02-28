-- ============================================================================
-- DISPATCH SYSTEM MIGRATION
-- Adds support for two dispatch models:
--   1) SOS Broadcast Dispatch (smart auto-dispatch with driver acceptance)
--   2) Hospital-Controlled Dispatch (hospital manually assigns ambulance)
-- ============================================================================

-- 1. Add dispatch columns to emergency_requests
ALTER TABLE emergency_requests
  ADD COLUMN IF NOT EXISTS dispatch_mode VARCHAR(30) DEFAULT 'sos_broadcast'
    CHECK (dispatch_mode IN ('sos_broadcast', 'hospital_controlled')),
  ADD COLUMN IF NOT EXISTS broadcast_round INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS broadcast_ambulance_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepted_by UUID,
  ADD COLUMN IF NOT EXISTS assigned_by UUID,
  ADD COLUMN IF NOT EXISTS hospital_id UUID,
  ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timeout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_loaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hospital_arrived_at TIMESTAMPTZ;

-- 2. Update status CHECK constraint to include new statuses
ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_status_check;
ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_status_check
  CHECK (status IN (
    'pending',           -- Initial state
    'broadcasting',      -- SOS broadcast in progress
    'assigned',          -- Hospital assigned, waiting driver accept
    'accepted',          -- Driver accepted
    'en_route',          -- Ambulance en route to patient
    'arrived',           -- Arrived at patient location
    'picked_up',         -- Patient picked up
    'en_route_hospital', -- Heading to hospital
    'arrived_hospital',  -- Arrived at hospital
    'completed',         -- Trip completed
    'cancelled',         -- Cancelled by patient/admin
    'timeout',           -- No driver accepted in time
    'no_ambulance'       -- No ambulances available
  ));

-- 3. Add ambulance_driver to users role check (if not already)
-- First check if the constraint exists and update it
DO $$
BEGIN
  -- Try to drop and recreate the role check
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN (
      'patient', 'doctor', 'admin', 'super_admin',
      'hospital_owner', 'hospital_manager',
      'clinic_owner', 'pharmacy_owner',
      'diagnostic_center_owner',
      'ambulance_operator', 'ambulance_driver'
    ));
EXCEPTION WHEN OTHERS THEN
  -- If constraint doesn't exist by that name, try alternative
  NULL;
END $$;

-- 4. Atomic accept function with row-level locking (prevents double assignment)
CREATE OR REPLACE FUNCTION accept_emergency_request(
  p_request_id UUID,
  p_ambulance_id UUID,
  p_driver_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_current_vehicle_id UUID;
  v_ambulance_status TEXT;
  v_result JSONB;
BEGIN
  -- Lock the emergency request row (NOWAIT = fail immediately if locked)
  SELECT status, vehicle_id INTO v_current_status, v_current_vehicle_id
  FROM emergency_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'request_not_found');
  END IF;

  -- Only accept if still broadcastable
  IF v_current_status NOT IN ('pending', 'broadcasting', 'assigned') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_accepted',
      'current_status', v_current_status);
  END IF;

  -- If already has a different vehicle assigned and accepted
  IF v_current_vehicle_id IS NOT NULL AND v_current_vehicle_id != p_ambulance_id
     AND v_current_status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_assigned');
  END IF;

  -- Lock and check ambulance availability
  SELECT status INTO v_ambulance_status
  FROM ambulances
  WHERE id = p_ambulance_id
  FOR UPDATE NOWAIT;

  IF v_ambulance_status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'ambulance_unavailable',
      'ambulance_status', v_ambulance_status);
  END IF;

  -- === ATOMIC ASSIGNMENT ===

  -- Update emergency request
  UPDATE emergency_requests
  SET status = 'accepted',
      vehicle_id = p_ambulance_id,
      accepted_by = p_driver_user_id,
      assigned_at = NOW(),
      status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object(
        'status', 'accepted',
        'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'by', p_driver_user_id::text
      )
  WHERE id = p_request_id;

  -- Mark ambulance as dispatched
  UPDATE ambulances
  SET status = 'dispatched',
      is_available = false,
      current_request_id = p_request_id
  WHERE id = p_ambulance_id;

  RETURN jsonb_build_object('success', true, 'status', 'accepted');

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is already processing this request
    RETURN jsonb_build_object('success', false, 'reason', 'concurrent_lock');
END;
$$ LANGUAGE plpgsql;

-- 5. Hospital assign function (for hospital-controlled dispatch)
CREATE OR REPLACE FUNCTION hospital_assign_ambulance(
  p_request_id UUID,
  p_ambulance_id UUID,
  p_assigned_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_ambulance_status TEXT;
BEGIN
  -- Lock the request
  SELECT status INTO v_current_status
  FROM emergency_requests
  WHERE id = p_request_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'request_not_found');
  END IF;

  IF v_current_status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_status',
      'current_status', v_current_status);
  END IF;

  -- Lock and check ambulance
  SELECT status INTO v_ambulance_status
  FROM ambulances
  WHERE id = p_ambulance_id
  FOR UPDATE NOWAIT;

  IF v_ambulance_status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'ambulance_unavailable');
  END IF;

  -- Assign
  UPDATE emergency_requests
  SET status = 'assigned',
      vehicle_id = p_ambulance_id,
      assigned_by = p_assigned_by,
      dispatch_mode = 'hospital_controlled',
      assigned_at = NOW(),
      status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object(
        'status', 'assigned',
        'timestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'by', p_assigned_by::text,
        'mode', 'hospital_controlled'
      )
  WHERE id = p_request_id;

  -- Mark ambulance dispatched
  UPDATE ambulances
  SET status = 'dispatched',
      is_available = false,
      current_request_id = p_request_id
  WHERE id = p_ambulance_id;

  RETURN jsonb_build_object('success', true, 'status', 'assigned');

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'reason', 'concurrent_lock');
END;
$$ LANGUAGE plpgsql;

-- 6. Indexes for dispatch queries
CREATE INDEX IF NOT EXISTS idx_emergency_dispatch_mode ON emergency_requests(dispatch_mode);
CREATE INDEX IF NOT EXISTS idx_emergency_broadcast_status ON emergency_requests(status) WHERE status IN ('pending', 'broadcasting', 'assigned');
CREATE INDEX IF NOT EXISTS idx_ambulances_available ON ambulances(status, is_active) WHERE status = 'available' AND is_active = true;

-- 7. View for hospital dispatch dashboard
CREATE OR REPLACE VIEW hospital_dispatch_view AS
SELECT
  er.id,
  er.request_number,
  er.requester_name,
  er.requester_phone,
  er.pickup_address,
  er.pickup_latitude,
  er.pickup_longitude,
  er.emergency_type,
  er.priority,
  er.status,
  er.dispatch_mode,
  er.notes,
  er.created_at,
  er.assigned_at,
  er.vehicle_id,
  er.broadcast_round,
  a.vehicle_number AS ambulance_vehicle_number,
  a.driver_name AS ambulance_driver_name,
  a.driver_phone AS ambulance_driver_phone,
  a.vehicle_type AS ambulance_type,
  p.name AS patient_name,
  p.user_id AS patient_user_id
FROM emergency_requests er
LEFT JOIN ambulances a ON er.vehicle_id = a.id
LEFT JOIN patients p ON er.patient_id = p.id
WHERE er.status NOT IN ('completed', 'cancelled')
ORDER BY
  CASE er.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    ELSE 3
  END,
  er.created_at ASC;
