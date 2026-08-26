/**
 * Control Tower Routes — NeoSoft-style KPI dashboard
 */
const express = require('express');
const router = express.Router();
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const controlTowerService = require('../../services/controlTowerService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

router.get('/', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const data = await controlTowerService.getControlTowerData(hospitalId, req.query.period);
  res.json({ success: true, ...data });
}));

router.get('/revenue', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const now = new Date();
  const fromDate = req.query.fromDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const toDate = req.query.toDate || now.toISOString();
  const data = await controlTowerService.getRevenueBreakdown(hospitalId, fromDate, toDate);
  res.json({ success: true, ...data });
}));

router.get('/occupancy', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const data = await controlTowerService.getOccupancyDrilldown(hospitalId);
  res.json({ success: true, wards: data });
}));

module.exports = router;
