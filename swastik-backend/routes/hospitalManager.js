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
const organizationPartnershipService = require('../services/organizationPartnershipService');
const referralService = require('../services/referralService');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticate);

// My Staff Role & Permissions Context
router.get('/my-role', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const staffContext = await hospitalManagerService.getStaffContext(req.user.id);
    res.json({ success: true, ...staffContext });
}));

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
    body('email').optional().isEmail().toLowerCase(),
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
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('opening_hours').optional().isString().trim(),
    body('facilities').optional().isArray(),
    body('website_url').optional().isString().trim(),
    body('established_year').optional().isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid established year'),
    body('insurance_accepted').optional().isArray(),
    body('gallery_urls').optional().isArray(),
    body('beds_available').optional().isInt({ min: 0 }).withMessage('Available beds must be a positive number'),
    body('virtual_tour_url').optional().isString().trim(),
    body('floor_guide').optional().isObject(),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    // Whitelist allowed fields
    const allowed = ['name', 'phone', 'email', 'address', 'latitude', 'longitude', 'bed_capacity', 'total_beds', 'profile_image', 'profile_image_url', 'license_number', 'license_document_url', 'accreditations',
        'description', 'opening_hours', 'facilities', 'website_url', 'established_year', 'insurance_accepted', 'gallery_urls', 'beds_available', 'virtual_tour_url', 'floor_guide'];
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

// Update ER Wait Time
router.put('/er-wait-time', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('waitMinutes').isInt({ min: 0, max: 600 }).withMessage('Wait time must be between 0 and 600 minutes'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin
        .from('hospitals')
        .update({
            er_wait_time_minutes: req.body.waitMinutes,
            er_last_updated_at: new Date().toISOString(),
        })
        .eq('id', hospital.id)
        .select('id, er_wait_time_minutes, er_last_updated_at')
        .single();
    if (error) throw error;
    res.json({ success: true, data });
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
    body('email').optional().isEmail().toLowerCase().withMessage('Valid email is required'),
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

// ── Doctor Join Requests (Doctor Initiated) ──

router.get('/join-requests', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { status, page = 1, limit = 20 } = req.query;
    const result = await hospitalManagerService.getHospitalJoinRequests(hospital.id, req.user.id, parseInt(page), parseInt(limit), status);
    res.json({ success: true, ...result });
}));

router.post('/join-requests/:requestId/respond', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('requestId').isUUID().withMessage('Invalid request ID'),
    body('decision').isIn(['accept', 'reject']).withMessage('Decision must be accept or reject'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.respondToJoinRequest(hospital.id, req.user.id, req.params.requestId, req.body.decision, req.body.message);
    res.json({ success: true, ...result });
}));

// ── Platform Invites (Unknown Emails) ──

router.post('/platform-invite', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('email').isEmail().withMessage('Valid email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const platformInviteService = require('../services/platformInviteService');
    const result = await platformInviteService.sendPlatformInvite(
        req.user.id,
        req.body.email,
        'hospital',
        hospital.id,
        req.body.message
    );
    res.json({ success: true, ...result });
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
    body('email').isEmail().toLowerCase().withMessage('Valid pharmacy email is required'),
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
    body('email').isEmail().toLowerCase().withMessage('Valid diagnostic center email is required'),
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

// ==========================================
// UNIFIED ORGANIZATION PARTNERSHIPS (PHASE 1)
// ==========================================

router.get('/partnerships', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { status } = req.query;
    
    const partnerships = await organizationPartnershipService.getPartnerships({
        orgType: 'hospital',
        orgId: hospital.id,
        status
    });
    
    res.json({ success: true, data: partnerships });
}));

