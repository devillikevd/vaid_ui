/**
 * OPD Queue Routes — Token generation, queue management
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const opdQueueService = require('../../services/opdQueueService');

const queueAuthorized = requireRole(
  ROLES.HOSPITAL_OWNER,
  ROLES.HOSPITAL_MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.DOCTOR
);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

router.post('/token', queueAuthorized, requireApproval, [
  body('doctorId').notEmpty().withMessage('Doctor ID required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const token = await opdQueueService.generateToken(hospitalId, req.body);
  res.status(201).json({ success: true, token });
}));

router.get('/', queueAuthorized, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { doctorId, departmentId, status, date } = req.query;
  const result = await opdQueueService.getQueue(hospitalId, { doctorId, departmentId, status, date });
  res.json({ success: true, ...result });
}));

router.post('/:id/call-next', queueAuthorized, requireApproval, [
  body('doctorId').notEmpty().withMessage('Doctor ID required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await opdQueueService.callNextPatient(hospitalId, req.body.doctorId);
  res.json({ success: true, ...result });
}));

router.put('/:id/status', queueAuthorized, requireApproval, [
  param('id').isUUID(),
  body('status').notEmpty().withMessage('Status required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const entry = await opdQueueService.updateQueueStatus(hospitalId, req.params.id, req.body.status, req.body.notes);
  res.json({ success: true, entry });
}));

router.get('/stats', queueAuthorized, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const stats = await opdQueueService.getQueueStats(hospitalId);
  res.json({ success: true, ...stats });
}));

router.get('/patient/:patientId', queueAuthorized, requireApproval, [
  param('patientId').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const position = await opdQueueService.getPatientQueuePosition(hospitalId, req.params.patientId);
  res.json({ success: true, position });
}));

module.exports = router;
