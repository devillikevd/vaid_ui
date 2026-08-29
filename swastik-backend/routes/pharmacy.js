/**
 * Pharmacy Routes
 * API endpoints for pharmacy/medical store operations
 */
const express = require('express');
const router = express.Router();
const pharmacyService = require('../services/pharmacyService');
const facilityAssociationService = require('../services/facilityAssociationService');
const organizationPartnershipService = require('../services/organizationPartnershipService');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, param, query: queryValidator } = require('express-validator');
const { validate } = require('../middleware/validate');
const { sanitizeSearch } = require('../utils/sanitize');

// Public routes
router.get('/search', asyncHandler(async (req, res) => {
    const { city, search, page = 1, limit = 20, deliveryAvailable, isOpen } = req.query;

    const result = await pharmacyService.searchPharmacies(
        {
            city,
            search,
            deliveryAvailable: deliveryAvailable === 'true',
            isOpen: isOpen === 'true',
        },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Find nearby pharmacies (general — no medicineId required)
router.get('/nearby-general', asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location required' });
    }

    const pharmacies = await pharmacyService.findNearbyGeneral(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius)
    );

    res.json({ success: true, data: pharmacies });
}));

// Find nearby pharmacies
router.get('/nearby', asyncHandler(async (req, res) => {
    const { latitude, longitude, medicineId, radius = 10 } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'Location required' });
    }

    if (!medicineId) {
        return res.status(400).json({ success: false, message: 'Medicine ID required' });
    }

    const pharmacies = await pharmacyService.findNearbyWithMedicine(
        parseFloat(latitude),
        parseFloat(longitude),
        medicineId,
        parseFloat(radius)
    );

    res.json({ success: true, data: pharmacies });
}));

// Get pharmacy by ID
router.get('/:id([0-9a-fA-F-]{36})', asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyById(req.params.id);
    res.json({ success: true, data: pharmacy });
}));

// Protected routes - require authentication
router.use(authenticate);

// Register pharmacy (C9 Fix: restrict to pharmacy_owner role or new registrants)
// Fix #21: Add input validation
router.post('/register', requireRole(ROLES.PHARMACY_OWNER), [
    body('name').trim().notEmpty().withMessage('Pharmacy name is required').isLength({ max: 200 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('address').optional().trim().isLength({ max: 500 }),
    body('city').optional().trim().isLength({ max: 100 }),
    body('state').optional().trim().isLength({ max: 100 }),
    body('latitude').optional().isFloat({ min: -90, max: 90 }),
    body('longitude').optional().isFloat({ min: -180, max: 180 }),
    body('license_number').optional().trim().isLength({ max: 100 }),
    validate,
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.registerPharmacy(req.user.id, req.body);
    res.status(201).json({ success: true, data: pharmacy });
}));

// Dashboard - aggregate data for pharmacy owner
router.get('/dashboard', requireRole(ROLES.PHARMACY_OWNER), requireApproval, asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);

    // Get inventory with low stock filter and profile completion concurrently
    const [inventoryResult, ordersResult, profileCompletion, preferences] = await Promise.all([
        pharmacyService.getInventory(pharmacy.id, { lowStock: 'true' }, 1, 50),
        pharmacyService.getOrders(pharmacy.id, { status: 'pending' }, 1, 20),
        pharmacyService.getPharmacyProfileCompletion(pharmacy.id, req.user.id),
        pharmacyService.getPharmacyPreferences(pharmacy.id, req.user.id),
    ]);

    const lowStockItems = inventoryResult.items || inventoryResult.data || [];
    const pendingOrders = ordersResult.orders || ordersResult.data || [];

    // Calculate today's revenue from delivered/completed orders
    let todaysRevenue = 0;
    try {
        const { supabaseAdmin } = require('../config/supabase');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: revenueData } = await supabaseAdmin
            .from('pharmacy_orders')
            .select('total_amount')
            .eq('pharmacy_id', pharmacy.id)
            .in('status', ['delivered', 'completed'])
            .gte('created_at', today.toISOString());
        if (revenueData && revenueData.length > 0) {
            todaysRevenue = revenueData.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0);
        }
    } catch (e) {
        // Silently fallback to 0 if table/column doesn't exist yet
    }

    // New prescriptions count (prescriptions table has no pharmacy_id column yet — use 0)
    let newPrescriptionsCount = 0;

    // Build dashboard stats
    const stats = {
        newPrescriptions: newPrescriptionsCount,
        pendingOrders: pendingOrders.length,
        lowStockItems: lowStockItems.length,
        todaysRevenue,
    };

    res.json({
        success: true,
        stats,
        profileCompletion,
        preferences,
        pendingPrescriptions: pendingOrders.map((o) => ({
            id: o.id,
            patientName: o.patient?.name || o.patient_name || 'Patient',
            patientId: o.patient_id,
            doctorName: o.doctor_name || 'Pending order',
            items: Array.isArray(o.items) ? o.items.length : 0,
            time: o.created_at,
            status: o.status,
        })),
        lowStockItems: lowStockItems.map((item) => ({
            id: item.id,
            name: item.name || item.medicine_name,
            quantity: item.quantity ?? item.stock ?? 0,
            minQuantity: item.min_quantity ?? item.reorder_level ?? 10,
            unit: item.unit || 'units',
            expiryDate: item.expiry_date,
            isLowStock: true,
        })),
    });
}));