router.post('/partnerships/invite', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('targetType').isIn(['clinic', 'pharmacy', 'diagnostic_center']).withMessage('Invalid target type'),
    body('targetId').isUUID().withMessage('Valid target ID required'),
    body('partnershipType').optional().isString(),
    body('metadata').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    
    const request = await organizationPartnershipService.createPartnershipRequest({
        initiatorType: 'hospital',
        initiatorId: hospital.id,
        initiatorUserId: req.user.id,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        partnershipType: req.body.partnershipType,
        metadata: req.body.metadata || {}
    });
    
    res.status(201).json({ success: true, data: request, message: 'Partnership invitation sent successfully.' });
}));

router.post('/partnerships/:id/respond', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject'),
    validate
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const updated = await organizationPartnershipService.respondToPartnershipRequest(
        req.params.id, 'hospital', hospital.id, req.body.action
    );
    res.json({ success: true, data: updated, message: `Partnership ${req.body.action}ed successfully.` });
}));

router.post('/partnerships/:id/request-changes', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('message').isString().notEmpty().withMessage('Changes message is required'),
    body('metadataUpdates').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const updated = await organizationPartnershipService.requestChanges(
        req.params.id, 'hospital', hospital.id, req.body.message, req.body.metadataUpdates || {}
    );
    res.json({ success: true, data: updated, message: 'Changes requested successfully.' });
}));

router.post('/partnerships/:id/accept-changes', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const updated = await organizationPartnershipService.acceptChanges(req.params.id, 'hospital', hospital.id);
    res.json({ success: true, data: updated, message: 'Changes accepted successfully.' });
}));

router.delete('/partnerships/:id', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const updated = await organizationPartnershipService.terminatePartnership(req.params.id, 'hospital', hospital.id);
    res.json({ success: true, data: updated, message: 'Partnership terminated successfully.' });
}));

// --- Phase 3: Incoming Referrals ---

router.get('/partnerships/referrals', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const statusFilters = req.query.status ? req.query.status.split(',') : null;
    const referrals = await referralService.getHospitalReferrals(req.user.id, hospital.id, statusFilters);
    res.json({ success: true, data: referrals });
}));

router.put('/partnerships/referrals/:id/status', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('id').isUUID(),
    body('status').isIn(['accepted', 'rejected', 'admission_pending', 'admitted', 'discharged']),
    validate
], asyncHandler(async (req, res) => {
    const referral = await referralService.updateReferralStatus(
        req.user.id, 
        req.params.id, 
        req.body.status, 
        req.body // pass extraData like rejection_reason or discharge_summary
    );
    res.json({ success: true, data: referral });
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

router.post('/managers', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('email').isEmail().toLowerCase().withMessage('Valid email is required'),
    body('name').notEmpty().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name is required (2-100 chars)'),
    body('phone').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const manager = await hospitalManagerService.addManager(hospital.id, req.user.id, req.body);
    res.json({ success: true, manager });
}));

router.patch('/managers/:id', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const updated = await hospitalManagerService.updateManager(hospital.id, req.user.id, req.params.id, req.body);
    res.json({ success: true, manager: updated });
}));

router.patch('/managers/:id/password', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.resetStaffPassword(hospital.id, req.user.id, req.params.id, req.body.password);
    res.json(result);
}));

router.delete('/managers/:id', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const result = await hospitalManagerService.removeManager(hospital.id, req.user.id, req.params.id);
    res.json(result);
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
    body('email').isEmail().toLowerCase().withMessage('Valid email is required'),
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

// Respond to Hospital Review
router.post('/reviews/:id/respond', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('id').isUUID().withMessage('Invalid review ID'),
    body('response').isString().notEmpty().withMessage('Response message is required'),
    validate
], asyncHandler(async (req, res) => {
    const reviewService = require('../services/reviewService');
    const updated = await reviewService.respondToReview(req.params.id, req.user.id, req.body.response);
    res.json({ success: true, data: updated, message: 'Response posted successfully' });
}));

