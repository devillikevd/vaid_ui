const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { DoctorFeedback } = require('../database/models');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Universal Platform Feedback Router
 * Allows any authenticated user (Patient, Doctor, Clinic, Hospital, Pharmacy, Diagnostics)
 * to submit platform feedback to Vaididea Admins.
 */

// POST /api/feedback - Submit platform feedback
router.post('/',
  authenticate,
  [
    body('type').isString().notEmpty().withMessage('Feedback type is required'),
    body('category').isString().notEmpty().withMessage('Feedback category is required'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').isString().notEmpty().withMessage('Description is required'),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('pageName').optional().isString(),
    body('route').optional().isString(),
    body('attachments').optional().isArray()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      type, category, title, description, rating,
      pageName, route, attachments, browser, device, os, appVersion
    } = req.body;

    const feedback = new DoctorFeedback({
      userId: req.user.id,
      userRole: req.user.role || 'user',
      userName: req.user.name || req.user.email || null,
      userEmail: req.user.email || null,
      type,
      category,
      title,
      description,
      rating,
      pageName,
      route,
      attachments: attachments || [],
      browser,
      device,
      os,
      appVersion,
      status: 'Submitted',
      priority: 'Low'
    });

    await feedback.save();
    res.status(201).json({ success: true, data: feedback, message: 'Feedback submitted successfully' });
  })
);

// GET /api/feedback/my-feedback - Get logged-in user's submitted feedback
router.get('/my-feedback',
  authenticate,
  asyncHandler(async (req, res) => {
    const feedbacks = await DoctorFeedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: feedbacks });
  })
);

module.exports = router;
