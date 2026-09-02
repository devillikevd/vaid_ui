/**
 * Encounter Routes — Unified patient visit management
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const hospitalEncounterService = require('../../services/hospitalEncounterService');

const encounterAuthorized = requireRole(
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

router.post('/', encounterAuthorized, requireApproval, [
  body('patientId').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const encounter = await hospitalEncounterService.createEncounter(hospitalId, req.body);
  res.status(201).json({ success: true, encounter });
}));

router.get('/stats', encounterAuthorized, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const stats = await hospitalEncounterService.getEncounterStats(hospitalId);
  res.json({ success: true, ...stats });
}));

router.get('/', encounterAuthorized, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await hospitalEncounterService.getEncounters(hospitalId, filters, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.get('/:id', encounterAuthorized, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const encounter = await hospitalEncounterService.getEncounterDetail(hospitalId, req.params.id);
  res.json({ success: true, encounter });
}));

router.put('/:id', encounterAuthorized, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const encounter = await hospitalEncounterService.updateEncounter(hospitalId, req.params.id, req.body);
  res.json({ success: true, encounter });
}));

router.post('/:id/services', encounterAuthorized, requireApproval, [
  param('id').isUUID(),
  body('serviceName').notEmpty(),
  body('rate').isFloat({ min: 0 }),
  validate,
], asyncHandler(async (req, res) => {
  const service = await hospitalEncounterService.addEncounterService(req.params.id, req.body);
  res.status(201).json({ success: true, service });
}));

router.get('/:id/bill', encounterAuthorized, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const bill = await hospitalEncounterService.getEncounterBill(hospitalId, req.params.id);
  res.json({ success: true, bill });
}));

router.get('/patient/:patientId', encounterAuthorized, requireApproval, [
  param('patientId').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20 } = req.query;
  const result = await hospitalEncounterService.getPatientEncounterHistory(hospitalId, req.params.patientId, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

module.exports = router;
