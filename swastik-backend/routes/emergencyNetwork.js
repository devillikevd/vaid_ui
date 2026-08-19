const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const firstResponderService = require('../services/firstResponderService');

// All routes require authenticated user
router.use(requireAuth);

/**
 * @route POST /api/v1/emergency-network/register
 * @desc Register or update First Responder profile
 */
router.post('/register',
  [
    body('tier').optional().isIn(['DOCTOR', 'NURSE', 'PARAMEDIC', 'CPR_VOLUNTEER', 'SAMARITAN']),
    body('skills').optional().isArray(),
    body('registrationNo').optional().isString(),
    body('councilName').optional().isString(),
    body('certDocumentUrl').optional().isString(),
    body('isOnDuty').optional().isBoolean(),
    body('latitude').optional().isNumeric(),
    body('longitude').optional().isNumeric()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const responder = await firstResponderService.registerResponder(req.user.id, req.body);
    res.json({
      success: true,
      message: 'Successfully registered as a Verified Community First Responder!',
      data: responder
    });
  })
);

/**
 * @route GET /api/v1/emergency-network/me
 * @desc Get current user's First Responder profile
 */
router.get('/me',
  asyncHandler(async (req, res) => {
    const responder = await firstResponderService.getResponderProfile(req.user.id);
    res.json({
      success: true,
      data: responder
    });
  })
);

/**
 * @route PUT /api/v1/emergency-network/duty
 * @desc Toggle availability duty status
 */
router.put('/duty',
  [
    body('isOnDuty').isBoolean().withMessage('isOnDuty boolean is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const updated = await firstResponderService.updateDutyStatus(req.user.id, req.body.isOnDuty);
    res.json({
      success: true,
      message: req.body.isOnDuty ? 'You are now ON DUTY for community emergency alerts' : 'Duty paused',
      data: updated
    });
  })
);

/**
 * @route POST /api/v1/emergency-network/location-ping
 * @desc Update live GPS location ping for on-duty responder
 */
router.post('/location-ping',
  [
    body('latitude').isNumeric().withMessage('latitude is required'),
    body('longitude').isNumeric().withMessage('longitude is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const updated = await firstResponderService.updateLocation(req.user.id, req.body.latitude, req.body.longitude);
    res.json({
      success: true,
      data: updated
    });
  })
);

/**
 * @route POST /api/v1/emergency-network/broadcast
 * @desc Trigger an emergency broadcast to nearby verified responders (Crash / Fall / SOS)
 */
router.post('/broadcast',
  [
    body('latitude').isNumeric().withMessage('latitude is required'),
    body('longitude').isNumeric().withMessage('longitude is required'),
    body('incidentType').optional().isString(),
    body('addressText').optional().isString(),
    body('vitalsSnapshot').optional().isObject(),
    body('radiusMeters').optional().isNumeric()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await firstResponderService.broadcastEmergency(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: `Emergency broadcast active. Notified ${result.notifiedCount} nearby verified responder(s)!`,
      data: result
    });
  })
);

/**
 * @route GET /api/v1/emergency-network/broadcasts/nearby
 * @desc List active nearby emergencies for an on-duty responder
 */
router.get('/broadcasts/nearby',
  [
    query('latitude').optional().isNumeric(),
    query('longitude').optional().isNumeric(),
    query('radiusMeters').optional().isNumeric()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radiusMeters } = req.query;
    const broadcasts = await firstResponderService.listActiveNearbyEmergencies(latitude, longitude, radiusMeters);
    res.json({
      success: true,
      data: broadcasts
    });
  })
);

/**
 * @route GET /api/v1/emergency-network/broadcasts/:id
 * @desc Get details of a specific emergency broadcast
 */
router.get('/broadcasts/:id',
  [
    param('id').isUUID().withMessage('Valid broadcast ID is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const broadcast = await firstResponderService.getBroadcast(req.params.id);
    res.json({
      success: true,
      data: broadcast
    });
  })
);

/**
 * @route POST /api/v1/emergency-network/broadcasts/:id/accept
 * @desc On-duty responder accepts an emergency broadcast
 */
router.post('/broadcasts/:id/accept',
  [
    param('id').isUUID().withMessage('Valid broadcast ID is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await firstResponderService.acceptEmergency(req.params.id, req.user.id);
    res.json({
      success: true,
      message: 'Emergency accepted. Turn-by-turn navigation active!',
      data: result
    });
  })
);

/**
 * @route POST /api/v1/emergency-network/broadcasts/:id/status
 * @desc Update responder status (e.g. ARRIVED on scene, COMPLETED)
 */
router.post('/broadcasts/:id/status',
  [
    param('id').isUUID().withMessage('Valid broadcast ID is required'),
    body('status').isIn(['ARRIVED', 'COMPLETED', 'DECLINED']).withMessage('Valid status is required'),
    body('notes').optional().isString()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const assignment = await firstResponderService.updateAssignmentStatus(
      req.params.id,
      req.user.id,
      req.body.status,
      req.body.notes
    );
    res.json({
      success: true,
      message: `Status updated to ${req.body.status}`,
      data: assignment
    });
  })
);

/**
 * @route POST /api/v1/emergency-network/broadcasts/:id/dispatch-ambulance
 * @desc On-scene responder dispatches verified ambulance & pre-alerts hospital
 */
router.post('/broadcasts/:id/dispatch-ambulance',
  [
    param('id').isUUID().withMessage('Valid broadcast ID is required'),
    body('triageLevel').optional().isIn(['RED', 'YELLOW', 'GREEN']),
    body('notes').optional().isString()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await firstResponderService.dispatchAmbulance(
      req.params.id,
      req.user.id,
      req.body.triageLevel || 'RED',
      req.body.notes
    );
    res.json({
      success: true,
      message: 'Verified ambulance dispatched & hospital trauma team pre-alerted!',
      data: result
    });
  })
);

module.exports = router;
