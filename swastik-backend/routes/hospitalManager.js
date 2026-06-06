/**
 * Hospital Manager Routes
 * API endpoints for hospital owners and managers
 */
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const hospitalManagerService = require('../services/hospitalManagerService');
const facilityAssociationService = require('../services/facilityAssociationService');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// Dashboard
router.get('/dashboard', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), requireApproval, asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const dashboard = await hospitalManagerService.getDashboard(hospital.id, req.user.id);
    res.json({ success: true, ...dashboard });
}));

// Profile
router.get('/profile', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    res.json({ success: true, hospital });
}));

router.put('/profile', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('name').optional().isString().trim().isLength({ min: 2, max: 200 }),
    body('phone').optional().isString().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('address').optional().isString().trim(),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('bed_capacity').optional().isInt({ min: 0 }).withMessage('Bed capacity must be a positive number'),
    body('total_beds').optional().isInt({ min: 0 }).withMessage('Total beds must be a positive number'),
    body('profile_image').optional().isString(),
    body('profile_image_url').optional().isString(),
    body('license_number').optional().isString().trim(),
    body('license_document_url').optional().isString().trim(),
    body('accreditations').optional().isArray(),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    // Whitelist allowed fields
    const allowed = ['name', 'phone', 'email', 'address', 'latitude', 'longitude', 'bed_capacity', 'total_beds', 'profile_image', 'profile_image_url', 'license_number', 'license_document_url', 'accreditations'];
    const safeUpdates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }
    if (safeUpdates.profile_image && safeUpdates.profile_image_url === undefined) {
        safeUpdates.profile_image_url = safeUpdates.profile_image;
    }
    const updated = await hospitalManagerService.updateHospital(hospital.id, req.user.id, safeUpdates);
    res.json({ success: true, hospital: updated });
}));

router.use(requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), requireApproval);

// Doctors
router.get('/doctors', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { specialization, isAvailable, search, page = 1, limit = 20 } = req.query;
    const availabilityFilter = typeof isAvailable === 'string'
        ? isAvailable === 'true'
        : undefined;

    const result = await hospitalManagerService.getDoctors(
        hospital.id,
        req.user.id,
        { specialization, isAvailable: availabilityFilter, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

router.post('/doctors/invite', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').optional().isString().trim(),
    body('name').optional().isString().trim().isLength({ min: 2, max: 100 }),
    body('specialization').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.inviteDoctor(hospital.id, req.user.id, req.body);
    res.json({ success: true, ...result });
}));

router.delete('/doctors/:doctorId', requireRole(ROLES.HOSPITAL_OWNER), [
    param('doctorId').isUUID().withMessage('Invalid doctor ID'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    await hospitalManagerService.removeDoctor(hospital.id, req.user.id, req.params.doctorId);
    res.json({ success: true });
}));

// Associated pharmacies
router.get('/pharmacies', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const data = await facilityAssociationService.getFacilityAssociations({
        facilityType: 'hospital',
        facilityId: hospital.id,
        providerType: 'pharmacy',
    });
    res.json({ success: true, data });
}));

router.post('/pharmacies/invite', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('email').isEmail().normalizeEmail().withMessage('Valid pharmacy email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await facilityAssociationService.inviteProviderForFacility({
        facilityType: 'hospital',
        facilityId: hospital.id,
        invitedBy: req.user.id,
        providerType: 'pharmacy',
        email: req.body.email,
    });

    res.json({
        success: true,
        data: result.invite,
        provider: result.provider,
        message: result.alreadyPending
            ? 'Invitation is already pending for this pharmacy.'
            : 'Invitation sent. Pharmacy must accept before it appears in your associated list.',
    });
}));

router.delete('/pharmacies/:providerId', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('providerId').isUUID().withMessage('Invalid pharmacy ID'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    await facilityAssociationService.unlinkProviderFromFacility({
        facilityType: 'hospital',
        facilityId: hospital.id,
        providerType: 'pharmacy',
        providerId: req.params.providerId,
    });
    res.json({ success: true });
}));

// Associated diagnostic centers
router.get('/diagnostic-centers', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const data = await facilityAssociationService.getFacilityAssociations({
        facilityType: 'hospital',
        facilityId: hospital.id,
        providerType: 'diagnostic_center',
    });
    res.json({ success: true, data });
}));

