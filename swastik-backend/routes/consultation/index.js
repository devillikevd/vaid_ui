const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const consultationService = require('../../services/consultationService');
const consultationLifecycleService = require('../../services/consultationLifecycleService');
const { asyncHandler } = require('../../middleware/errorHandler');
const { recordHealthEvent } = require('../../services/outbreakService');
const { CONSULTATION_ROLE_POLICY } = require('../../config/accessPolicy');
const { requireRole, ROLES } = require('../../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Policy management (admin only, Part 8/10/11/12) — registered before :id
router.get('/policies',
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.getPolicies();
    res.json({ success: true, data: result });
  })
);

router.put('/policies/:key',
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  [
    body('value').notEmpty().withMessage('value is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.updatePolicy({
      key: req.params.key,
      value: req.body.value,
      changedBy: req.user.id,
    });
    res.json({ success: true, data: result });
  })
);

// Get consultation history
router.get('/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await consultationService.getConsultationHistory(
      req.user.id,
      req.user.role,
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  })
);

// Start consultation (doctor only)
router.post('/:appointmentId/start',
  requireRole(CONSULTATION_ROLE_POLICY.START),
  asyncHandler(async (req, res) => {
    const result = await consultationService.startConsultation(req.user.id, req.params.appointmentId);
    res.status(201).json({ success: true, data: result });
  })
);

// Join consultation (patient only)
router.post('/:id/join',
  requireRole(CONSULTATION_ROLE_POLICY.JOIN),
  asyncHandler(async (req, res) => {
    const result = await consultationService.joinConsultation(req.user.id, req.params.id);
    res.json({ success: true, data: result });
  })
);

// Get consultation by ID
router.get('/:id',
  asyncHandler(async (req, res) => {
    const consultation = await consultationService.getConsultation(
      req.user.id,
      req.user.role,
      req.params.id
    );
    res.json({ success: true, data: consultation });
  })
);

// Get ICE servers for a consultation (doctor/patient only)
router.get('/:id/ice-servers',
  asyncHandler(async (req, res) => {
    const result = await consultationService.getIceServers(
      req.user.id,
      req.user.role,
      req.params.id
    );
    res.json({ success: true, data: result });
  })
);

// End consultation (doctor only)
router.put('/:id/end',
  requireRole(CONSULTATION_ROLE_POLICY.END),
  [
    body('diagnosis').optional().isString().trim().escape(),
    body('notes').optional().isString().trim().escape(),
    body('followUpDate').optional().isDate(),
    body('otp').optional().isString().isLength({ min: 6, max: 6 }).withMessage('Invalid OTP format'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const consultation = await consultationService.endConsultation(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json({ success: true, data: consultation });
  })
);

// Leave consultation (patient only) — signal patient left the video call
router.post('/:id/leave',
  requireRole(CONSULTATION_ROLE_POLICY.LEAVE),
  asyncHandler(async (req, res) => {
    const result = await consultationService.leaveConsultation(req.user.id, req.params.id);
    res.json({ success: true, ...result });
  })
);

// Add prescription (doctor only)
router.post('/:id/prescription',
  requireRole(CONSULTATION_ROLE_POLICY.ADD_PRESCRIPTION),
  [
    body('items').isArray().withMessage('Prescription items are required'),
    body('items.*.medicineName').notEmpty().withMessage('Medicine name is required').trim().escape(),
    body('items.*.dosage').notEmpty().withMessage('Dosage is required').trim().escape(),
    body('items.*.frequency').notEmpty().withMessage('Frequency is required').trim().escape(),
    body('items.*.duration').notEmpty().withMessage('Duration is required').trim().escape(),
    body('items.*.instructions').optional().isString().trim().escape(),
    body('items.*.quantity').optional().isInt({ min: 1 }),
    body('items.*.beforeFood').optional().isBoolean(),
    body('items.*.isCritical').optional().isBoolean(),
    body('diagnosis').optional().isString().trim().escape(),
    body('notes').optional().isString().trim().escape(),
    body('followUpDate').optional().isString(),
    body('dietaryAdvice').optional().isString().trim().escape(),
    body('lifestyleAdvice').optional().isString().trim().escape(),
    body('instructions').optional().isString().trim().escape(),
    body('validityDays').optional().isInt({ min: 1, max: 365 }),
    body('allowMultiplePrescriptions').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const prescription = await consultationService.addPrescription(
      req.user.id,
      { consultationId: req.params.id },
      req.body
    );

    // Fire-and-forget: record health signal for outbreak detection
    if (prescription.diagnosis || req.body.diagnosis) {
      recordHealthEvent({
        source: 'prescription', sourceId: prescription.id,
        diagnosisText: prescription.diagnosis || req.body.diagnosis,
        rawText: [prescription.diagnosis, req.body.diagnosis, req.body.notes].filter(Boolean).join(' '),
        patientId: prescription.patient_id,
      }).catch(() => {});
    }

    res.status(201).json({ success: true, data: prescription });
  })
);

// AI-assisted clinical decision support (doctor only)
router.post('/:id/ai-assist',
  requireRole(CONSULTATION_ROLE_POLICY.AI_ASSIST),
  [
    body('query').notEmpty().withMessage('Query is required'),
    body('symptoms').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationService.aiAssistDoctor(
      req.user.id,
      req.params.id,
      req.body.query,
      { 
        symptoms: req.body.symptoms,
        vitals: req.body.vitals,
        vitalsHistory: req.body.vitalsHistory
      }
    );
    res.json({ success: true, data: result });
  })
);

