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
    body('reviewableType').isIn(['doctor', 'hospital', 'clinic', 'pharmacy', 'diagnostic_center']).withMessage('Invalid entity type'),
    body('reviewableId').isUUID().withMessage('Invalid entity ID'),
    body('consultationId').optional().isUUID().withMessage('Invalid consultation ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().isString().trim(),
    body('comment').optional().isString().trim(),
    body('isAnonymous').optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const review = await reviewService.submitReview(req.user.patientId, req.body);
    res.status(201).json({
      success: true,
      data: review,
      message: 'Review submitted successfully'
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
    param('type').isIn(['doctor', 'hospital', 'clinic', 'pharmacy', 'diagnostic_center']).withMessage('Invalid entity type'),
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
