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
const { requireRole, requireApproval, ROLES, requirePharmacyMember } = require('../middleware/rbac');
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

// Dashboard - aggregate data for pharmacy members
router.get('/dashboard', requirePharmacyMember, requireApproval, asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);

    // Get inventory with low stock filter
    const inventoryResult = await pharmacyService.getInventory(pharmacy.id, { lowStock: 'true' }, 1, 50);
    const lowStockItems = inventoryResult.items || inventoryResult.data || [];

    // Get pending orders
    const ordersResult = await pharmacyService.getOrders(pharmacy.id, { status: 'pending' }, 1, 20);
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
        pendingPrescriptions: pendingOrders.map(o => ({
            id: o.id,
            patientName: o.patient?.name || o.patient_name || 'Patient',
            patientId: o.patient_id,
            doctorName: o.doctor_name || 'Pending order',
            items: Array.isArray(o.items) ? o.items.length : 0,
            time: o.created_at,
            status: o.status,
        })),
        lowStockItems: lowStockItems.map(item => ({
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

// Get own pharmacy
router.get('/profile', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    res.json({ success: true, data: pharmacy });
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
        'image_url', 'profile_image', 'profile_image_url', 'profileImage', 'is24Hours'
    ];
    const safeUpdates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) safeUpdates[key] = req.body[key];
    }
    const updated = await pharmacyService.updatePharmacy(pharmacy.id, req.user.id, safeUpdates);
    res.json({ success: true, data: updated });
}));

// Global auth guard for all subsequent routes:
// - Requires authentication (already applied globally via router.use(authenticate))
// - requirePharmacyMember validates role AND live membership/status, attaching req.pharmacyId
// - requireApproval is still applied on the specific routes that need it (owner-level)
router.use(requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER, ROLES.PHARMACY_STAFF), requirePharmacyMember);

// Owner-only: Associations (B2B)
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

// ==========================================
// UNIFIED ORGANIZATION PARTNERSHIPS (PHASE 1)
// ==========================================

router.get('/partnerships', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const { status } = req.query;
    
    const partnerships = await organizationPartnershipService.getPartnerships({
        orgType: 'pharmacy',
        orgId: pharmacy.id,
        status
    });
    
    res.json({ success: true, data: partnerships });
}));

router.post('/partnerships/invite', requireRole(ROLES.PHARMACY_OWNER), [
    body('targetType').isIn(['clinic', 'hospital', 'diagnostic_center']).withMessage('Invalid target type'),
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

router.post('/partnerships/:id/respond', requireRole(ROLES.PHARMACY_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.respondToPartnershipRequest(
        req.params.id, 'pharmacy', pharmacy.id, req.body.action
    );
    res.json({ success: true, data: updated, message: `Partnership ${req.body.action}ed successfully.` });
}));

router.post('/partnerships/:id/request-changes', requireRole(ROLES.PHARMACY_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    body('message').isString().notEmpty().withMessage('Changes message is required'),
    body('metadataUpdates').optional().isObject(),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.requestChanges(
        req.params.id, 'pharmacy', pharmacy.id, req.body.message, req.body.metadataUpdates || {}
    );
    res.json({ success: true, data: updated, message: 'Changes requested successfully.' });
}));

router.post('/partnerships/:id/accept-changes', requireRole(ROLES.PHARMACY_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.acceptChanges(req.params.id, 'pharmacy', pharmacy.id);
    res.json({ success: true, data: updated, message: 'Changes accepted successfully.' });
}));

router.delete('/partnerships/:id', requireRole(ROLES.PHARMACY_OWNER), [
    param('id').isUUID().withMessage('Valid partnership ID required'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await organizationPartnershipService.terminatePartnership(req.params.id, 'pharmacy', pharmacy.id);
    res.json({ success: true, data: updated, message: 'Partnership terminated successfully.' });
}));

// Inventory routes — read: all roles; write: owner + manager only
router.get('/inventory', asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const { search, lowStock, category, page = 1, limit = 50, sortBy, sortOrder } = req.query;

    const result = await pharmacyService.getInventory(
        pharmacy.id,
        { search, lowStock: lowStock === 'true', category, sortBy, sortOrder },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Add inventory — manager+owner only
router.post('/inventory', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    body('name').trim().notEmpty().withMessage('Medicine name is required').isLength({ max: 200 }),
    body('quantity').optional().isInt({ min: 0 }).withMessage('Quantity must be non-negative'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be non-negative'),
    body('expiry_date').optional().isISO8601(),
    validate,
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const item = await pharmacyService.addInventoryItem(pharmacy.id, req.user.id, req.body);
    // #13: Real-time inventory update
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, item);
    res.status(201).json({ success: true, data: item });
}));

