/**
 * Chatbot Routes v2
 * Upgraded with dual-provider AI (HuggingFace + Groq), structured JSON responses,
 * medical guardrails, emergency override engine, and rate limiting.
 *
 * Endpoints:
 *   POST /session/start          → Start new chat session
 *   POST /message                → Send message (text or voice type)
 *   GET  /session/:sessionId     → Get chat history
 *   GET  /sessions               → Get all user sessions
 *   POST /session/:sessionId/end → End session
 *   POST /analyze-symptoms       → Quick symptom analysis
 *   GET  /health-tips            → Get health tips by category
 *   GET  /provider-status        → AI provider health check
 */
const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const chatbotService = require('../../services/chatbotServiceV2');
const { asyncHandler } = require('../../middleware/errorHandler');
const { uploadAny, handleUpload, validateMagicBytes, ALLOWED_IMAGE_MIMES } = require('../../middleware/upload');
const { recordHealthEvent } = require('../../services/outbreakService');
const { cacheGet, cacheSet, cacheIncr, getConnectionState } = require('../../config/redis');

const aiRateLimiter = asyncHandler(async (req, res, next) => {
  if (!getConnectionState()) {
    return res.status(503).json({ success: false, message: 'Service unavailable due to high load. Please try again later.' });
  }
  const identifier = req.user?.id || req.ip;
  const key = `ratelimit:ai:${identifier}`;
  const current = await cacheIncr(key, 60);
  if (current > 10) {
    return res.status(429).json({ success: false, message: 'Too many requests to AI endpoints, please try again after a minute' });
  }
  next();
});

const router = express.Router();

// All routes require authentication
router.use(authenticate);

const detectImageMimeFromBase64 = (base64Image = '') => {
  const buffer = Buffer.from(String(base64Image).slice(0, 64), 'base64');
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
};

// Start new chat session
router.post('/session/start',
  asyncHandler(async (req, res) => {
    const result = await chatbotService.startSession(req.user.id);
    res.status(201).json({ success: true, data: result });
  })
);

// Send message (supports text + voice messageType for provider routing)
router.post('/message',
  aiRateLimiter,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('messageType')
      .optional()
      .isIn(['text', 'voice'])
      .withMessage('messageType must be "text" or "voice"'),
    body('language')
      .optional()
      .isIn(['en', 'hi'])
      .withMessage('language must be "en" or "hi"'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { sessionId, message, messageType = 'text', language = 'en' } = req.body;

    const result = await chatbotService.sendMessage(
      req.user.id,
      sessionId,
      message,
      { messageType, language }
    );

    // Fire-and-forget: record health signal for outbreak detection
    recordHealthEvent({
      source: 'chatbot', sourceId: sessionId,
      rawText: message,
      patientId: req.user.id,
    }).catch(() => {});

    res.json({ success: true, data: result });
  })
);

// Analyze image with AI (Visual Context)
router.post('/analyze-image',
  aiRateLimiter,
  uploadAny.single('image'),
  handleUpload,
  validateMagicBytes(ALLOWED_IMAGE_MIMES),
  asyncHandler(async (req, res) => {
    let base64Image, mimeType, description, sessionId;

    if (req.file) {
      // Multipart upload
      base64Image = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
      description = req.body.description || '';
      sessionId = req.body.sessionId;
    } else if (req.body.image) {
      // JSON with base64 image
      base64Image = req.body.image.replace(/^data:[^;]+;base64,/, '');
      mimeType = detectImageMimeFromBase64(base64Image);
      if (!mimeType || !ALLOWED_IMAGE_MIMES.includes(mimeType)) {
        return res.status(400).json({ success: false, message: 'Image content is not a supported JPEG, PNG, GIF, or WebP file.' });
      }
      description = req.body.description || '';
      sessionId = req.body.sessionId;
    } else {
      return res.status(400).json({ success: false, message: 'No image provided. Send an image file or base64 data.' });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    const result = await chatbotService.analyzeImage(
      req.user.id,
      sessionId,
      base64Image,
      mimeType,
      description
    );

    res.json({ success: true, data: result });
  })
);

// Get chat history
router.get('/session/:sessionId',
  asyncHandler(async (req, res) => {
    const result = await chatbotService.getChatHistory(req.user.id, req.params.sessionId);
    res.json({ success: true, data: result });
  })
);

// Get all user sessions
router.get('/sessions',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const sessions = await chatbotService.getUserSessions(req.user.id, parseInt(limit));
    res.json({ success: true, data: sessions });
  })
);

// End session
router.post('/session/:sessionId/end',
  asyncHandler(async (req, res) => {
    const result = await chatbotService.endSession(req.user.id, req.params.sessionId);
    res.json({ success: true, ...result });
  })
);

// Quick symptom analysis (uses specialized medical classification flow)
router.post('/analyze-symptoms',
  aiRateLimiter,
  [
    body('symptoms').notEmpty().withMessage('Symptoms are required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const rawSymptoms = Array.isArray(req.body.symptoms)
      ? req.body.symptoms.join(', ')
      : String(req.body.symptoms || '').trim();

    const analysis = await chatbotService.analyzeSymptoms(
      rawSymptoms,
      req.body.language || 'en'
    );

    const urgency = String(analysis?.urgency || '').toLowerCase();
    const recommendedSpecialist = analysis?.recommendedSpecialist;
    const recommendedSpecialties = recommendedSpecialist ? [recommendedSpecialist] : [];
    const immediateSteps = Array.isArray(analysis?.immediateSteps) ? analysis.immediateSteps : [];
    const warningSigns = Array.isArray(analysis?.warningSignsToWatch) ? analysis.warningSignsToWatch : [];

    const severity = urgency === 'emergency'
      ? 'critical'
      : urgency === 'urgent'
        ? 'high'
        : urgency === 'routine'
          ? 'low'
          : 'medium';

    const suggestions = [
      ...immediateSteps,
      ...warningSigns.map((sign) => `Watch for: ${sign}`),
    ];

    res.json({
      success: true,
      data: {
        possible_conditions: (analysis?.conditions || []).map((condition) => ({
          name: condition?.name || 'Possible condition',
          probability: condition?.probability || 'medium',
          description: condition?.description || null,
        })),
        severity,
        recommended_specialties: recommendedSpecialties,
        suggestions,
        seek_immediate_care: urgency === 'emergency' || urgency === 'urgent',
      },
    });

    // Fire-and-forget: record health signal for outbreak detection
    recordHealthEvent({
      source: 'chatbot',
      rawText: rawSymptoms,
      patientId: req.user.id,
    }).catch(() => {});
  })
);

// Get health tips
router.get('/health-tips',
  asyncHandler(async (req, res) => {
    const { category = 'general' } = req.query;
    const tips = chatbotService.getHealthTips(category);
    res.json({ success: true, data: tips });
  })
);

// AI provider health status (for monitoring/admin dashboard)
router.get('/provider-status',
  asyncHandler(async (req, res) => {
    const status = chatbotService.getProviderStatus();
    res.json({ success: true, data: status });
  })
);

module.exports = router;