// Get Affiliated Doctor Reviews (Read-only view, does NOT affect hospital rating)
router.get('/doctor-reviews', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const { page = 1, limit = 20 } = req.query;
    const { supabaseAdmin } = require('../config/supabase');
    
    // Find doctors affiliated with this hospital
    const { data: affiliations } = await supabaseAdmin
        .from('facility_provider_associations')
        .select('provider_id')
        .eq('facility_id', hospital.id)
        .eq('facility_type', 'hospital')
        .eq('provider_type', 'doctor')
        .eq('status', 'active');
    
    const doctorIds = (affiliations || []).map(a => a.provider_id);
    
    if (doctorIds.length === 0) {
        return res.json({
            success: true,
            data: [],
            metrics: { totalReviews: 0, averageRating: 0, verifiedReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
        });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data: reviews, count, error } = await supabaseAdmin
        .from('reviews')
        .select('*, doctor:doctors(id, name, specialization, profile_image_url), patient:patients(id, name, profile_image_url)', { count: 'exact' })
        .eq('reviewable_type', 'doctor')
        .in('reviewable_id', doctorIds)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const formatted = (reviews || []).map(r => {
        const review = { ...r };
        if (review.is_anonymous) {
            review.patient = { name: 'Anonymous', profile_image_url: null };
        }
        if (review.title && (review.title.startsWith('SRC:') || review.title.startsWith('AID:'))) {
            review.title = null;
        }
        return review;
    });

    res.json({
        success: true,
        data: formatted,
        pagination: {
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
    });
}));

// Reels (Hospital Videos)
router.post('/reels', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    body('video_url').isString().trim().notEmpty().withMessage('Video URL is required'),
    body('thumbnail_url').optional().isString().trim(),
    body('title').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    const reel = await hospitalManagerService.addReel(hospital.id, req.user.id, req.body);
    res.json({ success: true, reel });
}));

router.delete('/reels/:reelId', requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER), [
    param('reelId').isUUID().withMessage('Invalid reel ID'),
    validate,
], asyncHandler(async (req, res) => {
    const hospital = await hospitalManagerService.getHospitalByOwner(req.user.id);
    await hospitalManagerService.deleteReel(hospital.id, req.user.id, req.params.reelId);
    res.json({ success: true });
}));

// ══════════════════════════════════════════════════════════════
// HIS Sub-Routers (Hospital Information System modules)
// ══════════════════════════════════════════════════════════════
const ipdRoutes = require('./hospitalManager/ipd');
const bedRoutes = require('./hospitalManager/beds');
const queueRoutes = require('./hospitalManager/queue');
const labRoutes = require('./hospitalManager/lab');
const otRoutes = require('./hospitalManager/ot');
const nursingRoutes = require('./hospitalManager/nursing');
const servicesRoutes = require('./hospitalManager/services');
const encounterRoutes = require('./hospitalManager/encounters');
const controlTowerRoutes = require('./hospitalManager/controlTower');
const billingRoutes = require('./hospitalManager/billing');
const billingPhase4Routes = require('./hospitalManager/billingPhase4');
const qualityRoutes = require('./hospitalManager/quality');
const inhousePharmacyRoutes = require('./hospitalManager/inhousePharmacy');

router.use('/ipd', ipdRoutes);
router.use('/', bedRoutes);                   // /wards, /beds — flat under hospital-manager
router.use('/queue', queueRoutes);
router.use('/', labRoutes);                   // /lab/orders, /radiology/orders
router.use('/ot', otRoutes);
router.use('/nursing', nursingRoutes);
router.use('/services', servicesRoutes);
router.use('/encounters', encounterRoutes);
router.use('/control-tower', controlTowerRoutes);
router.use('/', billingRoutes);               // /deposits, /insurance/preauth
router.use('/billing', billingPhase4Routes);   // /billing/charges, /billing/invoices, /billing/tpa-claims, /billing/revenue, /billing/tally
router.use('/', qualityRoutes);               // /incidents, /quality-indicators
router.use('/inhouse-pharmacy', inhousePharmacyRoutes);

module.exports = router;
