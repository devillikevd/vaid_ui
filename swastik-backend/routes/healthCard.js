/**
 * Health Card Routes — QR-Based Portable Medical Records
 *
 * Authenticated routes (patient):
 *   POST /api/health-card/generate   — Generate/regenerate token
 *   GET  /api/health-card/status     — Check if token is active
 *   POST /api/health-card/revoke     — Revoke active token
 *
 * Public route (no auth — the token IS the authorization):
 *   GET  /api/health-card/:token     — View portable clinical summary
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const healthCardService = require('../services/healthCardService');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Rate limit for public health card endpoint (prevents token brute-force)
const healthCardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
});

// ─── Authenticated: Patient generates/manages their health card ──────

router.post('/generate', authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const { guardian_analytics } = req.body;
    let parsedAnalytics = null;
    if (guardian_analytics) {
      try {
        parsedAnalytics = typeof guardian_analytics === 'string' ? JSON.parse(guardian_analytics) : guardian_analytics;
      } catch (err) {
        // invalid JSON, ignore or log
        console.warn('Invalid guardian_analytics JSON provided');
      }
    }
    const result = await healthCardService.generateToken(req.user.id, parsedAnalytics);
    res.json({ success: true, data: result });
  })
);

router.get('/status', authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const result = await healthCardService.getTokenStatus(req.user.id);
    res.json({ success: true, data: result });
  })
);

router.post('/revoke', authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const result = await healthCardService.revokeToken(req.user.id);
    res.json({ success: true, data: result });
  })
);

// ─── Public/Authorized: Health Card access ─────
// Public route (rate-limited): The 16-char cryptographically secure token IS the authorization.
router.get('/:token', healthCardLimiter, optionalAuth, asyncHandler(async (req, res) => {
  res.set({
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  });

  // Validate token format before querying cache/DB
  // Token length: 6-16 alphanumeric characters
  const tokenRegex = /^[A-Za-z0-9]{6,16}$/;
  if (!tokenRegex.test(req.params.token)) {
    return res.status(400).json({ success: false, message: 'Invalid health card token format' });
  }

  const accessInfo = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    accessorUserId: req.user?.id || 'anonymous',
    accessorRole: req.user?.role || 'public',
  };
  const record = await healthCardService.getHealthRecord(req.params.token, accessInfo);
  res.json({ success: true, data: record });
}));

module.exports = router;
