/**
 * OT (Operation Theater) Routes
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const otService = require('../../services/otService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ── OT ROOMS ──

router.get('/rooms', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const rooms = await otService.getOtRooms(hospitalId);
  res.json({ success: true, rooms });
}));

router.post('/rooms', ownerOrManager, requireApproval, [
  body('name').notEmpty().withMessage('Room name required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const room = await otService.createOtRoom(hospitalId, req.body);
  res.status(201).json({ success: true, room });
}));

router.put('/rooms/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const room = await otService.updateOtRoom(hospitalId, req.params.id, req.body);
  res.json({ success: true, room });
}));

// ── OT SCHEDULES ──

router.post('/schedules', ownerOrManager, requireApproval, [
  body('otRoomId').notEmpty(),
  body('patientId').notEmpty(),
  body('primarySurgeonId').notEmpty(),
  body('surgeryName').notEmpty(),
  body('scheduledStart').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const schedule = await otService.scheduleOt(hospitalId, req.body);
  res.status(201).json({ success: true, schedule });
}));

router.get('/schedules', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await otService.getOtSchedules(hospitalId, filters, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.put('/schedules/:id/status', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const schedule = await otService.updateOtStatus(hospitalId, req.params.id, req.body.status, req.body);
  res.json({ success: true, schedule });
}));

router.post('/schedules/:id/checklist', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('checklistType').notEmpty(),
  body('items').isArray(),
  validate,
], asyncHandler(async (req, res) => {
  const checklist = await otService.addOtChecklist(req.params.id, { ...req.body, completedBy: req.user.id });
  res.status(201).json({ success: true, checklist });
}));

router.get('/availability', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const availability = await otService.getOtAvailability(hospitalId, date);
  res.json({ success: true, availability });
}));

module.exports = router;