// Profile completion endpoints
router.get(['/completion', '/owner/completion'], requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const completion = await pharmacyService.getPharmacyProfileCompletion(pharmacy.id, req.user.id);
    res.json({ success: true, data: completion });
}));

// Preferences endpoints
router.get(['/preferences', '/owner/preferences'], requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const preferences = await pharmacyService.getPharmacyPreferences(pharmacy.id, req.user.id);
    res.json({ success: true, data: preferences });
}));

router.put(['/preferences', '/owner/preferences'], requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const preferences = await pharmacyService.updatePharmacyPreferences(pharmacy.id, req.user.id, req.body || {});
    res.json({ success: true, data: preferences });
}));

// Get own pharmacy
router.get('/profile', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const profileCompletion = await pharmacyService.getPharmacyProfileCompletion(pharmacy.id, req.user.id);
    res.json({ success: true, data: pharmacy, profileCompletion });
}));

// Update pharmacy
router.put('/profile', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    // Whitelist allowed fields to prevent arbitrary column writes
    const allowed = [
        'name', 'phone', 'email', 'address', 'city', 'state', 'pincode',
        'latitude', 'longitude', 'license_number', 'licenseNumber',
        'drug_license_number', 'drugLicenseNumber', 'license_document_url', 'licenseDocumentUrl',
        'opening_time', 'closing_time', 'opening_hours', 'is_24_hours',
        'is_open', 'delivery_available', 'deliveryAvailable', 'offers_delivery', 'delivery_radius_km',
        'image_url', 'profile_image', 'profile_image_url', 'profileImage', 'is24Hours',
        'gst_number', 'facilities', 'description', 'accreditations'
    ];
    const safeUpdates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }
    const updated = await pharmacyService.updatePharmacy(pharmacy.id, req.user.id, safeUpdates);
    const profileCompletion = await pharmacyService.getPharmacyProfileCompletion(pharmacy.id, req.user.id);
    res.json({ success: true, data: updated, profileCompletion });
}));

router.use(requireRole(ROLES.PHARMACY_OWNER), requireApproval);

router.get('/associations/invites', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const data = await facilityAssociationService.getProviderInvites({
        providerType: 'pharmacy',
        ownerId: req.user.id,
    });
    res.json({ success: true, data });
}));

router.post('/associations/invites/:inviteId/respond', requireRole(ROLES.PHARMACY_OWNER), [
    param('inviteId').isUUID().withMessage('Invalid invite ID'),
    body('decision').isIn(['accept', 'reject']).withMessage('Decision must be accept or reject'),
    validate,
], asyncHandler(async (req, res) => {
    const data = await facilityAssociationService.respondToProviderInvite({
        providerType: 'pharmacy',
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
}));

router.get('/associations', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const data = await facilityAssociationService.getProviderAssociations({
        providerType: 'pharmacy',
        ownerId: req.user.id,
    });
    res.json({ success: true, data });
}));

// Inventory routes
router.get('/inventory', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { search, lowStock, category, page = 1, limit = 50 } = req.query;

    const result = await pharmacyService.getInventory(
        pharmacy.id,
        { search, lowStock: lowStock === 'true', category },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

router.post('/inventory', requireRole(ROLES.PHARMACY_OWNER), [
    body('name').trim().notEmpty().withMessage('Medicine name is required').isLength({ max: 200 }),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('expiry_date').optional().isISO8601(),
    validate,
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const item = await pharmacyService.addInventoryItem(pharmacy.id, req.user.id, req.body);
    // #13: Real-time inventory update
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, item);
    res.status(201).json({ success: true, data: item });
}));

