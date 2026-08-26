/**
 * Lab & Radiology Routes
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const hospitalLabService = require('../../services/hospitalLabService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ── LAB ORDERS ──

router.post('/lab/orders', ownerOrManager, requireApproval, [
  body('patientId').notEmpty(),
  body('orderingDoctorId').notEmpty(),
  body('testName').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const order = await hospitalLabService.createLabOrder(hospitalId, req.body);
  res.status(201).json({ success: true, order });
}));

router.post('/lab/orders/bulk', ownerOrManager, requireApproval, [
  body('orders').isArray({ min: 1 }),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const orders = await hospitalLabService.createLabOrdersBulk(hospitalId, req.body.orders);
  res.status(201).json({ success: true, orders, count: orders.length });
}));

router.get('/lab/orders', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await hospitalLabService.getLabOrders(hospitalId, filters, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.put('/lab/orders/:id/status', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const order = await hospitalLabService.updateLabOrderStatus(hospitalId, req.params.id, req.body.status, req.body);
  res.json({ success: true, order });
}));

router.get('/lab/tat', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const stats = await hospitalLabService.getLabTurnaroundTime(hospitalId, req.query.period);
  res.json({ success: true, ...stats });
}));

// ── RADIOLOGY ORDERS ──

router.post('/radiology/orders', ownerOrManager, requireApproval, [
  body('patientId').notEmpty(),
  body('orderingDoctorId').notEmpty(),
  body('modality').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const order = await hospitalLabService.createRadiologyOrder(hospitalId, req.body);
  res.status(201).json({ success: true, order });
}));

router.get('/radiology/orders', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await hospitalLabService.getRadiologyOrders(hospitalId, filters, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.put('/radiology/orders/:id/status', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const order = await hospitalLabService.updateRadiologyOrderStatus(hospitalId, req.params.id, req.body.status, req.body);
  res.json({ success: true, order });
}));

module.exports = router;
