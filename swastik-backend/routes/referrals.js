const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const universalReferralService = require('../services/universalReferralService');

// Require authentication for all routes
router.use(authenticate);

/**
 * @route POST /api/referrals
 * @desc Create a new universal referral
 */
router.post('/',
  [
    body('patient_id').isUUID().withMessage('Valid patient_id is required'),
    body('sender_type').isString().withMessage('sender_type is required'),
    body('sender_id').isUUID().withMessage('Valid sender_id is required'),
    body('receiver_type').isString().withMessage('receiver_type is required'),
    body('receiver_id').isUUID().withMessage('Valid receiver_id is required'),
    body('reason').isString().notEmpty().withMessage('reason is required'),
    body('urgency').optional().isIn(['routine', 'urgent', 'emergency']).withMessage('Invalid urgency'),
    body('clinical_summary').optional().isString(),
    body('attachments').optional().isArray()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const referral = await universalReferralService.createReferral(req.user, req.body);
    res.status(201).json({ success: true, data: referral });
  })
);

/**
 * @route GET /api/referrals/patients/search
 * @desc  Search patients the authenticated sender is authorized to refer.
 *
 * SECURITY:
 *   - sender_type and sender_id are context parameters only.
 *   - validateProviderAccess() re-validates req.user ownership before any data is returned.
 *   - A forged sender_id that does not match req.user will result in a 403.
 *   - Returns minimum fields only: id, name, phone.
 *
 * NOTE: This route MUST be declared before GET /patients/:patientId/documents
 *       to prevent Express matching 'search' as the :patientId param.
 */
router.get('/patients/search',
  [
    query('sender_type').isString().notEmpty().withMessage('sender_type is required'),
    query('sender_id').isUUID().withMessage('Valid sender_id is required'),
    query('q').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { sender_type, sender_id, q, page, limit } = req.query;
    const result = await universalReferralService.searchAuthorizedPatients(req.user, {
      senderType: sender_type,
      senderId: sender_id,
      q: q || '',
      page: page || 1,
      limit: limit || 20,
    });
    res.json({ success: true, ...result });
  })
);

/**
 * @route GET /api/referrals/patients/:patientId/documents
 * @desc  Fetch patient reports & prescriptions the authenticated sender is authorized to attach.
 *
 * SECURITY: sender_type and sender_id are context parameters only.
 *   The service layer validates that req.user owns/belongs to sender_type/sender_id,
 *   then confirms an active care relationship with the patient.
 *   Documents are returned only after all checks pass.
 */
router.get('/patients/:patientId/documents',
  [
    param('patientId').isUUID().withMessage('Valid patientId is required'),
    query('sender_type').isString().notEmpty().withMessage('sender_type is required'),
    query('sender_id').isUUID().withMessage('Valid sender_id is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { sender_type, sender_id } = req.query;
    const { patientId } = req.params;
    const documents = await universalReferralService.getPatientDocumentsForReferral(req.user, {
      patientId,
      senderType: sender_type,
      senderId: sender_id
    });
    res.json({ success: true, data: documents });
  })
);


/**
 * @route GET /api/referrals/inbox
 * @desc Get referrals received by user's active organizations
 */
router.get('/inbox',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString(),
    query('urgency').optional().isString(),
    query('sender_type').optional().isString()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await universalReferralService.getInbox(req.user, req.query);
    res.json({ success: true, ...result });
  })
);

/**
 * @route GET /api/referrals/sent
 * @desc Get referrals sent by user's active organizations
 */
router.get('/sent',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString(),
    query('urgency').optional().isString(),
    query('receiver_type').optional().isString()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await universalReferralService.getSent(req.user, req.query);
    res.json({ success: true, ...result });
  })
);

/**
 * @route GET /api/referrals/:id
 * @desc Get detailed referral information
 */
router.get('/:id',
  [
    param('id').isUUID().withMessage('Valid referral ID is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const referral = await universalReferralService.getReferralDetail(req.params.id, req.user);
    res.json({ success: true, data: referral });
  })
);

/**
 * @route PATCH /api/referrals/:id/status
 * @desc Update referral status
 */
router.patch('/:id/status',
  [
    param('id').isUUID().withMessage('Valid referral ID is required'),
    body('status').isIn(['accepted', 'rejected', 'cancelled', 'in_progress', 'completed']).withMessage('Invalid status transition')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const referral = await universalReferralService.updateReferralStatus(req.params.id, req.user, req.body);
    res.json({ success: true, data: referral });
  })
);

/**
 * @route POST /api/referrals/:id/attachments
 * @desc Add attachment to an existing referral
 */
router.post('/:id/attachments',
  [
    param('id').isUUID().withMessage('Valid referral ID is required'),
    body('report_id').optional().isUUID(),
    body('prescription_id').optional().isUUID(),
    body('storage_path').optional().isString(),
    body('document_type').optional().isString(),
    body('file_name').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const attachment = await universalReferralService.addAttachment(req.params.id, req.user, req.body);
    res.status(201).json({ success: true, data: attachment });
  })
);

module.exports = router;
