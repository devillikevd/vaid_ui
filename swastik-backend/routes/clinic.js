/**
 * Clinic Routes
 * API endpoints for clinic operations
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const clinicService = require('../services/clinicService');
const facilityAssociationService = require('../services/facilityAssociationService');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');

// Public routes
router.get('/search', asyncHandler(async (req, res) => {
    const { city, specialization, search, page = 1, limit = 20 } = req.query;

    const result = await clinicService.searchClinics(
        { city, specialization, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

router.get('/nearby', asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 10, specialization } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location required' });
    }

    const clinics = await clinicService.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius),
        specialization
    );

    res.json({ success: true, data: clinics });
}));

router.get('/:id', asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicById(req.params.id);
    res.json({ success: true, data: clinic });
}));

// Get reviews (public)
router.get('/:id/reviews', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('clinic', req.params.id, page, limit);
    res.json({ success: true, ...result });
}));

// Add review (authenticated)
router.post('/:id/reviews',
    authenticate,
    [
        body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
        body('comment').optional().isString(),
    ],
    validate,
    asyncHandler(async (req, res) => {
        const { supabaseAdmin } = require('../config/supabase');
        const { data: patient } = await supabaseAdmin.from('patients')
            .select('id')
            .eq('user_id', req.user.id)
            .single();

        if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

        const reviewService = require('../services/reviewService');
        const reviewData = {
            reviewableType: 'clinic',
            reviewableId: req.params.id,
            rating: req.body.rating,
            comment: req.body.comment
        };

        const review = await reviewService.submitReview(patient.id, reviewData);
        res.status(201).json({ success: true, data: review });
    })
);

// Protected routes
router.use(authenticate);

// Register clinic (C9 Fix: restrict to clinic_owner role)
router.post('/register', requireRole(ROLES.CLINIC_OWNER), [
    body('name').trim().notEmpty().withMessage('Clinic name is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
    ...require('../middleware/clinicValidator').validateClinicRegistration,
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.registerClinic(req.user.id, req.body);
    res.status(201).json({ success: true, data: clinic });
}));

// Clinic owner routes
router.get('/owner/dashboard', requireRole(ROLES.CLINIC_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const dashboard = await clinicService.getDashboard(clinic.id, req.user.id);
    res.json({ success: true, ...dashboard });
}));

router.get('/owner/profile', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    res.json({ success: true, data: clinic });
}));

router.put('/owner/profile', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    // Whitelist allowed fields to prevent arbitrary column writes
    const allowed = [
        'name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
        'latitude', 'longitude', 'specializations', 'facilities', 'description',
        'opening_hours', 'is_24_hours', 'profile_image_url', 'image_url', 'profile_image',
        'registration_number', 'license_number', 'license_document_url',
        'website_url', 'established_year', 'insurance_accepted', 'virtual_tour_url',
        'gallery_urls', 'accreditations', 'images'
    ];
    const safeUpdates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }
    const updated = await clinicService.updateClinic(clinic.id, req.user.id, safeUpdates);
    res.json({ success: true, data: updated });
}));

router.use('/owner', requireRole(ROLES.CLINIC_OWNER), requireApproval);

// Doctors
router.get('/owner/doctors', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { page = 1, limit = 20, search } = req.query;

    const result = await clinicService.getDoctors(clinic.id, req.user.id, parseInt(page), parseInt(limit), search);
    res.json({ success: true, ...result });
}));

// Add doctor by ID (path param) or by email (body)
router.post('/owner/doctors/:doctorId?', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);

    let doctorId = req.params.doctorId;

    // If no doctorId in path, try to resolve from email in request body
    if (!doctorId && req.body.email) {
        const { supabaseAdmin } = require('../config/supabase');
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', req.body.email)
            .eq('role', 'doctor')
            .single();
        if (!user) {
            return res.status(404).json({ success: false, message: 'Doctor with this email not found' });
        }
        // Find doctor record by user_id
        const { data: doctor } = await supabaseAdmin
            .from('doctors')
            .select('id')
            .eq('user_id', user.id)
            .single();
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor profile not found for this email' });
        }
        doctorId = doctor.id;
    }

    if (!doctorId) {
        return res.status(400).json({ success: false, message: 'Doctor ID or email is required' });
    }

    const invite = await clinicService.addDoctor(clinic.id, req.user.id, doctorId);
    res.json({ success: true, data: invite, message: 'Invitation sent. Doctor must accept before appearing in your clinic roster.' });
}));

router.delete('/owner/doctors/:doctorId', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    await clinicService.removeDoctor(clinic.id, req.user.id, req.params.doctorId);
    res.json({ success: true });
}));

router.get('/owner/pharmacies', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const data = await facilityAssociationService.getFacilityAssociations({
        facilityType: 'clinic',
        facilityId: clinic.id,
        providerType: 'pharmacy',
    });
    res.json({ success: true, data });
}));

router.post('/owner/pharmacies/invite', requireRole(ROLES.CLINIC_OWNER), [
    body('email').isEmail().toLowerCase().withMessage('Valid pharmacy email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const result = await facilityAssociationService.inviteProviderForFacility({
        facilityType: 'clinic',
        facilityId: clinic.id,
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

router.delete('/owner/pharmacies/:providerId', requireRole(ROLES.CLINIC_OWNER), [
    param('providerId').isUUID().withMessage('Invalid pharmacy ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    await facilityAssociationService.unlinkProviderFromFacility({
        facilityType: 'clinic',
        facilityId: clinic.id,
        providerType: 'pharmacy',
        providerId: req.params.providerId,
    });
    res.json({ success: true });
}));

router.get('/owner/diagnostic-centers', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const data = await facilityAssociationService.getFacilityAssociations({
        facilityType: 'clinic',
        facilityId: clinic.id,
        providerType: 'diagnostic_center',
    });
    res.json({ success: true, data });
}));

router.post('/owner/diagnostic-centers/invite', requireRole(ROLES.CLINIC_OWNER), [
    body('email').isEmail().toLowerCase().withMessage('Valid diagnostic center email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const result = await facilityAssociationService.inviteProviderForFacility({
        facilityType: 'clinic',
        facilityId: clinic.id,
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

router.delete('/owner/diagnostic-centers/:providerId', requireRole(ROLES.CLINIC_OWNER), [
    param('providerId').isUUID().withMessage('Invalid diagnostic center ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    await facilityAssociationService.unlinkProviderFromFacility({
        facilityType: 'clinic',
        facilityId: clinic.id,
        providerType: 'diagnostic_center',
        providerId: req.params.providerId,
    });
    res.json({ success: true });
}));

// Appointments
router.get('/owner/appointments', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { status, date, search, page = 1, limit = 20 } = req.query;

    const result = await clinicService.getAppointments(
        clinic.id,
        req.user.id,
        { status, date, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Consultations — view all consultations by clinic-affiliated doctors
router.get('/owner/consultations', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await clinicService.getConsultations(req.user.id, parseInt(page), parseInt(limit), status, search);
    res.json({ success: true, ...result });
}));

// Schedule
router.get('/owner/schedule', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const schedule = await clinicService.getSchedule(clinic.id, req.user.id);
    res.json({ success: true, data: { schedule } });
}));

router.put('/owner/schedule', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const schedulePayload = req.body?.schedule ?? req.body;
    const schedule = await clinicService.updateSchedule(clinic.id, req.user.id, schedulePayload);
    res.json({ success: true, data: { schedule } });
}));

// Reviews
router.get('/owner/reviews', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { page = 1, limit = 10 } = req.query;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('clinic', clinic.id, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

// Reels (Clinic Videos)
router.post('/owner/reels', requireRole(ROLES.CLINIC_OWNER), [
    body('video_url').isString().trim().notEmpty().withMessage('Video URL is required'),
    body('thumbnail_url').optional().isString().trim(),
    body('title').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const reel = await clinicService.addReel(clinic.id, req.user.id, req.body);
    res.json({ success: true, reel });
}));

router.delete('/owner/reels/:reelId', requireRole(ROLES.CLINIC_OWNER), [
    param('reelId').isUUID().withMessage('Invalid reel ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    await clinicService.deleteReel(clinic.id, req.user.id, req.params.reelId);
    res.json({ success: true });
}));

// Departments
router.get('/owner/departments', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const departments = await clinicService.getClinicDepartments(clinic.id);
    res.json({ success: true, data: departments });
}));

router.post('/owner/departments', requireRole(ROLES.CLINIC_OWNER), [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('description').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const department = await clinicService.addDepartment(clinic.id, req.user.id, req.body);
    res.json({ success: true, data: department });
}));

router.put('/owner/departments/:departmentId', requireRole(ROLES.CLINIC_OWNER), [
    param('departmentId').isUUID().withMessage('Invalid department ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const department = await clinicService.updateDepartment(clinic.id, req.user.id, req.params.departmentId, req.body);
    res.json({ success: true, data: department });
}));

router.delete('/owner/departments/:departmentId', requireRole(ROLES.CLINIC_OWNER), [
    param('departmentId').isUUID().withMessage('Invalid department ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    await clinicService.deleteDepartment(clinic.id, req.user.id, req.params.departmentId);
    res.json({ success: true });
}));

// Analytics
router.get('/owner/analytics', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { period = '30d' } = req.query;
    const analytics = await clinicService.getAnalytics(clinic.id, req.user.id, period);
    res.json({ success: true, data: analytics });
}));

module.exports = router;
