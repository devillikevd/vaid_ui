/**
 * Enhanced Admin Routes
 * Complete admin management with approval workflows for all provider types
 */
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const enhancedAdminService = require('../services/enhancedAdminService');
const { authenticate } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN));

// ==================== DASHBOARD ====================

/**
 * @route GET /api/admin/dashboard
 * @desc Get admin dashboard with all stats
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
    const dashboard = await enhancedAdminService.getDashboard();
    res.json({ success: true, data: dashboard });
}));

// ==================== APPROVAL WORKFLOW ====================

/**
 * @route GET /api/admin/approvals/pending
 * @desc Get all pending approvals (or by type)
 */
router.get('/approvals/pending', asyncHandler(async (req, res) => {
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const result = await enhancedAdminService.getPendingApprovals(
        type,
        parseInt(page),
        parseInt(limit)
    );
    res.json({ success: true, ...result });
}));

/**
 * @route GET /api/admin/providers
 * @desc Get normalized provider entities across all provider tables
 */
router.get('/providers', asyncHandler(async (req, res) => {
    const { type = 'all', status, search, page = 1, limit = 20 } = req.query;
    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (search) filters.search = search;

    const result = await enhancedAdminService.getProviders(
        filters,
        parseInt(page, 10),
        parseInt(limit, 10)
    );
    res.json({ success: true, ...result });
}));

/**
 * @route GET /api/admin/providers/:type/:id
 * @desc Get provider details for review
 */
router.get('/providers/:type/:id', [
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'ambulance']).withMessage('Invalid provider type'),
    param('id').isUUID('loose').withMessage('Invalid provider ID'),
    validate,
], asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const provider = await enhancedAdminService.getProviderDetails(type, id);
    res.json({ success: true, data: provider });
}));

/**
 * @route POST /api/admin/providers/:type/:id/approve
 * @desc Approve a provider
 */
router.post('/providers/:type/:id/approve', [
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'ambulance']).withMessage('Invalid provider type'),
    param('id').isUUID('loose').withMessage('Invalid provider ID'),
    body('notes').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { notes } = req.body;
    const result = await enhancedAdminService.approveProvider(type, id, req.user.id, notes);
    res.json({ success: true, ...result });
}));

/**
 * @route POST /api/admin/providers/:type/:id/reject
 * @desc Reject a provider
 */
router.post('/providers/:type/:id/reject', [
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'ambulance']).withMessage('Invalid provider type'),
    param('id').isUUID('loose').withMessage('Invalid provider ID'),
    body('reason').notEmpty().withMessage('Rejection reason is required').isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { reason } = req.body;
    const result = await enhancedAdminService.rejectProvider(type, id, req.user.id, reason);
    res.json({ success: true, ...result });
}));

/**
 * @route POST /api/admin/providers/:type/:id/suspend
 * @desc Suspend a provider
 */
router.post('/providers/:type/:id/suspend', [
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'ambulance']).withMessage('Invalid provider type'),
    param('id').isUUID('loose').withMessage('Invalid provider ID'),
    body('reason').notEmpty().withMessage('Suspension reason is required').isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { reason } = req.body;
    const result = await enhancedAdminService.suspendProvider(type, id, req.user.id, reason);
    res.json({ success: true, ...result });
}));

/**
 * @route POST /api/admin/providers/:type/:id/reactivate
 * @desc Reactivate a suspended provider
 */
router.post('/providers/:type/:id/reactivate', [
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'ambulance']).withMessage('Invalid provider type'),
    param('id').isUUID('loose').withMessage('Invalid provider ID'),
    body('notes').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { notes } = req.body;
    const result = await enhancedAdminService.reactivateProvider(type, id, req.user.id, notes);
    res.json({ success: true, ...result });
}));

/**
 * @route POST /api/admin/providers/:type/:id/notes
 * @desc Add admin note to a provider
 */
