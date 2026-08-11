/**
 * Feature Toggle Routes
 * Doctor-level AI feature control during consultations.
 */
const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const featureToggleService = require('../services/featureToggleService');

const router = express.Router();
// M010: read AND write paths require an authenticated doctor. `requireRole`
// also rejects admin/super_admin here (feature toggles are doctor-scoped).
router.use(authenticate);
router.use(requireRole(ROLES.DOCTOR));

// Get feature toggles for the authenticated doctor
router.get('/',
  asyncHandler(async (req, res) => {
    const toggles = await featureToggleService.getToggles(req.user.id);
    res.json({ success: true, data: toggles });
  })
);

// Update feature toggles
router.put('/',
  [
    body('toggles').isObject().withMessage('toggles must be an object'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const updated = await featureToggleService.updateToggles(req.user.id, req.body.toggles);
    res.json({ success: true, data: updated });
  })
);

// Reset feature toggles to defaults
router.post('/reset',
  asyncHandler(async (req, res) => {
    const defaults = await featureToggleService.resetToggles(req.user.id);
    res.json({ success: true, data: defaults });
  })
);

// Check individual feature status
router.get('/:feature',
  asyncHandler(async (req, res) => {
    const enabled = await featureToggleService.isFeatureEnabled(req.user.id, req.params.feature);
    res.json({ success: true, data: { feature: req.params.feature, enabled } });
  })
);

module.exports = router;