// Bulk add inventory — manager+owner only
router.post('/inventory/bulk', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    validate,
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const items = await pharmacyService.addBulkInventoryItems(pharmacy.id, req.user.id, req.body.items);

    // #13: Real-time inventory update (we just emit a refresh signal or multiple items)
    const eventEmitter = require('../services/eventEmitter');
    items.forEach(item => eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, item));

    res.status(201).json({ success: true, data: items });
}));

// Update inventory item — manager+owner only
router.put('/inventory/:itemId', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
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

// Delete inventory item — owner only
router.delete('/inventory/:itemId', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    await pharmacyService.deleteInventoryItem(req.params.itemId, pharmacy.id, req.user.id);
    // #13: Real-time inventory update (removed item)
    const eventEmitter = require('../services/eventEmitter');
    eventEmitter.emitInventoryUpdated(pharmacy.id, req.user.id, { id: req.params.itemId, deleted: true });
    res.json({ success: true });
}));

// Orders routes — all roles
router.get('/orders', asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const { status, group, search, page = 1, limit = 20 } = req.query;

    const result = await pharmacyService.getOrders(
        pharmacy.id,
        { status, group, search },
        parseInt(page),
        parseInt(limit)
    );

    res.json({ success: true, ...result });
}));

// Order status update — all roles (service layer validates allowed transitions)
router.patch('/orders/:orderId/status', asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
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

// Prescriptions routes — all pharmacy roles
router.get('/prescriptions', asyncHandler(async (req, res) => {
    const { status, search, page = 1, limit = 20 } = req.query;
    const { supabaseAdmin } = require('../config/supabase');
    const normalizedPage = parseInt(page) > 0 ? parseInt(page) : 1;
    const normalizedLimit = parseInt(limit) > 0 ? parseInt(limit) : 20;
    const offset = (normalizedPage - 1) * normalizedLimit;
    const searchTerm = sanitizeSearch(search || '').toLowerCase();

    // Resolve pharmacy via role-aware lookup
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);

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

// Prescription detail — all pharmacy roles
// Only accessible if this pharmacy has a linked order for the prescription
router.get('/prescriptions/:prescriptionId', asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);

    // Verify this pharmacy has an order linked to this prescription
    const { data: linkedOrder } = await supabaseAdmin
        .from('pharmacy_orders')
        .select('id, status, payment_status, clinic_id, hospital_id, source, total_amount, created_at')
        .eq('pharmacy_id', pharmacy.id)
        .eq('prescription_id', req.params.prescriptionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!linkedOrder) {
        return res.status(403).json({ success: false, message: 'This prescription is not linked to your pharmacy' });
    }

    // Fetch prescription with related data
    const { data: prescription, error } = await supabaseAdmin
        .from('prescriptions')
        .select(`
            id,
            prescription_number,
            status,
            is_dispensed,
            dispensed_at,
            diagnosis,
            instructions,
            dietary_advice,
            lifestyle_advice,
            notes,
            valid_from,
            valid_until,
            file_url,
            pdf_url,
            created_at,
            updated_at,
            prescription_medicines (
                id,
                medicine_name,
                generic_name,
                dosage,
                frequency,
                duration,
                quantity,
                before_food,
                instructions,
                is_critical
            ),
            patients (id, name, gender, date_of_birth),
            doctors (id, name, specialization, phone)
        `)
        .eq('id', req.params.prescriptionId)
        .single();

    if (error || !prescription) {
        return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Enrich with clinic/hospital origin from linked order
    let clinicName = null;
    let hospitalName = null;
    if (linkedOrder.clinic_id) {
        const { data: clinic } = await supabaseAdmin
            .from('clinics')
            .select('name')
            .eq('id', linkedOrder.clinic_id)
            .maybeSingle();
        clinicName = clinic?.name || null;
    }
    if (linkedOrder.hospital_id) {
        const { data: hospital } = await supabaseAdmin
            .from('hospitals')
            .select('name')
            .eq('id', linkedOrder.hospital_id)
            .maybeSingle();
        hospitalName = hospital?.name || null;
    }

    res.json({
        success: true,
        data: {
            ...prescription,
            linked_order: linkedOrder,
            origin: {
                source: linkedOrder.clinic_id ? 'Partner Clinic'
                    : linkedOrder.hospital_id ? 'Partner Hospital'
                    : linkedOrder.source === 'pos' ? 'POS / Walk-in'
                    : 'Online / Patient',
                clinic_id: linkedOrder.clinic_id || null,
                clinic_name: clinicName,
                hospital_id: linkedOrder.hospital_id || null,
                hospital_name: hospitalName,
            },
        },
    });
}));

// Check inventory availability for a prescription — all pharmacy roles
router.get('/prescriptions/:prescriptionId/inventory-check', asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);

    // Verify access via linked order
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

    // Fetch prescription medicines
    const { data: medicines, error: medError } = await supabaseAdmin
        .from('prescription_medicines')
        .select('id, medicine_name, generic_name, quantity')
        .eq('prescription_id', req.params.prescriptionId);

    if (medError || !medicines || medicines.length === 0) {
        return res.json({ success: true, data: [] });
    }

    // For each prescription medicine, find inventory match
    // Priority: medicine_id match (when column exists), then name/generic_name match
    const today = new Date().toISOString().split('T')[0];
    const results = await Promise.all(
        medicines.map(async (med) => {
            // Try name-based inventory lookup (medicine_id column not yet applied on staging)
            const nameLower = (med.medicine_name || '').toLowerCase().trim();
            const genericLower = (med.generic_name || '').toLowerCase().trim();

            const { data: inventoryItems } = await supabaseAdmin
                .from('pharmacy_inventory')
                .select('id, name, generic_name, medicine_id, quantity, reserved_quantity, price, mrp, batch_number, expiry_date, is_available, reorder_level')
                .eq('pharmacy_id', pharmacy.id)
                .eq('is_available', true)
                .order('expiry_date', { ascending: true, nullsFirst: false });

            // Filter by name match (case-insensitive, prefer medicine_id match when column available)
            const matched = (inventoryItems || []).filter((inv) => {
                const invName = (inv.name || '').toLowerCase().trim();
                const invGeneric = (inv.generic_name || '').toLowerCase().trim();
                return invName === nameLower
                    || (genericLower && invGeneric === genericLower)
                    || (nameLower && invName.includes(nameLower))
                    || (genericLower && invGeneric.includes(genericLower));
            });

            const available = matched.filter((inv) => {
                const isExpired = inv.expiry_date && inv.expiry_date < today;
                const effectiveQty = (inv.quantity || 0) - (inv.reserved_quantity || 0);
                return !isExpired && effectiveQty > 0;
            });

            const totalAvailableQty = available.reduce(
                (sum, inv) => sum + ((inv.quantity || 0) - (inv.reserved_quantity || 0)),
                0
            );
            const requestedQty = med.quantity || 1;

            let availabilityStatus = 'unavailable';
            if (totalAvailableQty >= requestedQty) availabilityStatus = 'available';
            else if (totalAvailableQty > 0) availabilityStatus = 'partial';

            return {
                prescription_medicine_id: med.id,
                medicine_name: med.medicine_name,
                generic_name: med.generic_name,
                requested_quantity: requestedQty,
                availability_status: availabilityStatus,
                available_quantity: totalAvailableQty,
                inventory_matches: available.map((inv) => ({
                    inventory_id: inv.id,
                    name: inv.name,
                    generic_name: inv.generic_name,
                    medicine_id: inv.medicine_id || null,
                    quantity: inv.quantity,
                    reserved_quantity: inv.reserved_quantity || 0,
                    available_quantity: (inv.quantity || 0) - (inv.reserved_quantity || 0),
                    batch_number: inv.batch_number || null,
                    expiry_date: inv.expiry_date || null,
                    price: inv.price,
                    mrp: inv.mrp,
                    is_low_stock: (inv.quantity || 0) <= (inv.reorder_level || 10),
                })),
            };
        })
    );

    const overallStatus = results.every((r) => r.availability_status === 'available')
        ? 'all_available'
        : results.some((r) => r.availability_status === 'available' || r.availability_status === 'partial')
        ? 'partial'
        : 'unavailable';

    res.json({
        success: true,
        data: results,
        summary: {
            total_medicines: results.length,
            available: results.filter((r) => r.availability_status === 'available').length,
            partial: results.filter((r) => r.availability_status === 'partial').length,
            unavailable: results.filter((r) => r.availability_status === 'unavailable').length,
            overall_status: overallStatus,
        },
    });
}));