router.post('/providers/:type/:id/notes', [
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'ambulance']).withMessage('Invalid provider type'),
    param('id').isUUID('loose').withMessage('Invalid provider ID'),
    body('note').notEmpty().withMessage('Note content is required').isString().trim(),
    body('isInternal').optional().isBoolean(),
    validate,
], asyncHandler(async (req, res) => {
    const { type, id } = req.params;
    const { note, isInternal = true } = req.body;
    const result = await enhancedAdminService.addAdminNote(type, id, req.user.id, note, isInternal);
    res.json({ success: true, data: result });
}));

// ==================== USER MANAGEMENT ====================

/**
 * @route GET /api/admin/users
 * @desc Get all users with filters
 */
router.get('/users', asyncHandler(async (req, res) => {
    const { role, isVerified, isActive, search, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (role) filters.role = role;
    if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;

    const result = await enhancedAdminService.getUsers(filters, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

/**
 * @route PUT /api/admin/users/:id/status
 * @desc Update user active status
 */
router.put('/users/:id/status', [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
    body('reason').optional().isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive, reason } = req.body;
    const result = await enhancedAdminService.updateUserStatus(req.user.id, id, isActive, reason);
    res.json({ success: true, ...result });
}));

// ==================== SETTINGS ====================

/**
 * @route GET /api/admin/settings
 * @desc Get persisted admin portal settings
 */
router.get('/settings', asyncHandler(async (_req, res) => {
    const settings = await enhancedAdminService.getSettings();
    res.json({ success: true, data: settings });
}));

/**
 * @route PUT /api/admin/settings
 * @desc Update persisted admin portal settings
 */
router.put('/settings', [
    body('emailNotifications').optional().isBoolean(),
    body('smsNotifications').optional().isBoolean(),
    body('pushNotifications').optional().isBoolean(),
    body('twoFactorAuth').optional().isBoolean(),
    body('maintenanceMode').optional().isBoolean(),
    body('sessionTimeout').optional().isString().trim(),
    body('platformName').optional().isString().trim(),
    body('supportEmail').optional().isEmail(),
    validate,
], asyncHandler(async (req, res) => {
    const settings = await enhancedAdminService.updateSettings(req.user.id, req.body);
    res.json({ success: true, data: settings });
}));

// ==================== EMERGENCY MANAGEMENT ====================

/**
 * @route GET /api/admin/emergencies
 * @desc Get active emergency requests
 */
router.get('/emergencies', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = 'active' } = req.query;
    const result = await enhancedAdminService.getActiveEmergencies(
        parseInt(page, 10),
        parseInt(limit, 10),
        { status }
    );
    res.json({ success: true, ...result });
}));

/**
 * @route POST /api/admin/emergencies/:id/reassign
 * @desc Reassign an emergency to a different operator
 */
router.post('/emergencies/:id/reassign', [
    param('id').isUUID().withMessage('Invalid emergency ID'),
    body('operatorId').isUUID().withMessage('Valid operator ID is required'),
    body('reason').notEmpty().withMessage('Reason is required').isString().trim(),
    validate,
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { operatorId, reason } = req.body;
    const result = await enhancedAdminService.reassignEmergency(id, operatorId, req.user.id, reason);
    res.json({ success: true, ...result });
}));

/**
 * @route PATCH /api/admin/emergencies/:id/status
 * @desc Update emergency request status
 */
router.patch('/emergencies/:id/status', [
    param('id').isUUID().withMessage('Invalid emergency ID'),
    body('status').notEmpty().withMessage('Status is required').isString().trim()
        .isIn([
            'pending',
            'broadcasting',
            'assigned',
            'accepted',
            'dispatched',
            'en_route',
            'arrived',
            'picked_up',
            'en_route_hospital',
            'arrived_hospital',
            'completed',
            'cancelled',
            'timeout',
            'no_ambulance',
        ])
        .withMessage('Invalid status value'),
    validate,
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await enhancedAdminService.updateEmergencyStatus(id, status, req.user.id);
    res.json({ success: true, ...result });
}));

// ==================== COMPLIANCE ====================

/**
 * @route GET /api/admin/compliance/documents
 * @desc Get normalized provider compliance documents
 */
