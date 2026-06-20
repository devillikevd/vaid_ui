const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const consultationService = require('../../services/consultationService');
const { asyncHandler } = require('../../middleware/errorHandler');
const { recordHealthEvent } = require('../../services/outbreakService');
const { CONSULTATION_ROLE_POLICY } = require('../../config/accessPolicy');
const { requireRole } = require('../../middleware/rbac');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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
      req.params.id,
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
      { symptoms: req.body.symptoms }
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
      req.params.id
    );
    res.json({ success: true, data: result });
  })
);

module.exports = router;
