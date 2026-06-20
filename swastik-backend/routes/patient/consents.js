const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const consentService = require('../../services/consentService');
const patientService = require('../../services/patientService');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Apply authentication to all consent routes
router.use(authenticate);

/**
 * @route   GET /api/patient/consents
 * @desc    Get all consents (active and past) for the logged in patient
 * @access  Private (Patient)
 */
router.get('/', asyncHandler(async (req, res) => {
  const patient = await patientService._getPatientByUserId(req.user.id);
  const status = req.query.status || null; // allow filtering by status, default all
  
  const consents = await consentService.getConsents(patient.id, status);
  res.json({ success: true, data: consents });
}));

/**
 * @route   POST /api/patient/consents
 * @desc    Grant consent to a third-party entity
 * @access  Private (Patient)
 */
router.post('/', validate([
  body('entityType').isIn(['hospital', 'pharmacy', 'diagnostic_center', 'doctor', 'research', 'family', 'other']).withMessage('Invalid entity type'),
  body('entityId').isUUID().withMessage('Valid entity ID is required'),
  body('entityName').notEmpty().withMessage('Entity name is required'),
  body('purpose').notEmpty().withMessage('Purpose is required'),
  body('durationDays').optional().isInt({ min: 1, max: 3650 }).withMessage('Duration must be between 1 and 3650 days')
]), asyncHandler(async (req, res) => {
  const patient = await patientService._getPatientByUserId(req.user.id);
  const { entityType, entityId, entityName, purpose, durationDays } = req.body;

  const consent = await consentService.grantConsent({
    patientId: patient.id,
    entityType,
    entityId,
    entityName,
    purpose,
    durationDays
  });

  res.status(201).json({ success: true, data: consent });
}));

/**
 * @route   POST /api/patient/consents/:id/revoke
 * @desc    Revoke an active consent
 * @access  Private (Patient)
 */
router.post('/:id/revoke', validate([
  body('reason').optional().isString()
]), asyncHandler(async (req, res) => {
  const patient = await patientService._getPatientByUserId(req.user.id);
  const { reason } = req.body;

  const consent = await consentService.revokeConsent(patient.id, req.params.id, reason);
  res.json({ success: true, data: consent, message: 'Consent revoked successfully' });
}));

module.exports = router;