router.get('/compliance/documents', asyncHandler(async (req, res) => {
    const {
        days = 30,
        type = 'all',
        status = 'all',
        search,
        page = 1,
        limit = 20,
    } = req.query;

    const result = await enhancedAdminService.getComplianceDocuments(
        {
            days: parseInt(days, 10),
            type,
            status,
            search,
        },
        parseInt(page, 10),
        parseInt(limit, 10)
    );

    res.json({ success: true, data: result.data, pagination: result.pagination, summary: result.summary, coverage: result.coverage });
}));

/**
 * @route GET /api/admin/compliance/expiring-documents
 * @desc Backward-compatible compliance feed alias
 */
router.get('/compliance/expiring-documents', asyncHandler(async (req, res) => {
    const {
        days = 30,
        type = 'all',
        status = 'all',
        search,
        page = 1,
        limit = 20,
    } = req.query;

    const result = await enhancedAdminService.getComplianceDocuments(
        {
            days: parseInt(days, 10),
            type,
            status,
            search,
        },
        parseInt(page, 10),
        parseInt(limit, 10)
    );

    res.json({ success: true, data: result.data, pagination: result.pagination, summary: result.summary, coverage: result.coverage });
}));

// ==================== ANALYTICS ====================

/**
 * @route GET /api/admin/analytics
 * @desc Get platform analytics
 */
router.get('/analytics', asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;
    const analytics = await enhancedAdminService.getAnalytics(period);
    res.json({ success: true, data: analytics });
}));

// ==================== AUDIT LOGS ====================

/**
 * @route GET /api/admin/audit-logs
 * @desc Get audit logs with filters
 */
router.get('/audit-logs', asyncHandler(async (req, res) => {
    const { userId, action, resourceType, search, fromDate, toDate, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (search) filters.search = search;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const result = await enhancedAdminService.getAuditLogs(filters, parseInt(page), parseInt(limit));
    res.json({ success: true, ...result });
}));

// ==================== MEDICINES CATALOG (ADMIN) ====================

/**
 * @route GET /api/admin/medicines
 * @desc Paginated list of all medicines (including inactive) with search
 */
router.get('/medicines', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { supabaseAdmin } = require('../config/supabase');
    const { sanitizeSearch } = require('../utils/sanitize');

    let query = supabaseAdmin
        .from('medicines')
        .select('*', { count: 'exact' });

    if (search) {
        const q = sanitizeSearch(search);
        if (q) query = query.or(`name.ilike.%${q}%,generic_name.ilike.%${q}%,manufacturer.ilike.%${q}%`);
    }
    if (category) {
        query = query.eq('category', category);
    }

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
        success: true,
        data: data || [],
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count || 0,
            totalPages: Math.ceil((count || 0) / parseInt(limit)),
        },
    });
}));

/**
 * @route POST /api/admin/medicines
 * @desc Add a single medicine to the global catalog
 */
router.post('/medicines', [
    body('name').trim().notEmpty().withMessage('Medicine name is required'),
    validate,
], asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const m = req.body;

    const medicine = {
        name: m.name,
        generic_name: m.generic_name || null,
        manufacturer: m.manufacturer || null,
        category: m.category || null,
        subcategory: m.subcategory || null,
        description: m.description || null,
        form: m.form || null,
        dosage_form: m.dosage_form || null,
        strength: m.strength || null,
        pack_size: m.pack_size || null,
        price: parseFloat(m.price) || 0,
        mrp: parseFloat(m.mrp) || parseFloat(m.price) || 0,
        requires_prescription: m.requires_prescription === true || m.requires_prescription === 'true' || false,
        is_active: true,
    };

    const { data, error } = await supabaseAdmin
        .from('medicines')
        .insert(medicine)
        .select()
        .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
}));

/**
 * @route PUT /api/admin/medicines/:id
 * @desc Update a medicine in the global catalog
 */
