/**
 * Outbreak Detection API Routes
 *
 * Two sections:
 *   1. SHARED (any authenticated user) — read-only outbreak data, heatmap, stats
 *   2. ADMIN-ONLY — alert management, manual analysis trigger
 */

const express = require('express');
const router = express.Router();
const { param, query, body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const outbreakService = require('../services/outbreakService');

// All outbreak routes require authentication
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════
// SHARED ROUTES — accessible by doctors, hospitals, clinics, admins
// ═══════════════════════════════════════════════════════════════════

/**
 * @route GET /api/admin/outbreaks/public/alerts
 * @desc  Get active outbreak alerts (read-only) for any authenticated role
 */
router.get('/public/alerts', asyncHandler(async (req, res) => {
  const { severity, city, page = 1, limit = 20 } = req.query;
  const data = await outbreakService.getOutbreakDashboard({
    status: 'active', severity, city,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });
  res.json({ success: true, ...data });
}));

/**
 * @route GET /api/admin/outbreaks/public/heatmap
 * @desc  Get heat-map data for any authenticated role
 */
router.get('/public/heatmap', asyncHandler(async (_req, res) => {
  const data = await outbreakService.getHeatmapData();
  res.json({ success: true, data });
}));

/**
 * @route GET /api/admin/outbreaks/public/stats
 * @desc  Get health event stats for any authenticated role
 */
router.get('/public/stats', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be between 1 and 365'),
  validate,
], asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const data = await outbreakService.getHealthEventStats(days);
  res.json({ success: true, data });
}));

// ═══════════════════════════════════════════════════════════════════
// ADMIN-ONLY ROUTES — alert management, manual trigger
// ═══════════════════════════════════════════════════════════════════

/**
 * @route GET /api/admin/outbreaks
 * @desc  Get outbreak alert dashboard with filters and pagination
 */
router.get('/', requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), asyncHandler(async (req, res) => {
  const { status, severity, city, page = 1, limit = 20 } = req.query;
  const data = await outbreakService.getOutbreakDashboard({
    status, severity, city,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });
  res.json({ success: true, ...data });
}));

/**
 * @route GET /api/admin/outbreaks/heatmap
 */
router.get('/heatmap', requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), asyncHandler(async (_req, res) => {
  const data = await outbreakService.getHeatmapData();
  res.json({ success: true, data });
}));

/**
 * @route GET /api/admin/outbreaks/stats
 */
router.get('/stats', requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('days must be between 1 and 365'),
  validate,
], asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const data = await outbreakService.getHealthEventStats(days);
  res.json({ success: true, data });
}));

/**
 * @route GET /api/admin/outbreaks/:id
 */
router.get('/:id', requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), [
  param('id').isUUID().withMessage('Invalid alert ID'),
  validate,
], asyncHandler(async (req, res) => {
  const data = await outbreakService.getAlertDetails(req.params.id);
  res.json({ success: true, data });
}));

/**
 * @route PUT /api/admin/outbreaks/:id/status
 */
router.put('/:id/status', requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), [
  param('id').isUUID().withMessage('Invalid alert ID'),
  body('status').isIn(['active', 'monitoring', 'resolved', 'dismissed']).withMessage('Invalid status'),
  body('notes').optional().isString().trim(),
  validate,
], asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const data = await outbreakService.updateAlertStatus(req.params.id, status, req.user.id, notes);
  res.json({ success: true, data });
}));

/**
 * @route POST /api/admin/outbreaks/analyze
 */
router.post('/analyze', requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), asyncHandler(async (_req, res) => {
  const result = await outbreakService.runOutbreakAnalysis();
  res.json({ success: true, data: result });
}));

module.exports = router;
