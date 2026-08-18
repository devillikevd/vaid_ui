const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const reviewService = require('../../services/reviewService');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * @route POST /api/patient/reviews
 * @desc Submit a review for an entity (doctor, clinic, hospital, pharmacy, diagnostic_center)
 * @access Private (Patient)
 */
router.post('/',
  authenticate,
  authorize('patient'),
  [
    body('reviewableType').isIn(['doctor', 'hospital', 'clinic', 'pharmacy', 'diagnostic_center', 'wellness_coach', 'fitness_center']).withMessage('Invalid entity type'),
    body('reviewableId').isUUID().withMessage('Invalid entity ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('sourceType').optional().isIn(['appointment', 'consultation', 'pharmacy_order', 'diagnostic_booking', 'hospital_referral']).withMessage('Invalid source type'),
    body('sourceId').optional().isUUID().withMessage('Invalid source ID'),
    body('consultationId').optional().isUUID().withMessage('Invalid consultation ID'),
    body('title').optional().isString().trim(),
    body('comment').optional().isString().trim(),
    body('isAnonymous').optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: patientRow } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patientRow) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const review = await reviewService.submitReview(patientRow.id, req.body);
    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
    });
  })
);

/**
 * @route GET /api/patient/reviews/pending
 * @desc Get list of unreviewed completed services eligible for review
 * @access Private (Patient)
 */
router.get('/pending',
  authenticate,
  authorize('patient'),
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: patientRow } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patientRow) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const pending = await reviewService.getPendingReviews(patientRow.id);
    res.json({
      success: true,
      data: pending
    });
  })
);

/**
 * @route GET /api/patient/reviews/my-reviews
 * @desc Get reviews submitted by the logged-in patient
 * @access Private (Patient)
 */
router.get('/my-reviews',
  authenticate,
  authorize('patient'),
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: patientRow } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patientRow) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('patient_id', patientRow.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: reviews || []
    });
  })
);

/**
 * @route POST /api/patient/reviews/:id/report
 * @desc Report an inappropriate review
 * @access Private
 */
router.post('/:id/report',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid review ID'),
    body('reason').isString().notEmpty().withMessage('Report reason is required'),
    body('details').optional().isString().trim()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await reviewService.reportReview(
      req.params.id,
      req.user.id,
      req.body.reason,
      req.body.details
    );
    res.json(result);
  })
);

/**
 * @route GET /api/patient/reviews/consultation/:consultationId
 * @desc Get review for a specific consultation (to support editing)
 * @access Private (Patient)
 */
router.get('/consultation/:consultationId',
  authenticate,
  authorize('patient'),
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { consultationId } = req.params;

    const { data: patientRow } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patientRow) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('patient_id', patientRow.id)
      .eq('consultation_id', consultationId)
      .maybeSingle();

    if (error) throw error;

    res.json({
      success: true,
      data: review
    });
  })
);

/**
 * @route GET /api/patient/reviews/:type/:id
 * @desc Get reviews for a specific entity
 * @access Public / Private
 */
router.get('/:type/:id',
  [
    param('type').isIn(['doctor', 'hospital', 'clinic', 'pharmacy', 'diagnostic_center', 'wellness_coach', 'fitness_center']).withMessage('Invalid entity type'),
    param('id').isUUID().withMessage('Invalid entity ID'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await reviewService.getEntityReviews(type, id, page, limit);

    res.json({
      success: true,
      ...result
    });
  })
);

module.exports = router;
