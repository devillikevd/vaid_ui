/**
 * In-House Hospital Pharmacy Routes
 * Medicine stock inventory, prescription dispensing, and auto-billing
 */
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const hospitalPharmacyService = require('../../services/hospitalPharmacyService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ── KPIs ──
router.get('/kpis', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const kpis = await hospitalPharmacyService.getPharmacyKpis(hospitalId, req.query.date);
  res.json({ success: true, ...kpis });
}));

// ── Inventory Management ──
router.get('/inventory', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await hospitalPharmacyService.getInventory(hospitalId, filters, parseInt(page, 10), parseInt(limit, 10));
  res.json({ success: true, ...result });
}));

router.post('/inventory', ownerOrManager, requireApproval, [
  body('medicineName').notEmpty().withMessage('Medicine name is required'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Valid selling price is required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const item = await hospitalPharmacyService.addOrUpdateInventory(hospitalId, req.body);
  res.status(201).json({ success: true, item });
}));

router.put('/inventory/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const item = await hospitalPharmacyService.addOrUpdateInventory(hospitalId, { ...req.body, id: req.params.id });
  res.json({ success: true, item });
}));

// ── Pending Prescriptions ──
router.get('/pending-prescriptions', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await hospitalPharmacyService.getPendingPrescriptions(hospitalId);
  res.json({ success: true, ...result });
}));

// ── Dispense Medicines ──
router.post('/dispense', ownerOrManager, requireApproval, [
  body('patientId').isUUID().withMessage('Valid patient ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const dispensation = await hospitalPharmacyService.dispenseMedicines(hospitalId, req.user.id, req.body);
  res.status(201).json({ success: true, dispensation });
}));

// ── Dispensations History ──
router.get('/dispensations', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, ...filters } = req.query;
  const result = await hospitalPharmacyService.getDispensations(hospitalId, filters, parseInt(page, 10), parseInt(limit, 10));
  res.json({ success: true, ...result });
}));

module.exports = router;
