/**
 * Health Card Routes — QR-Based Portable Medical Records
 *
 * Authenticated routes (patient):
 *   POST /api/health-card/generate   — Generate/regenerate token
 *   GET  /api/health-card/status     — Check if token is active
 *   POST /api/health-card/revoke     — Revoke active token
 *
 * Public route (no auth — the token IS the authorization):
 *   GET  /api/health-card/:token     — View complete health record
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const healthCardService = require('../services/healthCardService');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// ─── Authenticated: Patient generates/manages their health card ──────

router.post('/generate', authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const result = await healthCardService.generateToken(req.user.id);
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

// ─── Public: Anyone with the token can view the health record ────────

router.get('/:token', asyncHandler(async (req, res) => {
  const accessInfo = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
  const record = await healthCardService.getHealthRecord(req.params.token, accessInfo);
  res.json({ success: true, data: record });
}));

module.exports = router;