router.put('/medicines/:id', [
    body('name').optional().trim().notEmpty().withMessage('Medicine name cannot be empty'),
    validate,
], asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const { id } = req.params;
    const m = req.body;

    const updates = {};
    if (m.name !== undefined) updates.name = m.name;
    if (m.generic_name !== undefined) updates.generic_name = m.generic_name || null;
    if (m.manufacturer !== undefined) updates.manufacturer = m.manufacturer || null;
    if (m.category !== undefined) updates.category = m.category || null;
    if (m.subcategory !== undefined) updates.subcategory = m.subcategory || null;
    if (m.description !== undefined) updates.description = m.description || null;
    if (m.form !== undefined) updates.form = m.form || null;
    if (m.dosage_form !== undefined) updates.dosage_form = m.dosage_form || null;
    if (m.strength !== undefined) updates.strength = m.strength || null;
    if (m.pack_size !== undefined) updates.pack_size = m.pack_size || null;
    if (m.price !== undefined) updates.price = parseFloat(m.price) || 0;
    if (m.mrp !== undefined) updates.mrp = parseFloat(m.mrp) || 0;
    if (m.requires_prescription !== undefined) updates.requires_prescription = m.requires_prescription === true || m.requires_prescription === 'true';
    if (m.is_active !== undefined) updates.is_active = m.is_active === true || m.is_active === 'true';

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const { data, error } = await supabaseAdmin
        .from('medicines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Medicine not found' });

    res.json({ success: true, data });
}));

/**
 * @route DELETE /api/admin/medicines/:id
 * @desc Soft-delete a medicine (sets is_active = false)
 */
router.delete('/medicines/:id', asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
        .from('medicines')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Medicine not found' });

    res.json({ success: true, message: 'Medicine deactivated successfully' });
}));

/**
 * @route POST /api/admin/medicines/bulk
 * @desc Bulk import global medicines catalog
 */
router.post('/medicines/bulk', [
    body('medicines').isArray().withMessage('medicines must be an array'),
    validate,
], asyncHandler(async (req, res) => {
    const { medicines } = req.body;
    
    // Validate each medicine loosely to avoid failing whole batch unnecessarily
    const validMedicines = medicines.filter(m => m.name).map(m => ({
        name: m.name,
        generic_name: m.generic_name || m.genericname || m.genericName || null,
        manufacturer: m.manufacturer || null,
        category: m.category || null,
        subcategory: m.subcategory || null,
        description: m.description || null,
        form: m.form || null,
        dosage_form: m.dosage_form || m.dosageform || m.dosageForm || null,
        strength: m.strength || null,
        pack_size: m.pack_size || m.packsize || m.packSize || null,
        price: parseFloat(m.price) || 0,
        mrp: parseFloat(m.mrp) || parseFloat(m.price) || 0,
        requires_prescription: m.requires_prescription === 'true' || m.requiresprescription === 'true' || m.requiresPrescription === true || false,
    }));

    if (validMedicines.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid medicines found to import' });
    }

    // Insert into Supabase directly since we don't have a specific service method yet
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin.from('medicines').insert(validMedicines);

    if (error) {
        console.error('Error importing medicines:', error);
        return res.status(500).json({ success: false, message: 'Failed to import medicines', error: error.message });
    }

    res.json({ success: true, message: `Successfully imported ${validMedicines.length} medicines` });
}));

// ==================== SYSTEM ====================

/**
 * @route GET /api/admin/system/health
 * @desc Get system health status
 */
router.get('/system/health', asyncHandler(async (req, res) => {
    const health = await enhancedAdminService.getSystemHealth();
    res.json({ success: true, data: health });
}));

/**
 * GET /api/admin/fleet
 * Fetch all ambulances for live tracking map
 */
router.get('/fleet', asyncHandler(async (req, res) => {
    // Return all ambulances that have non-null coordinates
    const { supabaseAdmin } = require('../config/supabase');
    const { data: ambulances, error } = await supabaseAdmin
        .from('ambulances')
        .select(`
            id,
            vehicle_number,
            driver_name,
            driver_phone,
            vehicle_type,
            status,
            current_latitude,
            current_longitude
        `)
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null);

    if (error) {
        console.error('Fleet fetch error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch fleet data' });
    }

    res.json({ success: true, data: ambulances });
}));

module.exports = router;