// Dispense prescription — all roles (pharmacist action)
router.patch('/prescriptions/:prescriptionId/dispense', asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');

    // Verify this pharmacy has an order linked to this prescription
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
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

// Analytics — owner + manager only
router.get('/analytics', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const { period = '30d' } = req.query;

    const analytics = await pharmacyService.getAnalytics(pharmacy.id, req.user.id, period);
    res.json({ success: true, ...analytics });
}));

// Analytics Export (CSV & PDF) — owner + manager only
router.get('/analytics/export', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const { period = '30d', format = 'csv' } = req.query;

    const result = await pharmacyService.getAnalytics(pharmacy.id, req.user.id, period);
    const analytics = result.data || {};
    const generatedAt = new Date().toISOString();

    if (format === 'csv') {
        const rows = [];
        rows.push(['SWASTIK PHARMACY ANALYTICS REPORT']);
        rows.push(['Pharmacy Name', pharmacy.name || 'Pharmacy']);
        rows.push(['Period', period]);
        rows.push(['Generated At', generatedAt]);
        rows.push([]);

        // 1. Overview
        rows.push(['1. BUSINESS OVERVIEW']);
        rows.push(['Metric', 'Value']);
        rows.push(['Total Orders', analytics.overview?.totalOrders ?? analytics.totalOrders ?? 0]);
        rows.push(['Pending Orders', analytics.overview?.pendingOrders ?? analytics.pendingOrders ?? 0]);
        rows.push(['Gross Sales (INR)', analytics.overview?.grossSales ?? 0]);
        rows.push(['Net Sales (INR)', analytics.overview?.netSales ?? 0]);
        rows.push(['Average Order Value (INR)', analytics.overview?.averageOrderValue ?? 0]);
        rows.push(['Paid Orders', analytics.overview?.paidOrders ?? 0]);
        rows.push(['Refunded Orders', analytics.overview?.refundedOrders ?? 0]);
        rows.push(['Refunded Amount (INR)', analytics.overview?.refundedAmount ?? 0]);
        rows.push([]);

        // 2. Trends
        rows.push(['2. REVENUE & ORDER TRENDS']);
        rows.push(['Date', 'Orders', 'Revenue (INR)']);
        (analytics.trends || []).forEach(t => {
            rows.push([t.date, t.orders, t.revenue]);
        });
        rows.push([]);

        // 3. Sales Sources
        rows.push(['3. SALES SOURCE BREAKDOWN']);
        rows.push(['Source', 'Order Count', 'Revenue (INR)']);
        (analytics.sources || []).forEach(s => {
            rows.push([s.source_label || s.source, s.order_count, s.revenue]);
        });
        rows.push([]);

        // 4. Inventory Intelligence
        rows.push(['4. INVENTORY INTELLIGENCE']);
        rows.push(['Metric', 'Count / Value']);
        rows.push(['Total Catalog Items', analytics.inventory?.total_items ?? analytics.totalInventoryItems ?? 0]);
        rows.push(['Total Physical Units', analytics.inventory?.total_units ?? 0]);
        rows.push(['Available Units', analytics.inventory?.available_units ?? 0]);
        rows.push(['Reserved Units', analytics.inventory?.reserved_units ?? 0]);
        rows.push(['Low Stock Items', analytics.inventory?.low_stock ?? analytics.lowStockItems ?? 0]);
        rows.push(['Out of Stock Items', analytics.inventory?.out_of_stock ?? 0]);
        rows.push(['Expired Items', analytics.inventory?.expired ?? 0]);
        rows.push(['Expiring in <=30 Days', analytics.inventory?.expiring_30 ?? 0]);
        rows.push(['Expiring in <=60 Days', analytics.inventory?.expiring_60 ?? 0]);
        rows.push(['Expiring in <=90 Days', analytics.inventory?.expiring_90 ?? 0]);
        rows.push(['Total Inventory Value (INR)', analytics.inventory?.inventory_value ?? analytics.totalInventoryValue ?? 0]);
        rows.push([]);

        // 5. Top Medicines
        rows.push(['5. TOP MEDICINES']);
        rows.push(['Medicine Name', 'Units Sold', 'Revenue (INR)']);
        (analytics.topMedicines || []).forEach(m => {
            rows.push([m.name, m.units_sold, m.revenue]);
        });
        rows.push([]);

        // 6. Slow-Moving Medicines
        rows.push(['6. SLOW-MOVING MEDICINES']);
        rows.push(['Medicine Name', 'Current Stock', 'Units Sold in Period', 'Daily Velocity (units/day)', 'Formula']);
        (analytics.slowMedicines || []).forEach(m => {
            rows.push([m.name, m.current_stock, m.units_sold, m.velocity, m.formula]);
        });
        rows.push([]);

        // 7. Partners
        rows.push(['7. PARTNER ANALYTICS']);
        rows.push(['Metric', 'Orders', 'Revenue (INR)']);
        rows.push(['Partner Clinic Orders', analytics.partners?.clinic_orders ?? 0, analytics.partners?.clinic_revenue ?? 0]);
        rows.push(['Partner Hospital Orders', analytics.partners?.hospital_orders ?? 0, analytics.partners?.hospital_revenue ?? 0]);
        rows.push(['Top Partners']);
        rows.push(['Partner Name', 'Type', 'Orders', 'Revenue (INR)']);
        (analytics.partners?.top_partners || []).forEach(p => {
            rows.push([p.partner_name, p.partner_type, p.orders, p.revenue]);
        });
        rows.push([]);

        // 8. Campaigns
        rows.push(['8. CAMPAIGN ANALYTICS']);
        rows.push(['Campaign Name', 'Redemptions', 'Discount Given (INR)']);
        (analytics.campaigns?.campaigns || []).forEach(c => {
            rows.push([c.campaign_name, c.redemptions, c.discount_amount]);
        });
        rows.push([]);

        // 9. Delivery
        rows.push(['9. DELIVERY ANALYTICS']);
        rows.push(['Metric', 'Value']);
        rows.push(['Total Delivery Orders', analytics.delivery?.total_delivery_orders ?? 0]);
        rows.push(['Assigned Orders', analytics.delivery?.assigned_orders ?? 0]);
        rows.push(['Dispatched Orders', analytics.delivery?.dispatched_orders ?? 0]);
        rows.push(['Delivered Orders', analytics.delivery?.delivered_orders ?? 0]);
        rows.push(['Pending Delivery', analytics.delivery?.pending_delivery ?? 0]);
        rows.push(['Average Delivery Time (mins)', analytics.delivery?.average_delivery_time_minutes ?? 0]);

        const csvContent = rows
            .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pharmacy-analytics-${period}-${Date.now()}.csv"`);
        return res.status(200).send(csvContent);
    }

    if (format === 'pdf') {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="pharmacy-analytics-${period}-${Date.now()}.pdf"`);
        doc.pipe(res);

        // Header
        doc.fillColor('#EA580C').fontSize(20).text('SWASTIK PHARMACY INTELLIGENCE REPORT', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#333333').fontSize(12).text(`Pharmacy: ${pharmacy.name || 'Pharmacy'}`, { align: 'center' });
        doc.fillColor('#666666').fontSize(10).text(`Period: ${period}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
        doc.moveDown(1);
        doc.strokeColor('#EA580C').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // Section 1: Overview
        doc.fillColor('#EA580C').fontSize(14).text('1. Business Overview');
        doc.moveDown(0.5);
        doc.fillColor('#111827').fontSize(10);
        doc.text(`Total Orders: ${analytics.overview?.totalOrders ?? analytics.totalOrders ?? 0}`);
        doc.text(`Pending Orders: ${analytics.overview?.pendingOrders ?? analytics.pendingOrders ?? 0}`);
        doc.text(`Gross Sales: INR ${Number(analytics.overview?.grossSales ?? 0).toLocaleString('en-IN')}`);
        doc.text(`Net Sales: INR ${Number(analytics.overview?.netSales ?? 0).toLocaleString('en-IN')}`);
        doc.text(`Average Order Value: INR ${Number(analytics.overview?.averageOrderValue ?? 0).toLocaleString('en-IN')}`);
        doc.text(`Paid Orders: ${analytics.overview?.paidOrders ?? 0}`);
        doc.text(`Refunded Amount: INR ${Number(analytics.overview?.refundedAmount ?? 0).toLocaleString('en-IN')}`);
        doc.moveDown(1);

        // Section 2: Inventory
        doc.fillColor('#EA580C').fontSize(14).text('2. Inventory Intelligence');
        doc.moveDown(0.5);
        doc.fillColor('#111827').fontSize(10);
        doc.text(`Total Catalog Items: ${analytics.inventory?.total_items ?? analytics.totalInventoryItems ?? 0}`);
        doc.text(`Total Physical Units: ${analytics.inventory?.total_units ?? 0} (Available: ${analytics.inventory?.available_units ?? 0}, Reserved: ${analytics.inventory?.reserved_units ?? 0})`);
        doc.text(`Low Stock Items: ${analytics.inventory?.low_stock ?? analytics.lowStockItems ?? 0}`);
        doc.text(`Out of Stock Items: ${analytics.inventory?.out_of_stock ?? 0}`);
        doc.text(`Expired Batches: ${analytics.inventory?.expired ?? 0}`);
        doc.text(`Expiring within 30 Days: ${analytics.inventory?.expiring_30 ?? 0}`);
        doc.text(`Total Inventory Value: INR ${Number(analytics.inventory?.inventory_value ?? analytics.totalInventoryValue ?? 0).toLocaleString('en-IN')}`);
        doc.moveDown(1);

        // Section 3: Sales Sources
        doc.fillColor('#EA580C').fontSize(14).text('3. Sales Sources');
        doc.moveDown(0.5);
        doc.fillColor('#111827').fontSize(10);
        if (!analytics.sources || analytics.sources.length === 0) {
            doc.fillColor('#6B7280').text('No sales recorded in this period.');
        } else {
            analytics.sources.forEach(s => {
                doc.fillColor('#111827').text(`${s.source_label || s.source}: ${s.order_count} orders (INR ${Number(s.revenue || 0).toLocaleString('en-IN')})`);
            });
        }
        doc.moveDown(1);

        // Section 4: Top Medicines
        doc.fillColor('#EA580C').fontSize(14).text('4. Top Medicines');
        doc.moveDown(0.5);
        doc.fillColor('#111827').fontSize(10);
        if (!analytics.topMedicines || analytics.topMedicines.length === 0) {
            doc.fillColor('#6B7280').text('No medicine sales recorded in this period.');
        } else {
            analytics.topMedicines.forEach((m, idx) => {
                doc.fillColor('#111827').text(`${idx + 1}. ${m.name} — ${m.units_sold} units (INR ${Number(m.revenue || 0).toLocaleString('en-IN')})`);
            });
        }
        doc.moveDown(1);

        // Section 5: Slow-Moving Medicines
        doc.fillColor('#EA580C').fontSize(14).text('5. Slow-Moving Medicines');
        doc.moveDown(0.5);
        doc.fillColor('#111827').fontSize(10);
        if (!analytics.slowMedicines || analytics.slowMedicines.length === 0) {
            doc.fillColor('#6B7280').text('No inventory items found.');
        } else {
            analytics.slowMedicines.slice(0, 5).forEach((m, idx) => {
                doc.fillColor('#111827').text(`${idx + 1}. ${m.name} — Stock: ${m.current_stock}, Sold: ${m.units_sold} (Velocity: ${m.velocity} units/day)`);
            });
        }
        doc.moveDown(1);

        // Footer
        doc.fontSize(8).fillColor('#9CA3AF').text(`Confidential report generated for ${pharmacy.name || 'Pharmacy'} on ${new Date().toISOString()}`, 40, 780, { align: 'center' });

        doc.end();
        return;
    }

    return res.status(400).json({ success: false, message: 'Invalid export format. Use csv or pdf.' });
}));


