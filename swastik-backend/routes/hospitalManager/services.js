/**
 * Hospital Services (Catalog) Routes — Rate card management
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const hospitalServicesService = require('../../services/hospitalServicesService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

router.get('/', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 50, ...filters } = req.query;
  const result = await hospitalServicesService.getServices(hospitalId, filters, parseInt(page), parseInt(limit));
  res.json({ success: true, ...result });
}));

router.post('/', ownerOrManager, requireApproval, [
  body('name').notEmpty().withMessage('Service name required'),
  body('rate').isFloat({ min: 0 }).withMessage('Valid rate required'),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const service = await hospitalServicesService.createService(hospitalId, req.body);
  res.status(201).json({ success: true, service });
}));

router.put('/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const service = await hospitalServicesService.updateService(hospitalId, req.params.id, req.body);
  res.json({ success: true, service });
}));

router.delete('/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  await hospitalServicesService.deleteService(hospitalId, req.params.id);
  res.json({ success: true });
}));

router.get('/categories', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const categories = await hospitalServicesService.getServiceCategories(hospitalId);
  res.json({ success: true, categories });
}));

module.exports = router;
