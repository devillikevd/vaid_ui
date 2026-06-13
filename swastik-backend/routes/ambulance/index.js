/**
 * Ambulance Routes — Production-Ready Dispatch System
 *
 * Supports TWO dispatch models:
 *   1) SOS Broadcast  — POST /request/sos  (patient SOS → broadcast → first-accept locks)
 *   2) Hospital Manual — POST /request/hospital (hospital creates → assigns ambulance independently)
 *
 * Driver flow:  POST /:requestId/accept | /:requestId/reject
 * Hospital:     POST /:requestId/assign | GET /available | GET /hospital/emergencies
 * Admin:        Monitor-only via /api/admin/emergencies (no dispatch control)
 * Tracking:     GET  /track/:requestId | PUT /location | PUT /request/:requestId/status
 */
const express = require('express');
const { query, body } = require('express-validator');
const { validate, validateUUID } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const ambulanceService = require('../../services/ambulanceService');
const dispatchService = require('../../services/dispatchService');
const { asyncHandler } = require('../../middleware/errorHandler');
const { supabaseAdmin } = require('../../config/supabase');
const { recordHealthEvent } = require('../../services/outbreakService');

const router = express.Router();

const normalizeEmergencyStatus = (request) => {
  if (!request) return request;

  const isLegacyBroadcasting =
    request.status === 'pending' &&
    request.dispatch_mode === 'sos_broadcast' &&
    Array.isArray(request.broadcast_ambulance_ids) &&
    request.broadcast_ambulance_ids.length > 0 &&
    Number(request.broadcast_round || 0) > 0;

  return isLegacyBroadcasting
    ? { ...request, status: 'broadcasting' }
    : request;
};

const getVehiclesForUser = async (user) => {
  let query = supabaseAdmin.from('ambulances').select('*').order('created_at', { ascending: false });

  if (user.role === ROLES.AMBULANCE_OPERATOR) {
    const { data: operator } = await supabaseAdmin
      .from('ambulance_operators')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!operator) return [];
    query = query.eq('operator_id', operator.id);
  } else if (user.role === ROLES.AMBULANCE_DRIVER) {
    query = query.eq('driver_user_id', user.id);
  }

  const { data: vehicles } = await query;
  return vehicles || [];
};

// =====================================================================
// PUBLIC
// =====================================================================

router.get('/types', asyncHandler(async (req, res) => {
  res.json({ success: true, data: ambulanceService.getAmbulanceTypes() });
}));

router.get('/nearby', authenticate,
  [query('latitude').isFloat(), query('longitude').isFloat()], validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 25 } = req.query;
    const data = await ambulanceService.getNearbyAmbulances(+latitude, +longitude, +radius);
    res.json({ success: true, data });
  })
);

// =====================================================================
// PATIENT — SOS Broadcast Dispatch
// =====================================================================

router.post('/request/sos', authenticate,
  [body('latitude').isFloat(), body('longitude').isFloat(),
   body('emergencyType').optional().isIn(['medical','general','cardiac','accident','trauma','pregnancy','other'])],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.requestSOS(req.user.id, req.body);

    // Fire-and-forget: record health signal for outbreak detection
    recordHealthEvent({
      source: 'emergency', sourceId: result.id || result.requestId,
      rawText: [req.body.emergencyType, req.body.symptoms, req.body.description, req.body.patientCondition].filter(Boolean).join(' '),
      patientId: result.patient_id,
      latitude: req.body.latitude, longitude: req.body.longitude,
    }).catch(() => {});

    res.status(201).json({ success: true, data: result });
  })
);

// Legacy route — backward-compatible with existing patient app
router.post('/request', authenticate,
  [body('latitude').isFloat(), body('longitude').isFloat(),
   body('emergencyType').optional().isIn(['medical','general','cardiac','accident','trauma','pregnancy','other'])],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.requestSOS(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  })
);

router.post('/cancel/:requestId', authenticate,
  [
    validateUUID('requestId'),
    body('reason').trim().isLength({ min: 12, max: 500 }).withMessage('Cancellation reason must be 12-500 characters'),
    body('legalNoticeAccepted').custom(value => value === true).withMessage('Cancellation policy acknowledgement is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.cancelByPatient(req.user.id, req.params.requestId, req.body);
    res.json({ success: true, ...result });
  })
);