// Reviews — owner + manager only
router.get('/reviews', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const { page = 1, limit = 10 } = req.query;
    const reviewService = require('../services/reviewService');
    const result = await reviewService.getEntityReviews('pharmacy', pharmacy.id, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

// Respond to Pharmacy Review — owner + manager only
router.post('/reviews/:id/respond', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER), [
    param('id').isUUID().withMessage('Invalid review ID'),
    body('response').isString().notEmpty().withMessage('Response message is required'),
    validate
], asyncHandler(async (req, res) => {
    const reviewService = require('../services/reviewService');
    const updated = await reviewService.respondToReview(req.params.id, req.user.id, req.body.response);
    res.json({ success: true, data: updated, message: 'Response posted successfully' });
}));

// POS Checkout (Walk-in counter sale) — all pharmacy roles
router.post('/pos/checkout', requireRole(ROLES.PHARMACY_OWNER, ROLES.PHARMACY_MANAGER, ROLES.PHARMACY_STAFF), [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.inventoryItemId').isUUID().withMessage('Valid inventory item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('paymentMethod').isIn(['cash', 'upi', 'card']).withMessage('Valid payment method is required'),
    validate
], asyncHandler(async (req, res) => {
    // pharmacyId is always derived from server-side context (set by requirePharmacyMember)
    // Never trust any pharmacyId from the request body
    const pharmacy = await pharmacyService.getPharmacyByUser(req.user.id, req.user.role);
    const idempotencyKey = req.headers['idempotency-key'];
    
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, message: 'idempotency-key header is required' });
    }
    
    // Idempotency check
    const cacheKey = `pos_checkout_idempotency:${pharmacy.id}:${idempotencyKey}`;
    const { cacheSetIfNotExists, cacheGet } = require('../config/redis');
    
    const isNewRequest = await cacheSetIfNotExists(cacheKey, 'processing', 86400);
    
    if (!isNewRequest) {
        const existingState = await cacheGet(cacheKey);
        if (existingState && existingState.startsWith('completed:')) {
            const orderId = existingState.split(':')[1];
            return res.status(409).json({ success: false, message: 'Sale already processed', orderId });
        }
        return res.status(409).json({ success: false, message: 'Sale is currently being processed or was already processed.' });
    }
    
    try {
        const order = await pharmacyService.createPOSOrder(pharmacy.id, req.body);
        const { cacheSet } = require('../config/redis');
        await cacheSet(cacheKey, `completed:${order.id}`, 86400);
        res.json({ success: true, data: order, message: 'Sale completed successfully' });
    } catch (err) {
        const { cacheDel } = require('../config/redis');
        await cacheDel(cacheKey);
        throw err;
    }
}));