router.post('/inventory/bulk', requireRole(ROLES.PHARMACY_OWNER), [
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    validate,
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const items = await pharmacyService.addBulkInventoryItems(pharmacy.id, req.user.id, req.body.items);

    // #13: Real-time inventory update (we just emit a refresh signal or multiple items)
    const eventEmitter = require('../services/eventEmitter');
    items.forEach(item => eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, item));

    res.status(201).json({ success: true, data: items });
}));

router.put('/inventory/:itemId', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const item = await pharmacyService.updateInventoryItem(
        req.params.itemId,
        pharmacy.id,
        req.user.id,
        req.body
    );
    // #13: Real-time inventory update
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, item);
    res.json({ success: true, data: item });
}));

router.delete('/inventory/:itemId', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    await pharmacyService.deleteInventoryItem(req.params.itemId, pharmacy.id, req.user.id);
    // #13: Real-time inventory update (removed item)
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, { id: req.params.itemId, deleted: true });
    res.json({ success: true });
}));

// Orders routes
router.get('/orders', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { status, group, search, page = 1, limit = 20 } = req.query;

    const result = await pharmacyService.getOrders(
        pharmacy.id,
        { status, group, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

router.patch('/orders/:orderId/status', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { status, notes } = req.body;

    const order = await pharmacyService.updateOrderStatus(
        req.params.orderId,
        pharmacy.id,
        req.user.id,
        status,
        notes
    );

    res.json({ success: true, data: order });
}));

// Prescriptions routes
router.get('/prescriptions', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const { status, search, page = 1, limit = 20 } = req.query;
    const { supabaseAdmin } = require('../config/supabase');
    const normalizedPage = parseInt(page) > 0 ? parseInt(page) : 1;
    const normalizedLimit = parseInt(limit) > 0 ? parseInt(limit) : 20;
    const offset = (normalizedPage - 1) * normalizedLimit;
    const searchTerm = sanitizeSearch(search || '').toLowerCase();

    // Get current user's pharmacy profile scope the query
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);

    // Prescriptions don't have pharmacy_id directly — find prescriptions
    // that have orders placed at this pharmacy via pharmacy_orders.prescription_id
    const { data: orderPrescriptionIds } = await supabaseAdmin
        .from('pharmacy_orders')
        .select('prescription_id')
        .eq('pharmacy_id', pharmacy.id)
        .not('prescription_id', 'is', null);

    const prescriptionIds = (orderPrescriptionIds || [])
        .map(o => o.prescription_id)
        .filter(Boolean);

    if (prescriptionIds.length === 0) {
        return res.json({
            success: true,
            data: [],
            pagination: { page: normalizedPage, limit: normalizedLimit, total: 0, totalPages: 1 }
        });
    }

    let query = supabaseAdmin
        .from('prescriptions')
        .select(`
            *,
            prescription_medicines (*),
            patients (id, name),
            doctors (id, name, specialization)
        `, { count: 'exact' })
        .in('id', prescriptionIds)
        .order('created_at', { ascending: false });

    if (status) {
        if (status === 'pending') {
            query = query.in('status', ['pending', 'ready']);
        } else if (status === 'dispensed') {
            query = query.in('status', ['dispensed', 'fulfilled']);
        } else {
            query = query.eq('status', status);
        }
    }

    if (searchTerm) {
        const { data, error } = await query;

        if (error) throw error;

        const filtered = (data || []).filter((prescription) => {
            const terms = [
                prescription.id,
                prescription.patients?.name,
                prescription.doctors?.name,
                ...(Array.isArray(prescription.prescription_medicines)
                    ? prescription.prescription_medicines.map((medicine) => medicine.medicine_name || medicine.name)
                    : []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return terms.includes(searchTerm);
        });

        return res.json({
            success: true,
            data: filtered.slice(offset, offset + normalizedLimit),
            pagination: {
                page: normalizedPage,
                limit: normalizedLimit,
                total: filtered.length,
                totalPages: Math.max(1, Math.ceil(filtered.length / normalizedLimit)),
            },
        });
    }

    const { data, error, count } = await query.range(offset, offset + normalizedLimit - 1);

    if (error) throw error;

    res.json({
        success: true,
        data: data || [],
        pagination: {
            page: normalizedPage,
            limit: normalizedLimit,
            total: count || 0,
            totalPages: Math.max(1, Math.ceil((count || 0) / normalizedLimit)),
        },
    });
}));