router.get('/history', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = null } = req.query;
  const result = await ambulanceService.getRequestHistory(req.user, +page, +limit, status);
  const vehicles = await getVehiclesForUser(req.user);
  const vehicleIds = (vehicles || []).map(v => v.id);

  // Override status to 'declined' if the current user rejected it, 
  // so the frontend can properly display it in the 'Declined' section
  if (result.data && Array.isArray(result.data)) {
    result.data = result.data.map(reqData => {
      let history = [];
      try {
        history = typeof reqData.status_history === 'string' 
          ? JSON.parse(reqData.status_history) 
          : (reqData.status_history || []);
      } catch(e) {}
      
      const isRejectedByUs = history.some(h => 
        h.status === 'rejected' && (h.by === req.user.id || vehicleIds.includes(h.ambulanceId))
      );
      
      const isAssignedToUs = reqData.vehicle_id && vehicleIds.includes(reqData.vehicle_id);

      if (isRejectedByUs && !isAssignedToUs) {
        return { ...reqData, status: 'declined' };
      }
      return reqData;
    });
  }
  
  res.json({ success: true, ...result });
}));

// =====================================================================
// DRIVER — Accept / Reject / Status / Location
// =====================================================================

router.post('/:requestId/accept', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  [validateUUID('requestId')], validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.acceptRequest(req.user.id, req.params.requestId);
    res.json({ success: true, data: result });
  })
);

router.post('/:requestId/reject', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  [validateUUID('requestId')], validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.rejectRequest(req.user.id, req.params.requestId);
    res.json({ success: true, data: result });
  })
);

// Hospital Invites
router.get('/invites/pending', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER),
  asyncHandler(async (req, res) => {
    const result = await ambulanceService.getPendingInvites(req.user.id);
    res.json({ success: true, data: result });
  })
);

router.post('/invites/:token/accept', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER),
  asyncHandler(async (req, res) => {
    const result = await ambulanceService.acceptInvite(req.user.id, req.params.token);
    res.json({ success: true, ...result });
  })
);

router.post('/invites/:token/reject', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER),
  asyncHandler(async (req, res) => {
    const result = await ambulanceService.rejectInvite(req.user.id, req.params.token);
    res.json({ success: true, ...result });
  })
);

router.put('/vehicle/status', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  [body('isActive').isBoolean()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await ambulanceService.updateAmbulanceStatus(req.user.id, req.body.isActive);
    res.json(result);
  })
);

router.put('/location', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  [body('latitude').isFloat(), body('longitude').isFloat(),
   body('heading').optional().isFloat(), body('speed').optional().isFloat()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await ambulanceService.updateAmbulanceLocation(req.user.id, req.body);
    res.json({ success: true, ...result });
  })
);

router.put('/request/:requestId/status', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  [validateUUID('requestId'), body('status').isIn(['en_route','arrived','picked_up','en_route_hospital','arrived_hospital','completed','cancelled'])],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.updateStatus(req.user.id, req.params.requestId, req.body.status, req.body);
    res.json({ success: true, ...result });
  })
);

// =====================================================================
// HOSPITAL — Controlled Dispatch
// =====================================================================

router.post('/request/hospital', authenticate,
  requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER),
  [body('latitude').isFloat(), body('longitude').isFloat(),
   body('emergencyType').optional().isIn(['medical','general','cardiac','accident','trauma','pregnancy','other']),
   body('patientName').optional().isString(), body('patientPhone').optional().isString()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.createHospitalRequest(req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  })
);

router.post('/:requestId/assign', authenticate,
  requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER),
  [
    validateUUID('requestId'),
    body('ambulanceId')
      .isString()
      .matches(/^[0-9a-fA-F-]{36}$/)
      .withMessage('ambulanceId must be a valid UUID-like identifier'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.hospitalAssignAmbulance(req.user.id, req.params.requestId, req.body.ambulanceId);
    res.json({ success: true, data: result });
  })
);