// ── Staff Management (owner-only) ─────────────────────────────────────────────

// List all members
router.get('/staff', requireRole(ROLES.PHARMACY_OWNER), asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const members = await pharmacyService.getPharmacyMembers(pharmacy.id);
    res.json({ success: true, data: members });
}));

// Invite a member by email
// Constraint: role is validated server-side in invitePharmacyMember — never trusted from client
router.post('/staff/invite', requireRole(ROLES.PHARMACY_OWNER), [
    body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
    body('role').isIn(['manager', 'staff']).withMessage('Role must be manager or staff'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    // The service validates the role again server-side before trusting it
    const result = await pharmacyService.invitePharmacyMember(
        pharmacy.id,
        req.user.id,
        req.body.email,
        req.body.role  // validated by service before use
    );
    res.status(201).json({ success: true, data: result, message: 'Member added successfully.' });
}));

// Update a member's role
router.patch('/staff/:memberId/role', requireRole(ROLES.PHARMACY_OWNER), [
    param('memberId').isUUID().withMessage('Valid member ID required'),
    body('role').isIn(['manager', 'staff']).withMessage('Role must be manager or staff'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await pharmacyService.updatePharmacyMemberRole(
        pharmacy.id,
        req.params.memberId,
        req.body.role  // validated by service before use
    );
    res.json({ success: true, data: updated, message: 'Role updated successfully.' });
}));

// Suspend or remove a member
router.patch('/staff/:memberId/status', requireRole(ROLES.PHARMACY_OWNER), [
    param('memberId').isUUID().withMessage('Valid member ID required'),
    body('action').isIn(['suspend', 'remove']).withMessage('Action must be suspend or remove'),
    validate
], asyncHandler(async (req, res) => {
    const pharmacy = await pharmacyService.getPharmacyByOwner(req.user.id);
    const updated = await pharmacyService.removePharmacyMember(
        pharmacy.id,
        req.params.memberId,
        req.body.action
    );
    res.json({ success: true, data: updated, message: `Member ${req.body.action}ed successfully.` });
}));

module.exports = router;

