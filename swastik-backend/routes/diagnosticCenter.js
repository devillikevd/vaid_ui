/**
 * Diagnostic Center Routes
 * API endpoints for diagnostic center operations
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const diagnosticCenterService = require('../services/diagnosticCenterService');
const organizationPartnershipService = require('../services/organizationPartnershipService');
const facilityAssociationService = require('../services/facilityAssociationService');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { uploadMedicalDocument, handleUpload } = require('../middleware/upload');
const { uploadReport } = require('../config/minio');

// ==================== Public Routes ====================

// Search diagnostic centers
router.get('/search', asyncHandler(async (req, res) => {
    const { city, search, testType, page = 1, limit = 20 } = req.query;

    const result = await diagnosticCenterService.searchDiagnosticCenters(
        { city, search, testType },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Find nearby diagnostic centers
router.get('/nearby', asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location required' });
    }

    const centers = await diagnosticCenterService.findNearby(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius)
    );

    res.json({ success: true, data: centers });
}));

// Get diagnostic center by ID
router.get('/:id([0-9a-fA-F-]{36})', asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterById(req.params.id);
    res.json({ success: true, data: center });
}));

// Get tests available at a specific center (public)
router.get('/:id([0-9a-fA-F-]{36})/tests', asyncHandler(async (req, res) => {
    const { search, category, page = 1, limit = 50 } = req.query;

    const result = await diagnosticCenterService.getTests(
        req.params.id,
        { search, category, isActive: true, publicOnly: true },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Search master diagnostic tests (Public)
router.get('/master-tests', asyncHandler(async (req, res) => {
    const { search, category, page = 1, limit = 20 } = req.query;
    const { supabaseAdmin } = require('../config/supabase'); // Import locally

    let query = supabaseAdmin
        .from('master_diagnostic_tests')
        .select('*', { count: 'exact' });

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    if (category) {
        query = query.eq('category', category);
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    query = query.range(from, to).order('name');

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
        success: true,
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit)),
        }
    });
}));

// ==================== Protected Routes ====================
router.use(authenticate);

// Register diagnostic center (C9 Fix: restrict to diagnostic_center_owner role)
router.post('/register',
  requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER),
  [
    body('name').trim().notEmpty().withMessage('Center name is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('license_number').trim().notEmpty().withMessage('License number is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.registerDiagnosticCenter(req.user.id, req.body);
    res.status(201).json({ success: true, data: center });
  })
);

// Book a test (patient)
router.post('/book',
  requireRole(ROLES.PATIENT),
  [
    body('centerId').notEmpty().isUUID().withMessage('Valid center ID is required'),
    body('testId').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Valid test ID is required'),
    body('bookingDate').notEmpty().isDate().withMessage('Valid booking date is required'),
    body('bookingTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('Time must be HH:MM format'),
    body('collectionType').optional().isIn(['walk_in', 'home_collection']).withMessage('Invalid collection type'),
    body('collectionAddress').if(body('collectionType').equals('home_collection'))
      .notEmpty().withMessage('Address is required for home collection'),
    body('prescriptionId').optional().isUUID().withMessage('Invalid prescription ID format'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { centerId, testId, bookingDate, bookingTime, collectionType, collectionAddress, notes, patientPhone, prescriptionId, source_referral_id } = req.body;

    // DC5: Use service-layer helpers instead of inline Supabase calls
    const patientId = await diagnosticCenterService.resolvePatientId(req.user.id);
    if (!patientId) {
        return res.status(400).json({ success: false, message: 'Patient profile not found' });
    }

    const booking = await diagnosticCenterService.bookTest(
        patientId,
        centerId,
        testId,
        { bookingDate, bookingTime, collectionType, collectionAddress, notes, patientPhone, prescriptionId, source_referral_id }
    );

    // DC5: Use service-layer helper for center owner lookup
    const centerOwnerId = await diagnosticCenterService.getCenterOwnerId(centerId);

    // Emit real-time event so diagnostic center dashboard gets notified
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitDiagnosticBookingCreated({
        ...booking,
        patient_id: req.user.id,
        center_id: centerId,
        center_owner_id: centerOwnerId,
    });

    res.status(201).json({ success: true, data: booking });
}));

// ==================== Owner Routes ====================

// Dashboard
router.get('/owner/dashboard', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const dashboard = await diagnosticCenterService.getDashboard(center.id);
    res.json({ success: true, ...dashboard });
}));

// Profile
router.get('/owner/profile', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    res.json({ success: true, data: center });
}));

router.put('/owner/profile', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const allowed = [
        'name', 'phone', 'email', 'website', 'website_url', 'emergency_phone', 'address', 'city', 'state', 'pincode',
        'latitude', 'longitude', 'registration_number', 'license_number', 'license_document_url',
        'nabl_accreditation', 'accreditations', 'description', 'opening_hours',
        'sample_collection_available', 'home_collection_available',
        'home_collection_fee', 'is_24_hours', 'profile_image', 'profile_image_url', 'image_url',
        'established_year', 'virtual_tour_url', 'floor_guide_map_url',
        'test_categories', 'images', 'gallery_urls'
    ];
    const safeUpdates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }
    const updated = await diagnosticCenterService.updateDiagnosticCenter(center.id, req.user.id, safeUpdates);
    res.json({ success: true, data: updated });
}));

// ==================== Reels ====================

router.post('/owner/reels', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), asyncHandler(async (req, res) => {
    const data = await diagnosticCenterService.addReel(req.user.id, req.body);
    res.json({ success: true, data });
}));

router.delete('/owner/reels/:id', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), asyncHandler(async (req, res) => {
    await diagnosticCenterService.deleteReel(req.user.id, req.params.id);
    res.json({ success: true, message: 'Reel deleted successfully' });
}));

router.get('/owner/associations/invites', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const data = await facilityAssociationService.getProviderInvites({
        providerType: 'diagnostic_center',
        ownerId: req.user.id,
    });
    res.json({ success: true, data });
}));

router.post('/owner/associations/invites/:inviteId/respond',
  requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER),
  requireApproval,
  [
    param('inviteId').isUUID().withMessage('Invalid invite ID'),
    body('decision').isIn(['accept', 'reject']).withMessage('Decision must be accept or reject'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await facilityAssociationService.respondToProviderInvite({
      providerType: 'diagnostic_center',
      ownerId: req.user.id,
      inviteId: req.params.inviteId,
      decision: req.body.decision,
    });
    res.json({
      success: true,
      data,
      message: req.body.decision === 'accept'
        ? 'Association accepted successfully.'
        : 'Invitation rejected successfully.',
    });
  })
);

router.get('/owner/associations', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const data = await facilityAssociationService.getProviderAssociations({
        providerType: 'diagnostic_center',
        ownerId: req.user.id,
    });
    res.json({ success: true, data });
}));

// ==================== Test Catalog ====================

router.get('/owner/tests', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { search, category, page = 1, limit = 50 } = req.query;

    const result = await diagnosticCenterService.getTests(
        center.id,
        { search, category },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

router.post('/owner/tests', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const test = await diagnosticCenterService.addTest(center.id, req.body);
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitProviderCatalogUpdated({ providerId: center.id, providerType: 'diagnostic', status: 'test_added' });
    res.status(201).json({ success: true, data: test });
}));

router.put('/owner/tests/:testId', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const updated = await diagnosticCenterService.updateTest(center.id, req.params.testId, req.body);
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitProviderCatalogUpdated({ providerId: center.id, providerType: 'diagnostic', status: 'test_updated' });
    res.json({ success: true, data: updated });
}));

router.delete('/owner/tests/:testId', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    await diagnosticCenterService.deleteTest(center.id, req.params.testId);
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitProviderCatalogUpdated({ providerId: center.id, providerType: 'diagnostic', status: 'test_deleted' });
    res.json({ success: true, message: 'Test removed' });
}));

// ==================== Patients ====================

router.get('/owner/patients', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { search, page = 1, limit = 20 } = req.query;

    const result = await diagnosticCenterService.getPatients(
        center.id,
        { search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

router.get('/owner/patients/:patientId/history', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { page = 1, limit = 10 } = req.query;

    const result = await diagnosticCenterService.getPatientHistory(
        center.id,
        req.params.patientId,
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// ==================== Bookings / Results ====================

router.get('/owner/bookings', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { status, resultStatus, date, search, page = 1, limit = 20 } = req.query;

    const result = await diagnosticCenterService.getBookings(
        center.id,
        { status, resultStatus, date, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// M6: Get single booking by ID
router.get('/owner/bookings/:bookingId', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const booking = await diagnosticCenterService.getBookingById(center.id, req.params.bookingId);
    res.json({ success: true, data: booking });
}));

// Report Secure Access (supports both /bookings/:bookingId/report and /results/:bookingId/report)
const handleGetBookingReport = asyncHandler(async (req, res) => {
    let center;
    try {
        center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    } catch {
        const { supabaseAdmin } = require('../config/supabase');
        const { data: member } = await supabaseAdmin
            .from('diagnostic_members')
            .select('diagnostic_center_id, status')
            .eq('user_id', req.user.id)
            .eq('status', 'active')
            .single();
        if (member) {
            center = { id: member.diagnostic_center_id };
        }
    }

    if (!center) {
        throw new ApiError(403, "You don't have permission to view this report");
    }

    const { supabaseAdmin } = require('../config/supabase');
    const { data: booking, error } = await supabaseAdmin
        .from('diagnostic_bookings')
        .select('id, center_id, result_url, result_status, status, test:diagnostic_tests(name), patient:patients(name)')
        .eq('id', req.params.bookingId)
        .eq('center_id', center.id)
        .single();

    if (error || !booking) {
        throw new ApiError(404, 'Report not found or you do not have permission to view it');
    }

    if (!booking.result_url) {
        throw new ApiError(404, 'Report not found');
    }

    const { getPresignedUrl, extractObjectNameFromUrl } = require('../config/minio');
    const objectName = extractObjectNameFromUrl(booking.result_url);
    let presignedUrl = null;

    if (objectName) {
        try {
            presignedUrl = await getPresignedUrl(objectName, 3600); // 1 hour validity
        } catch (storageError) {
            console.warn('[DiagnosticReport] Storage presigning failed, falling back to direct result_url:', storageError.message);
            presignedUrl = booking.result_url;
        }
    } else {
        presignedUrl = booking.result_url;
    }

    if (!presignedUrl) {
        throw new ApiError(500, 'Unable to load report. Please try again.');
    }

    if (req.query.redirect === 'true' || req.headers.accept?.includes('text/html')) {
        return res.redirect(302, presignedUrl);
    }

    res.json({
        success: true,
        data: {
            url: presignedUrl,
            objectName,
            result_status: booking.result_status,
            test_name: booking.test?.name,
            patient_name: booking.patient?.name,
        },
    });
});

router.get('/owner/bookings/:bookingId/report',
    requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER, ROLES.DIAGNOSTIC_MANAGER, ROLES.LAB_TECHNICIAN),
    requireApproval,
    handleGetBookingReport
);

router.get('/owner/results/:bookingId/report',
    requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER, ROLES.DIAGNOSTIC_MANAGER, ROLES.LAB_TECHNICIAN),
    requireApproval,
    handleGetBookingReport
);

router.patch('/owner/bookings/:bookingId/status',
  requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER),
  requireApproval,
  [
    body('status')
      .isIn(['confirmed', 'dispatched', 'arrived', 'sample_collected', 'processing', 'completed', 'cancelled'])
      .withMessage('Invalid booking status'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Cancellation reason must be under 500 characters'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const updated = await diagnosticCenterService.updateBookingStatus(
      center.id,
      req.params.bookingId,
      req.body.status,
      { cancelledBy: req.user.id, reason: req.body.reason }
    );

    // Fix #29: Removed duplicate notification — updateBookingStatus() already emits via eventEmitter

    res.json({ success: true, data: updated });
  })
);

router.patch('/owner/bookings/:bookingId/result', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, handleUpload(uploadMedicalDocument.single('file')), asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    
    let resultUrl = req.body.resultUrl || req.body.result_url;
    let fileSize = null;
    
    if (req.file) {
        // Upload to Minio
        const uploadResult = await uploadReport(req.file, req.user.id);
        resultUrl = uploadResult.objectName || uploadResult.url;
        fileSize = uploadResult.size;
    }

    const updated = await diagnosticCenterService.uploadResult(
        center.id,
        req.params.bookingId,
        { ...req.body, result_url: resultUrl, file_size: fileSize },
        req.user.id
    );

    res.json({ success: true, data: updated });
}));

// Analytics


// ==================== Partnerships ====================

router.get('/owner/partnerships', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { status } = req.query;
    
    const partnerships = await organizationPartnershipService.getPartnerships({
        orgType: 'diagnostic_center',
        orgId: center.id,
        status
    });
    
    res.json({ success: true, data: partnerships });
}));

router.post('/owner/partnerships/invite', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, [
    body('targetType').isIn(['hospital', 'clinic', 'pharmacy']).withMessage('Invalid target type'),
    body('targetId').isUUID().withMessage('Valid target ID required'),
    body('partnershipType').optional().isString(),
    body('metadata').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    if (!center) {
        throw new ApiError(404, 'Diagnostic center not found for this user');
    }
    
    const result = await organizationPartnershipService.createPartnershipRequest({
        initiatorType: 'diagnostic_center',
        initiatorId: center.id,
        initiatorUserId: req.user.id,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        partnershipType: req.body.partnershipType,
        metadata: req.body.metadata
    });
    
    res.json({ success: true, message: 'Partnership invite sent', data: result });
}));

router.post('/owner/partnerships/:id/respond', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject'),
    validate
], asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    
    const updated = await organizationPartnershipService.respondToPartnershipRequest(
        req.params.id,
        'diagnostic_center',
        center.id,
        req.body.action
    );
    
    res.json({ success: true, message: `Partnership ${req.body.action}ed`, data: updated });
}));

router.post('/owner/partnerships/:id/request-changes', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('message').isString().notEmpty().withMessage('Changes message is required'),
    body('metadataUpdates').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const updated = await organizationPartnershipService.requestChanges(
        req.params.id,
        'diagnostic_center',
        center.id,
        req.body.message,
        req.body.metadataUpdates
    );
    res.json({ success: true, message: 'Changes requested', data: updated });
}));

router.post('/owner/partnerships/:id/accept-changes', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const updated = await organizationPartnershipService.acceptChanges(req.params.id, 'diagnostic_center', center.id);
    res.json({ success: true, message: 'Changes accepted', data: updated });
}));

router.delete('/owner/partnerships/:id', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const updated = await organizationPartnershipService.terminatePartnership(req.params.id, 'diagnostic_center', center.id);
    res.json({ success: true, message: 'Partnership terminated', data: updated });
}));


// ==================== Staff Management ====================

router.get('/owner/staff', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
  const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
  const staff = await diagnosticCenterService.getDiagnosticMembers(center.id);
  res.json({ success: true, data: staff });
}));

router.post('/owner/staff/invite', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
  const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
  const { email, role } = req.body;
  if (!email || !role) throw new ApiError(400, 'Email and role are required');
  const result = await diagnosticCenterService.inviteDiagnosticMember(center.id, req.user.id, email, role);
  res.json({ success: true, message: 'Member invited successfully', data: result });
}));

router.patch('/owner/staff/:id/role', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
  const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
  const { role } = req.body;
  if (!role) throw new ApiError(400, 'Role is required');
  const result = await diagnosticCenterService.updateDiagnosticMemberRole(center.id, req.params.id, role);
  res.json({ success: true, message: 'Member role updated successfully', data: result });
}));

router.patch('/owner/staff/:id/status', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
  const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
  const { action } = req.body;
  if (!action || !['suspend', 'activate'].includes(action)) throw new ApiError(400, 'Valid action (suspend/activate) is required');
  const result = await diagnosticCenterService.updateDiagnosticMemberStatus(center.id, req.params.id, action);
  res.json({ success: true, message: 'Member updated successfully', data: result });
}));

router.delete('/owner/staff/:id', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
  const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
  const result = await diagnosticCenterService.removeDiagnosticMember(center.id, req.params.id);
  res.json({ success: true, message: 'Member removed successfully', data: result });
}));


router.get('/owner/analytics', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { from, to } = req.query;
    const analytics = await diagnosticCenterService.getAnalytics(center.id, { from, to });
    res.json({ success: true, data: analytics });
}));

// Reviews
router.get('/owner/reviews', requireRole(ROLES.DIAGNOSTIC_CENTER_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const center = await diagnosticCenterService.getDiagnosticCenterByOwner(req.user.id);
    const { page = 1, limit = 10 } = req.query;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('diagnostic_center', center.id, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

module.exports = router;