router.post('/diagnostic-centers/invite', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('email').isEmail().normalizeEmail().withMessage('Valid diagnostic center email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await facilityAssociationService.inviteProviderForFacility({
        facilityType: 'hospital',
        facilityId: hospital.id,
        invitedBy: req.user.id,
        providerType: 'diagnostic_center',
        email: req.body.email,
    });

    res.json({
        success: true,
        data: result.invite,
        provider: result.provider,
        message: result.alreadyPending
            ? 'Invitation is already pending for this diagnostic center.'
            : 'Invitation sent. Diagnostic center must accept before it appears in your associated list.',
    });
}));

router.delete('/diagnostic-centers/:providerId', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('providerId').isUUID().withMessage('Invalid diagnostic center ID'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    await facilityAssociationService.unlinkProviderFromFacility({
        facilityType: 'hospital',
        facilityId: hospital.id,
        providerType: 'diagnostic_center',
        providerId: req.params.providerId,
    });
    res.json({ success: true });
}));

// Departments
router.get('/departments', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.getDepartments(hospital.id, req.user.id);
    res.json({ success: true, ...result });
}));

router.post('/departments', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('name').notEmpty().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Department name is required'),
    body('description').optional().isString().trim(),
    body('headDoctorId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid head doctor'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid department status'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.addDepartment(hospital.id, req.user.id, req.body);
    res.json({ success: true, ...result });
}));

router.put('/departments/:departmentId', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('departmentId').isUUID().withMessage('Invalid department ID'),
    body('name').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Department name must be 2-100 chars'),
    body('description').optional().isString().trim(),
    body('headDoctorId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Invalid head doctor'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid department status'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.updateDepartment(hospital.id, req.user.id, req.params.departmentId, req.body);
    res.json({ success: true, ...result });
}));

router.delete('/departments/:departmentId', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('departmentId').isUUID().withMessage('Invalid department ID'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.deleteDepartment(hospital.id, req.user.id, req.params.departmentId);
    res.json({ success: true, ...result });
}));

// Appointments
router.get('/appointments', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
  const { status, doctorId, date, fromDate, toDate, search, page = 1, limit = 20 } = req.query;

  const result = await hospitalManagerService.getAppointments(
    hospital.id,
    req.user.id,
    { status, doctorId, date, fromDate, toDate, search },
    parseInt(page),
    parseInt(limit)
  );

    res.json({ success: true, ...result });
}));

// Analytics
router.get('/analytics', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { period = '30d' } = req.query;

    const analytics = await hospitalManagerService.getAnalytics(hospital.id, req.user.id, period);
    res.json({ success: true, ...analytics });
}));

// Managers
router.get('/managers', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const managers = await hospitalManagerService.getManagers(hospital.id, req.user.id);
    res.json({ success: true, managers });
}));

router.post('/managers', requireRole(ROLES.HOSPITAL_OWNER), [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('name').notEmpty().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name is required (2-100 chars)'),
    body('phone').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const manager = await hospitalManagerService.addManager(hospital.id, req.user.id, req.body);
    res.json({ success: true, manager });
}));

// Emergencies
router.get('/emergencies', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { supabaseAdmin } = require('../config/supabase');

    const { data, error } = await supabaseAdmin
        .from('emergency_requests')
        .select('*')
        .eq('destination_hospital_id', hospital.id)
        .in('status', [
            'pending', 'assigned', 'dispatched', 'en_route', 'en_route_pickup',
            'arrived', 'arrived_pickup', 'picked_up', 'patient_onboard',
            'en_route_hospital', 'arrived_hospital'
        ])
        .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
}));

// Associated Ambulances
router.get('/ambulances', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.getAffiliatedAmbulances(hospital.id, req.user.id);
    res.json({ success: true, ...result });
}));

router.post('/ambulances/invite', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.inviteAmbulance(hospital.id, req.user.id, req.body);
    res.json({ success: true, ...result });
}));

router.delete('/ambulances/:ambulanceId', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('ambulanceId').isUUID().withMessage('Invalid ambulance ID'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    await hospitalManagerService.removeAffiliatedAmbulance(hospital.id, req.user.id, req.params.ambulanceId);
    res.json({ success: true });
}));

// Consultations — view all consultations by hospital-affiliated doctors
router.get('/consultations', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await hospitalManagerService.getConsultations(req.user.id, parseInt(page), parseInt(limit), status, search);
    res.json({ success: true, ...result });
}));

// Reviews
router.get('/reviews', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { page = 1, limit = 10 } = req.query;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('hospital', hospital.id, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

module.exports = router;
