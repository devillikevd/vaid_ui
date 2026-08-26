/**
 * Bed & Ward Routes
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const bedService = require('../../services/bedService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ── WARDS ──

router.get('/wards', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const wards = await bedService.getWards(hospitalId, req.query);
  res.json({ success: true, wards });
}));

router.post('/wards', ownerOrManager, requireApproval, [
  body('name').notEmpty().withMessage('Ward name required'),
  body('ward_type').optional().isString(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const ward = await bedService.createWard(hospitalId, req.body);
  res.status(201).json({ success: true, ward });
}));

router.put('/wards/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const ward = await bedService.updateWard(hospitalId, req.params.id, req.body);
  res.json({ success: true, ward });
}));

router.delete('/wards/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  await bedService.deleteWard(hospitalId, req.params.id);
  res.json({ success: true });
}));

// ── BEDS ──

router.get('/beds', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 50, wardId, status, bedType, isActive } = req.query;
  const result = await bedService.getBeds(hospitalId, { wardId, status, bedType, isActive: isActive !== undefined ? isActive === 'true' : undefined }, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.post('/beds', ownerOrManager, requireApproval, [
  body('wardId').notEmpty().withMessage('Ward ID required'),
  body('bedNumber').notEmpty().withMessage('Bed number required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const bed = await bedService.createBed(hospitalId, req.body);
  res.status(201).json({ success: true, bed });
}));

router.post('/beds/bulk', ownerOrManager, requireApproval, [
  body('wardId').notEmpty(),
  body('prefix').notEmpty(),
  body('startNumber').isInt({ min: 1 }),
  body('count').isInt({ min: 1, max: 100 }),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const beds = await bedService.createBedsBulk(hospitalId, req.body.wardId, req.body.prefix, req.body.startNumber, req.body.count, req.body.bedType);
  res.status(201).json({ success: true, beds, count: beds.length });
}));

router.put('/beds/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const bed = await bedService.updateBed(hospitalId, req.params.id, req.body);
  res.json({ success: true, bed });
}));

router.put('/beds/:id/status', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty().withMessage('Status required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const bed = await bedService.updateBedStatus(hospitalId, req.params.id, req.body.status, req.body);
  res.json({ success: true, bed });
}));

// ── OCCUPANCY ──

router.get('/beds/occupancy', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const occupancy = await bedService.getBedOccupancy(hospitalId);
  res.json({ success: true, ...occupancy });
}));

router.get('/beds/available', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const beds = await bedService.getAvailableBeds(hospitalId, req.query.wardType);
  res.json({ success: true, beds });
}));

module.exports = router;