// Reels routes
router.post('/reels', requireRole(ROLES.PHARMACY_OWNER), requireApproval, [
    body('videoUrl').isURL().withMessage('Valid video URL required'),
    body('thumbnailUrl').optional().isURL(),
    body('title').optional().trim().isLength({ max: 200 }),
    validate
], asyncHandler(async (req, res) => {
    const { videoUrl, thumbnailUrl, title } = req.body;
    const result = await pharmacyService.addReel(req.user.id, {
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        title
    });
    res.status(201).json({ success: true, data: result });
}));

router.delete('/reels/:reelId', requireRole(ROLES.PHARMACY_OWNER), requireApproval, asyncHandler(async (req, res) => {
    await pharmacyService.deleteReel(req.user.id, req.params.reelId);
    res.json({ success: true, message: 'Reel deleted successfully' });
}));

router.patch('/prescriptions/:prescriptionId/dispense', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');

    // Verify this pharmacy has an order linked to this prescription
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { data: linkedOrder } = await supabaseAdmin
        .from('pharmacy_orders')
        .select('id')
        .eq('pharmacy_id', pharmacy.id)
        .eq('prescription_id', req.params.prescriptionId)
        .limit(1)
        .maybeSingle();

    if (!linkedOrder) {
        return res.status(403).json({ success: false, message: 'This prescription is not linked to your pharmacy' });
    }

    const { data, error } = await supabaseAdmin
        .from('prescriptions')
        .update({
            is_dispensed: true,
            dispensed_at: new Date().toISOString(),
            dispensed_by: req.user.id,
            status: 'fulfilled',
        })
        .eq('id', req.params.prescriptionId)
        .select()
        .single();

    if (error) throw error;

    res.json({ success: true, data });
}));

// Analytics
router.get('/analytics', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { period = '30d' } = req.query;

    const analytics = await pharmacyService.getAnalytics(pharmacy.id, req.user.id, period);
    res.json({ success: true, ...analytics });
}));

// Reviews
router.get('/reviews', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { page = 1, limit = 10 } = req.query;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('pharmacy', pharmacy.id, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

// ==================== UNIFIED PARTNERSHIPS ====================

router.get('/partnerships', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { status } = req.query;

    const partnerships = await organizationPartnershipService.getPartnerships({
        orgType: 'pharmacy',
        orgId: pharmacy.id,
        status
    });

    res.json({ success: true, data: partnerships });
}));

router.post('/partnerships/invite', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    body('targetType').customSanitizer(val => {
        if (!val) return val;
        const v = String(val).toLowerCase().trim();
        if (['diagnostic_center', 'diagnostic_lab', 'diagnostic', 'diagnostics', 'lab'].includes(v)) return 'diagnostic_center';
        return v;
    }).isIn(['hospital', 'clinic', 'diagnostic_center']).withMessage('Invalid target type'),
    body('targetId').isUUID().withMessage('Valid target ID required'),
    body('partnershipType').optional().isString(),
    body('metadata').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);

    const request = await organizationPartnershipService.createPartnershipRequest({
        initiatorType: 'pharmacy',
        initiatorId: pharmacy.id,
        initiatorUserId: req.user.id,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        partnershipType: req.body.partnershipType,
        metadata: req.body.metadata || {}
    });

    res.status(201).json({ success: true, data: request, message: 'Partnership invitation sent successfully.' });
}));

router.post('/partnerships/:id/respond', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.respondToPartnershipRequest(
        req.params.id, 'pharmacy', pharmacy.id, req.body.action
    );
    res.json({ success: true, data: updated, message: `Partnership invitation ${req.body.action}ed successfully.` });
}));

router.post('/partnerships/:id/request-changes', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('message').isString().notEmpty().withMessage('Message is required'),
    body('metadataUpdates').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.requestChanges(
        req.params.id, 'pharmacy', pharmacy.id, req.body.message, req.body.metadataUpdates
    );
    res.json({ success: true, data: updated, message: 'Changes requested successfully.' });
}));

router.post('/partnerships/:id/accept-changes', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.acceptChanges(req.params.id, 'pharmacy', pharmacy.id);
    res.json({ success: true, data: updated, message: 'Changes accepted successfully.' });
}));

router.delete('/partnerships/:id', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    await organizationPartnershipService.terminatePartnership(req.params.id, 'pharmacy', pharmacy.id);
    res.json({ success: true, message: 'Partnership terminated successfully.' });
}));

module.exports = router;