router.get('/available', authenticate,
  requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER, ROLES.AMBULANCE_OPERATOR),
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 50 } = req.query;
    if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
    const data = await dispatchService.getAvailableAmbulances(+latitude, +longitude, +radius);
    res.json({ success: true, data });
  })
);

router.get('/hospital/emergencies', authenticate,
  requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER),
  asyncHandler(async (req, res) => {
    const data = await dispatchService.getActiveEmergenciesForHospital(req.user.id);
    res.json({ success: true, data });
  })
);

// =====================================================================
// OPERATOR DASHBOARD
// =====================================================================

router.get('/dashboard', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  requireApproval,
  asyncHandler(async (req, res) => {
    const vehicles = await getVehiclesForUser(req.user);
    const vehicleIds = (vehicles || []).map(v => v.id);

    let activeRequests = [];
    if (vehicleIds.length > 0) {
      const { data } = await supabaseAdmin.from('emergency_requests').select('*')
        .in('vehicle_id', vehicleIds)
        .in('status', [
          'pending',
          'assigned',
          'accepted',
          'broadcasting',
          'dispatched',
          'en_route',
          'en_route_pickup',
          'arrived',
          'arrived_pickup',
          'picked_up',
          'patient_onboard',
          'en_route_hospital',
          'arrived_hospital',
        ])
        .order('created_at', { ascending: false }).limit(20);
      activeRequests = data || [];
    }

    // Only show SOS broadcasts that were actually sent to this ambulance/operator fleet.
    // Hospital-controlled pending requests must stay on the hospital board until assigned.
    let targetedBroadcastRequests = [];
    if (vehicleIds.length > 0) {
      const { data: broadcastRequests } = await supabaseAdmin
        .from('emergency_requests')
        .select('*')
        .eq('dispatch_mode', 'sos_broadcast')
        .in('status', ['pending', 'broadcasting'])
        .order('created_at', { ascending: false })
        .limit(20);

      targetedBroadcastRequests = (broadcastRequests || []).filter((request) => {
        // If it's already accepted by us, it's covered by activeRequests, but keep it just in case
        if (request.vehicle_id && vehicleIds.includes(request.vehicle_id)) {
          return true;
        }

        // Check if we rejected this broadcast
        let history = [];
        try {
          history = typeof request.status_history === 'string' 
            ? JSON.parse(request.status_history) 
            : (request.status_history || []);
        } catch(e) {}
        
        const isRejectedByUs = history.some(h => 
          h.status === 'rejected' && (
            (h.ambulanceId && vehicleIds.includes(h.ambulanceId)) || 
            (h.by === req.user.id)
          )
        );
        if (isRejectedByUs) return false;

        const broadcastVehicleIds = Array.isArray(request.broadcast_ambulance_ids)
          ? request.broadcast_ambulance_ids
          : [];

        return broadcastVehicleIds.some((vehicleId) => vehicleIds.includes(vehicleId));
      });
    }

    const allRequests = [...activeRequests];
    targetedBroadcastRequests.forEach((request) => {
      if (!allRequests.find((activeRequest) => activeRequest.id === request.id)) {
        allRequests.push(request);
      }
    });

    const today = new Date().toISOString().split('T')[0];
    let completedToday = 0;
    if (vehicleIds.length > 0) {
      const { count } = await supabaseAdmin.from('emergency_requests').select('*', { count: 'exact', head: true })
        .in('vehicle_id', vehicleIds).eq('status', 'completed').gte('created_at', today + 'T00:00:00Z');
      completedToday = count || 0;
    }

    // Real avg response time
    let avgResponseTime = 'N/A';
    if (vehicleIds.length > 0) {
      const { data: completed } = await supabaseAdmin.from('emergency_requests')
        .select('created_at, assigned_at').in('vehicle_id', vehicleIds).eq('status', 'completed')
        .not('assigned_at', 'is', null).order('created_at', { ascending: false }).limit(20);
      if (completed?.length > 0) {
        const totalMin = completed.reduce((s, r) => s + (new Date(r.assigned_at) - new Date(r.created_at)) / 60000, 0);
        avgResponseTime = `${Math.round(totalMin / completed.length)} min`;
      }
    }

    const activeEmergencies = allRequests.map(rawRequest => {
      const r = normalizeEmergencyStatus(rawRequest);
      return ({
      id: r.id, requestNumber: r.request_number,
      priority: r.priority || (r.emergency_type === 'cardiac' || r.emergency_type === 'accident' ? 'critical' : r.emergency_type === 'pregnancy' ? 'high' : 'normal'),
      location: r.pickup_address || `${r.pickup_latitude}, ${r.pickup_longitude}`,
      latitude: r.pickup_latitude, longitude: r.pickup_longitude,
      status: r.status, dispatchMode: r.dispatch_mode, time: r.created_at,
      emergencyType: r.emergency_type, requesterName: r.requester_name,
      requesterPhone: r.requester_phone,
      // Aliases for ambulance app DTO compatibility (EmergencyDto uses @SerializedName)
      patient_name: r.requester_name, patient_phone: r.requester_phone,
      patientName: r.requester_name, patientPhone: r.requester_phone,
      pickup_latitude: r.pickup_latitude, pickup_longitude: r.pickup_longitude,
      pickup_address: r.pickup_address, emergency_type: r.emergency_type,
      dispatch_mode: r.dispatch_mode, broadcast_round: r.broadcast_round,
      created_at: r.created_at,
      vehicleId: r.vehicle_id, notes: r.notes,
    })});

    const vehicleList = (vehicles || []).map(v => ({
      id: v.id, vehicleNumber: v.vehicle_number, driver: v.driver_name || null,
      driverPhone: v.driver_phone, status: v.status || 'available', type: v.vehicle_type,
      latitude: v.current_latitude, longitude: v.current_longitude,
    }));

    res.json({
      success: true,
      stats: { activeEmergencies: activeEmergencies.length, availableVehicles: vehicleList.filter(v => v.status === 'available').length, completedToday, avgResponseTime },
      activeEmergencies, vehicles: vehicleList,
    });
  })
);

