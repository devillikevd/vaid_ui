/**
 * Diet & Nutrition Tracker Routes
 *
 * POST /api/diet/analyze    — Vision AI: detect food items from image
 * POST /api/diet/calculate  — Calculate nutrition + generate advice
 * GET  /api/diet/quota      — Check remaining daily quota
 * GET  /api/diet/history    — Get meal analysis history
 */
const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const dietService = require('../services/dietService');

const router = express.Router();

// Multer config: accept image uploads in memory (max 4MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ─── Check Quota ─────────────────────────────────────────────────

router.get(
  '/quota',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const status = await dietService.getQuotaStatus(req.user.id);
    res.json({ success: true, data: status });
  })
);

// ─── Analyze Food Image (Vision AI) ─────────────────────────────

router.post(
  '/analyze',
  authenticate,
  requireRole(ROLES.PATIENT),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    // Step 1: Check quota
    const quota = await dietService.checkDietQuota(req.user.id);
    if (!quota.allowed) {
      return res.status(429).json({
        success: false,
        message: quota.message,
        data: { remaining: 0, limit: dietService.FREE_DAILY_LIMIT },
      });
    }

    // Step 2: Get image data
    let base64Image, mimeType;

    if (req.file) {
      // Image uploaded as multipart form
      base64Image = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.image) {
      // Image sent as base64 in JSON body
      base64Image = req.body.image;
      mimeType = req.body.mime_type || 'image/jpeg';
    } else {
      return res.status(400).json({
        success: false,
        message: 'No image provided. Send as multipart file or base64.',
      });
    }

    // Step 3: Forward to AI Service
    const authToken = req.headers.authorization?.split(' ')[1];
    const result = await dietService.analyzeFood(base64Image, mimeType, authToken);

    res.json({
      success: true,
      data: {
        ...result.data,
        quota: { remaining: quota.remaining, limit: dietService.FREE_DAILY_LIMIT },
      },
    });
  })
);

// ─── Calculate Nutrition ─────────────────────────────────────────

router.post(
  '/calculate',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const { items, additional_notes, medical_conditions, language } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one food item.',
      });
    }

    const authToken = req.headers.authorization?.split(' ')[1];
    const result = await dietService.calculateNutrition(
      items,
      additional_notes,
      medical_conditions,
      language,
      authToken
    );

    res.json({
      success: true,
      data: result.data,
    });
  })
);

// ─── Meal History ────────────────────────────────────────────────

router.get(
  '/history',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const history = await dietService.getMealHistory(req.user.id, limit);

    res.json({
      success: true,
      data: history,
    });
  })
);

module.exports = router;
