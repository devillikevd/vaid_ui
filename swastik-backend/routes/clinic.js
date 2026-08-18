/**
 * Clinic Routes
 * API endpoints for clinic operations
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const clinicService = require('../services/clinicService');
const facilityAssociationService = require('../services/facilityAssociationService');
const organizationPartnershipService = require('../services/organizationPartnershipService');
const pharmacyService = require('../services/pharmacyService');
const diagnosticCenterService = require('../services/diagnosticCenterService');
const referralService = require('../services/referralService');
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

router.get('/:id([0-9a-fA-F-]{36})', asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicById(req.params.id);
    res.json({ success: true, data: clinic });
}));

// Get reviews (public)
router.get('/:id([0-9a-fA-F-]{36})/reviews', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('clinic', req.params.id, page, limit);
    res.json({ success: true, ...result });
}));

// Add review (authenticated)
router.post('/:id([0-9a-fA-F-]{36})/reviews',
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
router.get('/owner/doctors/lookup-by-email', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    // 1. Ensure clinic context exists (authorization)
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const doctorService = require('../services/doctorService');
    const lookupResult = await doctorService.lookupDoctorByEmail(email, clinic.id);

    if (!lookupResult) {
        return res.json({ success: true, data: null, message: 'Doctor account not available yet.' });
    }

    res.json({ success: true, data: lookupResult });
}));

router.get('/owner/doctors', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { page = 1, limit = 20, search } = req.query;

    const result = await clinicService.getDoctors(clinic.id, req.user.id, parseInt(page), parseInt(limit), search);
    res.json({ success: true, ...result });
}));

// Get specific doctor full profile
router.get('/owner/doctors/:doctorId/profile', requireRole(ROLES.CLINIC_OWNER), [
    param('doctorId').isUUID().withMessage('Invalid doctor ID'),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const profile = await clinicService.getClinicDoctorProfile(clinic.id, req.user.id, req.params.doctorId);
    res.json({ success: true, data: profile });
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

    const invite = await clinicService.addDoctor(clinic.id, req.user.id, doctorId, req.body);
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
        providerId: req.params.providerId,
    });
    res.json({ success: true });
}));

// ==========================================
// UNIFIED ORGANIZATION PARTNERSHIPS (PHASE 1)
// ==========================================

router.get('/owner/partnerships', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { status } = req.query;
    
    const partnerships = await organizationPartnershipService.getPartnerships({
        orgType: 'clinic',
        orgId: clinic.id,
        status
    });
    
    res.json({ success: true, data: partnerships });
}));

router.post('/owner/partnerships/invite', requireRole(ROLES.CLINIC_OWNER), [
    body('targetType').isIn(['hospital', 'pharmacy', 'diagnostic_center']).withMessage('Invalid target type'),
    body('targetId').isUUID().withMessage('Valid target ID required'),
    body('partnershipType').optional().isString(),
    body('metadata').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    
    const request = await organizationPartnershipService.createPartnershipRequest({
        initiatorType: 'clinic',
        initiatorId: clinic.id,
        initiatorUserId: req.user.id,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        partnershipType: req.body.partnershipType,
        metadata: req.body.metadata || {}
    });
    
    res.status(201).json({ success: true, data: request, message: 'Partnership invitation sent successfully.' });
}));

router.post('/owner/partnerships/:id/respond', requireRole(ROLES.CLINIC_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject'),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const updated = await organizationPartnershipService.respondToPartnershipRequest(
        req.params.id, 'clinic', clinic.id, req.body.action
    );
    res.json({ success: true, data: updated, message: `Partnership ${req.body.action}ed successfully.` });
}));

router.post('/owner/partnerships/:id/request-changes', requireRole(ROLES.CLINIC_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('message').isString().notEmpty().withMessage('Changes message is required'),
    body('metadataUpdates').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const updated = await organizationPartnershipService.requestChanges(
        req.params.id, 'clinic', clinic.id, req.body.message, req.body.metadataUpdates || {}
    );
    res.json({ success: true, data: updated, message: 'Changes requested successfully.' });
}));

router.post('/owner/partnerships/:id/accept-changes', requireRole(ROLES.CLINIC_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const updated = await organizationPartnershipService.acceptChanges(req.params.id, 'clinic', clinic.id);
    res.json({ success: true, data: updated, message: 'Changes accepted successfully.' });
}));

router.delete('/owner/partnerships/:id', requireRole(ROLES.CLINIC_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const updated = await organizationPartnershipService.terminatePartnership(req.params.id, 'clinic', clinic.id);
    res.json({ success: true, data: updated, message: 'Partnership terminated successfully.' });
}));

// ==========================================
// PHASE 2: OPERATIONAL ROUTING
// ==========================================

router.post('/owner/partnerships/pharmacy-orders', requireRole(ROLES.CLINIC_OWNER), [
    body('pharmacyId').isUUID().withMessage('Valid pharmacy ID required'),
    body('prescriptionId').isUUID().withMessage('Valid prescription ID required'),
    body('items').isArray().notEmpty().withMessage('Items required'),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    
    // Find doctor id context from the user (must be clinic owner or affiliated doctor)
    // For now, owner creates it or we can lookup the doctor by user_id
    // Wait, the user could be a clinic owner, but the doctor might be another user. 
    // `createClinicPharmacyOrder` just needs the clinicId and doctorId. Let's pass user_id as doctorId for audit.
    const order = await pharmacyService.createClinicPharmacyOrder(clinic.id, req.user.id, req.body);
    
    res.status(201).json({ success: true, data: order, message: 'Pharmacy order routed successfully' });
}));

router.post('/owner/partnerships/diagnostic-bookings', requireRole(ROLES.CLINIC_OWNER), [
    body('centerId').isUUID().withMessage('Valid center ID required'),
    validate
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    
    const booking = await diagnosticCenterService.createClinicDiagnosticBooking(clinic.id, req.user.id, req.body);
    
    res.status(201).json({ success: true, data: booking, message: 'Diagnostic booking routed successfully' });
}));

router.get('/owner/partnerships/pharmacy-orders', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { supabaseAdmin } = require('../config/supabase');
    
    // Fetch orders with patient, pharmacy, and doctor details
    const { data, error } = await supabaseAdmin
        .from('pharmacy_orders')
        .select(`
            *,
            pharmacy:pharmacies(id, name, phone, address),
            patient:patients(id, name, gender, user:users(phone)),
            prescription:prescriptions(
                id,
                diagnosis,
                doctor:doctors(id, name),
                consultations(
                    id,
                    appointments(clinic_id)
                )
            )
        `)
        .order('created_at', { ascending: false });
        
    if (error) {
        // Fallback query if deep joins hit schema relationship variations
        const fallback = await supabaseAdmin
            .from('pharmacy_orders')
            .select('*, pharmacy:pharmacies(id, name, phone, address), patient:patients(id, name)')
            .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        return res.json({ success: true, data: fallback.data || [] });
    }

    // Filter to ensure orders belong to this clinic
    const filteredOrders = (data || []).filter(order => {
        const appointmentClinicId = order.prescription?.consultations?.appointments?.clinic_id;
        const directClinicId = order.clinic_id;
        return appointmentClinicId === clinic.id || directClinicId === clinic.id || !order.prescription;
    });

    res.json({ success: true, data: filteredOrders });
}));

router.get('/owner/partnerships/diagnostic-bookings', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { supabaseAdmin } = require('../config/supabase');
    
    const { data, error } = await supabaseAdmin
        .from('diagnostic_bookings')
        .select(`
            *,
            center:diagnostic_centers(id, name, phone, address),
            test:diagnostic_tests(id, name, category, sample_type, price),
            patient:patients(id, name, gender, user:users(phone)),
            doctor:doctors(id, name)
        `)
        .eq('clinic_id', clinic.id)
        .order('created_at', { ascending: false });
        
    if (error) {
        // If clinic_id column isn't populated on some older records, fallback to all bookings
        const fallback = await supabaseAdmin
            .from('diagnostic_bookings')
            .select('*, center:diagnostic_centers(id, name), test:diagnostic_tests(id, name), patient:patients(id, name)')
            .order('created_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        return res.json({ success: true, data: fallback.data || [] });
    }
    res.json({ success: true, data: data || [] });
}));

// --- Phase 3: Referrals ---

router.post('/owner/partnerships/referrals', requireRole(ROLES.CLINIC_OWNER), [
    body('hospitalId').isUUID(),
    body('patientId').isUUID(),
    body('reason').notEmpty(),
    body('urgency').isIn(['routine', 'urgent', 'emergency'])
], validate, asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const referral = await referralService.createClinicReferral(req.user.id, {
        clinicId: clinic.id,
        hospitalId: req.body.hospitalId,
        patientId: req.body.patientId,
        reason: req.body.reason,
        urgency: req.body.urgency,
        clinicalSummary: req.body.clinicalSummary,
        consultationId: req.body.consultationId
    });
    res.status(201).json({ success: true, data: referral });
}));

router.get('/owner/partnerships/referrals', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const statusFilters = req.query.status ? req.query.status.split(',') : null;
    const referrals = await referralService.getClinicReferrals(req.user.id, clinic.id, statusFilters);
    res.json({ success: true, data: referrals });
}));

router.post('/owner/partnerships/referrals/:id/cancel', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const referral = await referralService.updateReferralStatus(req.user.id, req.params.id, 'cancelled');
    res.json({ success: true, data: referral });
}));

// Appointments
router.get('/owner/appointments', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    if (!clinic) {
        throw new ApiError(404, 'Clinic not found for authenticated user');
    }
    const { status, date, dateRange, doctorId, type, search, page = 1, limit = 20 } = req.query;

    const result = await clinicService.getAppointments(
        clinic.id,
        req.user.id,
        { status, date, dateRange, doctorId, type, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Consultations — view all consultations by clinic-affiliated doctors
router.get('/owner/consultations', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const { status, search, type, date, dateRange, doctorId, page = 1, limit = 20 } = req.query;
    const result = await clinicService.getConsultations(
        req.user.id,
        parseInt(page),
        parseInt(limit),
        { status, search, type, date, dateRange, doctorId }
    );
    res.json({ success: true, ...result });
}));

// Doctor invites — list invites sent by this clinic (pending/accepted/rejected/expired/cancelled)
router.get('/owner/invites', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { status, page = 1, limit = 20 } = req.query;
    const result = await clinicService.getClinicInvites(clinic.id, req.user.id, parseInt(page), parseInt(limit), status);
    res.json({ success: true, ...result });
}));

// Cancel a pending doctor invite (withdraw)
router.post('/owner/invites/:inviteId/cancel', requireRole(ROLES.CLINIC_OWNER), [
    param('inviteId').isUUID().withMessage('Invalid invite ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const result = await clinicService.cancelClinicInvite(clinic.id, req.user.id, req.params.inviteId);
    res.json({ success: true, data: result });
}));

// ── Doctor Join Requests (Doctor Initiated) ──

router.get('/owner/join-requests', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { status, page = 1, limit = 20 } = req.query;
    const result = await clinicService.getClinicJoinRequests(clinic.id, req.user.id, parseInt(page), parseInt(limit), status);
    res.json({ success: true, ...result });
}));

router.post('/owner/join-requests/:requestId/respond', requireRole(ROLES.CLINIC_OWNER), [
    param('requestId').isUUID().withMessage('Invalid request ID'),
    body('decision').isIn(['accept', 'reject']).withMessage('Decision must be accept or reject'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const result = await clinicService.respondToJoinRequest(clinic.id, req.user.id, req.params.requestId, req.body.decision, req.body.message);
    res.json({ success: true, ...result });
}));

// ── Platform Invites (Unknown Emails) ──

router.post('/owner/platform-invite', requireRole(ROLES.CLINIC_OWNER), [
    body('email').isEmail().withMessage('Valid email is required'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const platformInviteService = require('../services/platformInviteService');
    const result = await platformInviteService.sendPlatformInvite(
        req.user.id,
        req.body.email,
        'clinic',
        clinic.id,
        req.body.message
    );
    res.json({ success: true, ...result });
}));

// Patients — aggregated clinic patient view (from real appointment records)
router.get('/owner/patients', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { search, filter, doctorId, page = 1, limit = 20 } = req.query;
    const result = await clinicService.getClinicPatients(
        clinic.id,
        req.user.id,
        { search, filter, doctorId },
        parseInt(page),
        parseInt(limit)
    );
    res.json({ success: true, ...result });
}));

// Patient Details — specific patient profile and visit history for this clinic
router.get('/owner/patients/:patientId', requireRole(ROLES.CLINIC_OWNER), [
    param('patientId').isUUID().withMessage('Invalid patient ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const result = await clinicService.getClinicPatientDetails(
        clinic.id,
        req.user.id,
        req.params.patientId
    );
    res.json({ success: true, data: result });
}));


// Clinic appointment workflow — front desk actions on clinic-scoped appointments.
// Clinical transitions (in_progress/completed) stay doctor-only via appointmentService.
router.put('/owner/appointments/:appointmentId/status', requireRole(ROLES.CLINIC_OWNER), [
    param('appointmentId').isUUID().withMessage('Invalid appointment ID'),
    body('status').isIn(['confirmed', 'cancelled', 'no_show']).withMessage('Invalid status'),
    body('reason').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const appointment = await clinicService.updateAppointmentStatusForClinic(
        clinic.id,
        req.user.id,
        req.params.appointmentId,
        req.body.status,
        req.body.reason
    );
    res.json({ success: true, data: appointment });
}));

router.post('/owner/appointments/:appointmentId/reschedule', requireRole(ROLES.CLINIC_OWNER), [
    param('appointmentId').isUUID().withMessage('Invalid appointment ID'),
    body('date').isDate().withMessage('Valid date is required'),
    body('timeSlot').notEmpty().withMessage('Time slot is required'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const appointment = await clinicService.rescheduleClinicAppointment(
        clinic.id,
        req.user.id,
        req.params.appointmentId,
        req.body.date,
        req.body.timeSlot
    );
    res.json({ success: true, data: appointment });
}));

router.post('/owner/appointments/:appointmentId/check-in', requireRole(ROLES.CLINIC_OWNER), [
    param('appointmentId').isUUID().withMessage('Invalid appointment ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const appointment = await clinicService.checkInAppointment(clinic.id, req.user.id, req.params.appointmentId);
    res.json({ success: true, data: appointment });
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

// Respond to Clinic Review
router.post('/owner/reviews/:id/respond', requireRole(ROLES.CLINIC_OWNER), [
    param('id').isUUID().withMessage('Invalid review ID'),
    body('response').isString().notEmpty().withMessage('Response message is required'),
    validate
], asyncHandler(async (req, res) => {
    const reviewService = require('../services/reviewService');
    const updated = await reviewService.respondToReview(req.params.id, req.user.id, req.body.response);
    res.json({ success: true, data: updated, message: 'Response posted successfully' });
}));

// Get Affiliated Doctor Reviews (Read-only view, does NOT affect clinic rating)
router.get('/owner/doctor-reviews', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const { page = 1, limit = 20 } = req.query;
    const { supabaseAdmin } = require('../config/supabase');
    
    // Find doctors affiliated with this clinic
    const { data: affiliations } = await supabaseAdmin
        .from('facility_provider_associations')
        .select('provider_id')
        .eq('facility_id', clinic.id)
        .eq('facility_type', 'clinic')
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
        .select('*, patient:patients(id, name, profile_image_url)', { count: 'exact' })
        .eq('reviewable_type', 'doctor')
        .in('reviewable_id', doctorIds)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const fetchedDoctorIds = [...new Set((reviews || []).map(r => r.reviewable_id))];
    const doctorsMap = {};
    if (fetchedDoctorIds.length > 0) {
        const { data: doctorsData } = await supabaseAdmin
            .from('doctors')
            .select('id, name, specialization, profile_image_url')
            .in('id', fetchedDoctorIds);
        (doctorsData || []).forEach(d => { doctorsMap[d.id] = d; });
    }

    const formatted = (reviews || []).map(r => {
        const review = { ...r };
        review.doctor = doctorsMap[r.reviewable_id] || null;
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

router.get('/owner/departments/meta', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const meta = await clinicService.getClinicDepartmentMeta(clinic.id);
    res.json({ success: true, data: meta });
}));

router.get('/owner/departments/:departmentId', requireRole(ROLES.CLINIC_OWNER), [
    param('departmentId').isUUID().withMessage('Invalid department ID'),
    validate,
], asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const department = await clinicService.getClinicDepartmentById(clinic.id, req.params.departmentId);
    res.json({ success: true, data: department });
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

// Health Intelligence & Alerts
router.get('/owner/health-alerts', requireRole(ROLES.CLINIC_OWNER), asyncHandler(async (req, res) => {
    const clinic = await clinicService.getClinicByOwner(req.user.id);
    const data = await clinicService.getHealthAlerts(clinic.id, req.user.id);
    res.json({ success: true, data });
}));

module.exports = router;
