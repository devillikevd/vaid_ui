/**
 * Nursing Routes — Tasks, MAR, ward dashboard
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const nursingService = require('../../services/nursingService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

router.post('/tasks', ownerOrManager, requireApproval, [
  body('admissionId').notEmpty(),
  body('taskType').notEmpty(),
  body('taskDescription').notEmpty(),
  body('scheduledAt').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const task = await nursingService.createNursingTask(hospitalId, req.body);
  res.status(201).json({ success: true, task });
}));

router.get('/tasks', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 30, ...filters } = req.query;
  const result = await nursingService.getNursingTasks(hospitalId, filters, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.put('/tasks/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const task = await nursingService.updateTaskStatus(hospitalId, req.params.id, req.body.status, { ...req.body, completedBy: req.user.id });
  res.json({ success: true, task });
}));

// ── MAR ──

router.post('/mar', ownerOrManager, requireApproval, [
  body('admissionId').notEmpty(),
  body('drugName').notEmpty(),
  body('dose').notEmpty(),
  body('route').notEmpty(),
  body('scheduledTime').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const mar = await nursingService.addMedicationAdministration(hospitalId, req.body);
  res.status(201).json({ success: true, mar });
}));

router.put('/mar/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const mar = await nursingService.updateMedicationStatus(hospitalId, req.params.id, req.body.status, { ...req.body, administeredBy: req.user.id });
  res.json({ success: true, mar });
}));

router.get('/mar/:admissionId', ownerOrManager, requireApproval, [
  param('admissionId').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const schedule = await nursingService.getMedicationSchedule(hospitalId, req.params.admissionId, req.query.date);
  res.json({ success: true, schedule });
}));

// ── WARD DASHBOARD ──

router.get('/ward-dashboard/:wardId', ownerOrManager, requireApproval, [
  param('wardId').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const dashboard = await nursingService.getWardDashboard(hospitalId, req.params.wardId);
  res.json({ success: true, ...dashboard });
}));

module.exports = router;