// Generate Clinical Summary via AI (doctor only)
router.post('/:id/summarize',
  requireRole('doctor'),
  asyncHandler(async (req, res) => {
    const result = await consultationService.generateClinicalSummary(
      req.user.id,
      req.params.id,
      req.body.vitalsHistory
    );
    res.json({ success: true, data: result });
  })
);

// ── Consultation lifecycle engine (Part 8-16) ──────────────────────

// Full lifecycle view (participants + admins)
router.get('/:id/lifecycle',
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.getLifecycle({
      userId: req.user.id,
      role: req.user.role,
      consultationId: req.params.id,
    });
    res.json({ success: true, data: result });
  })
);

// Patient consent (Part 9)
router.post('/:id/consent',
  requireRole(ROLES.PATIENT),
  [
    body('consent').optional().isObject(),
    body('agreed').optional().isBoolean(),
    body('dataSharing').optional().isBoolean(),
    body('videoRecording').optional().isBoolean(),
    body('insuranceClaim').optional().isBoolean(),
    body('emergencyData').optional().isBoolean(),
    body('generalTerms').optional().isBoolean(),
    body('privacyPolicy').optional().isBoolean(),
    body('source').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.consent({
      userId: req.user.id,
      consultationId: req.params.id,
      consent: req.body.consent || req.body,
    });
    res.json({ success: true, data: result });
  })
);

// Capture a network event (participants + admins)
router.post('/:id/network',
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.captureNetworkEvent({
      consultationId: req.params.id,
      event: req.body.event,
      userId: req.user.id,
      metadata: req.body.metadata || {},
    });
    res.json({ success: true, data: result });
  })
);

// Capture a device event (participants + admins)
router.post('/:id/device',
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.captureDeviceEvent({
      consultationId: req.params.id,
      event: req.body.event,
      userId: req.user.id,
      metadata: req.body.metadata || {},
    });
    res.json({ success: true, data: result });
  })
);

// Doctor requests to end the consultation (Part 10)
router.post('/:id/end/request',
  requireRole(ROLES.DOCTOR),
  [
    body('reason').optional().isString().trim().isLength({ max: 500 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.requestEnd({
      doctorUserId: req.user.id,
      consultationId: req.params.id,
      reason: req.body.reason,
    });
    res.json({ success: true, data: result });
  })
);

// Patient responds to the end request (Part 10)
router.post('/:id/end/respond',
  requireRole(ROLES.PATIENT),
  [
    body('decision').isIn(['confirm', 'decline']),
    body('otp').optional().isString().isLength({ min: 6, max: 6 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.respondEnd({
      patientUserId: req.user.id,
      consultationId: req.params.id,
      decision: req.body.decision,
      otp: req.body.otp,
    });
    res.json({ success: true, data: result });
  })
);

// Doctor directly completes the consultation (Part 10, no request step)
router.post('/:id/end/complete',
  requireRole(ROLES.DOCTOR),
  [
    body('reason').optional().isString().trim().isLength({ max: 500 }),
    body('otp').optional().isString().isLength({ min: 6, max: 6 }),
    body('diagnosis').optional().isString().trim(),
    body('notes').optional().isString().trim(),
    body('followUpDate').optional().isString(),
    body('duration').optional().isInt({ min: 0 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.completeEnd({
      doctorUserId: req.user.id,
      consultationId: req.params.id,
      reason: req.body.reason,
      otp: req.body.otp,
      diagnosis: req.body.diagnosis,
      notes: req.body.notes,
      followUpDate: req.body.followUpDate,
      duration: req.body.duration,
    });
    res.json({ success: true, data: result });
  })
);

// Doctor force-completes the consultation (Part 12)
router.post('/:id/end/force',
  requireRole(ROLES.DOCTOR),
  [
    body('reason').optional().isString().trim().isLength({ max: 500 }),
    body('otp').optional().isString().isLength({ min: 6, max: 6 }),
    body('disputedByPatient').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.forceComplete({
      doctorUserId: req.user.id,
      consultationId: req.params.id,
      reason: req.body.reason,
      otp: req.body.otp,
      disputedByPatient: req.body.disputedByPatient === true,
    });
    res.json({ success: true, data: result });
  })
);

// Pause / resume the call (participants + admins, Part 8)
router.post('/:id/pause',
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.togglePause({
      userId: req.user.id,
      consultationId: req.params.id,
      action: 'pause',
    });
    res.json({ success: true, data: result });
  })
);

router.post('/:id/resume',
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.togglePause({
      userId: req.user.id,
      consultationId: req.params.id,
      action: 'resume',
    });
    res.json({ success: true, data: result });
  })
);

// Report participant state (joined / left / reconnecting / recovered)
router.post('/:id/state',
  [
    body('state').isIn(['joined', 'patient_left', 'doctor_left', 'reconnecting', 'recovered']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.reportParticipantState({
      userId: req.user.id,
      consultationId: req.params.id,
      state: req.body.state,
    });
    res.json({ success: true, data: result });
  })
);

// Searchable audit logs (participants + admins, Part 16)
router.get('/:id/logs',
  asyncHandler(async (req, res) => {
    const result = await consultationLifecycleService.getLogs({
      userId: req.user.id,
      role: req.user.role,
      consultationId: req.params.id,
    });
    res.json({ success: true, data: result });
  })
);

module.exports = router;
