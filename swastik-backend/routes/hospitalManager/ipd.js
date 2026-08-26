/**
 * IPD Routes — Admission, transfer, discharge, progress notes
 */
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const ipdService = require('../../services/ipdService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);

// Helper to get hospital ID from authenticated user
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ── ADMISSIONS ──

router.post('/admissions', ownerOrManager, requireApproval, [
  body('patientId').notEmpty().withMessage('Patient ID required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const admission = await ipdService.createAdmission(hospitalId, { ...req.body, createdBy: req.user.id });
  res.status(201).json({ success: true, admission });
}));

router.get('/admissions', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, status, departmentId, wardId, doctorId, admissionType, fromDate, toDate, search } = req.query;
  const result = await ipdService.getAdmissions(hospitalId, { status, departmentId, wardId, doctorId, admissionType, fromDate, toDate, search }, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.get('/admissions/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const admission = await ipdService.getAdmissionDetail(hospitalId, req.params.id);
  res.json({ success: true, admission });
}));

router.post('/admissions/:id/admit', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('bedId').notEmpty().withMessage('Bed ID required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await ipdService.admitPatient(hospitalId, req.params.id, req.body.bedId, req.body.wardId);
  res.json({ success: true, ...result });
}));

router.post('/admissions/:id/transfer', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('newBedId').notEmpty().withMessage('New bed ID required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const admission = await ipdService.transferBed(hospitalId, req.params.id, req.body.newBedId, req.body.reason);
  res.json({ success: true, admission });
}));

router.post('/admissions/:id/discharge', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const admission = await ipdService.dischargePatient(hospitalId, req.params.id, req.body);
  res.json({ success: true, admission });
}));

// ── PROGRESS NOTES ──

router.post('/admissions/:id/progress-notes', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const note = await ipdService.addProgressNote(req.params.id, req.body.doctorId || req.user.id, req.body);
  res.status(201).json({ success: true, note });
}));

router.get('/admissions/:id/progress-notes', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await ipdService.getProgressNotes(req.params.id, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

// ── CENSUS & DISCHARGE SUMMARY ──

router.get('/census', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const census = await ipdService.getIPDCensus(hospitalId);
  res.json({ success: true, ...census });
}));

router.get('/admissions/:id/discharge-summary', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const summary = await ipdService.getDischargeSummary(req.params.id);
  res.json({ success: true, summary });
}));

module.exports = router;
