const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const reviewService = require('../../services/reviewService');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * @route POST /api/patient/reviews
 * @desc Submit a review for an entity (doctor, hospital, etc.)
 * @access Private (Patient)
 */
router.post('/',
  authenticate,
  authorize('patient'),
  [
    body('reviewableType').isIn(['doctor', 'hospital', 'clinic', 'pharmacy', 'diagnostic_center', 'wellness_coach', 'fitness_center']).withMessage('Invalid entity type'),
    body('reviewableId').isUUID().withMessage('Invalid entity ID'),
    body('consultationId').optional().isUUID().withMessage('Invalid consultation ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
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
 * @access Public / Private (Patient)
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
