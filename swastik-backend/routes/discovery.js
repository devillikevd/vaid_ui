const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const organizationDiscoveryService = require('../services/organizationDiscoveryService');

/**
 * @route GET /api/discovery/organizations
 * @desc Discover registered healthcare organizations (hospitals, diagnostic labs, pharmacies, clinics)
 * @access Authenticated / Semi-public
 */
router.get('/organizations', optionalAuth, asyncHandler(async (req, res) => {
  const { type = 'hospital', query, search, q, name, page = 1, limit = 50 } = req.query;
  const rawSearch = (query !== undefined ? query : search !== undefined ? search : q !== undefined ? q : name || '');
  const results = await organizationDiscoveryService.discoverOrganizations(req.user, {
    type,
    query: String(rawSearch),
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50
  });

  res.json({
    success: true,
    data: results
  });
}));

/**
 * @route GET /api/discovery/organizations/:orgType/:orgId
 * @desc Get detailed profile and relationship status for a specific organization
 */
router.get('/organizations/:orgType/:orgId', optionalAuth, asyncHandler(async (req, res) => {
  const { orgType, orgId } = req.params;
  const result = await organizationDiscoveryService.getOrganizationDetails(req.user, {
    orgType,
    orgId
  });

  res.json({
    success: true,
    data: result
  });
}));

module.exports = router;