router.get('/vehicles', authenticate,
  requireRole(ROLES.AMBULANCE_OPERATOR, ROLES.AMBULANCE_DRIVER, ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const vehicles = await getVehiclesForUser(req.user);
    res.json({ success: true, vehicles: (vehicles || []).map(v => ({
      id: v.id, vehicleNumber: v.vehicle_number, driver: v.driver_name || null,
      driverPhone: v.driver_phone, status: v.status || 'available', type: v.vehicle_type,
      latitude: v.current_latitude, longitude: v.current_longitude,
    })) });
  })
);

// =====================================================================
// TRACKING
// =====================================================================

router.get('/track/:requestId', authenticate,
  [validateUUID('requestId')], validate,
  asyncHandler(async (req, res) => {
  await dispatchService.assertEmergencyAccess(
    { id: req.user.id, role: req.user.role },
    req.params.requestId,
    { allowBroadcastAccess: true, action: 'track' }
  );

  const data = await ambulanceService.getAmbulanceLocation(req.params.requestId);
  res.json({ success: true, data });
}));

router.get('/request/:id', authenticate,
  [validateUUID('id')], validate,
  asyncHandler(async (req, res) => {
  await dispatchService.assertEmergencyAccess(
    { id: req.user.id, role: req.user.role },
    req.params.id,
    { allowBroadcastAccess: true, action: 'view' }
  );

  const { data, error } = await supabaseAdmin.from('emergency_requests')
    .select('*, vehicle:ambulances(id, vehicle_number, driver_name, driver_phone, vehicle_type, current_latitude, current_longitude, operator_id), patient:patients(id, name, user_id)')
    .eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Emergency request not found' });

  const normalized = normalizeEmergencyStatus(data);

  res.json({ success: true, data: {
    ...normalized,
    ambulance: data.vehicle ? { id: data.vehicle.id, vehicleNumber: data.vehicle.vehicle_number,
      driverName: data.vehicle.driver_name, driverPhone: data.vehicle.driver_phone,
      type: data.vehicle.vehicle_type, latitude: data.vehicle.current_latitude, longitude: data.vehicle.current_longitude } : null,
  } });
}));

module.exports = router;
