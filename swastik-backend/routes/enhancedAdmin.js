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
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { deleteOldImageUrl } = require('../config/minio');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(ROLES.SUPER_ADMIN, ROLES.ADMIN));

// Category normalization helper — caches valid names from medicine_categories table
let _validCategoryCache = null;
let _categoryCacheTime = 0;
const normalizeCategory = async (category) => {
    if (!category) return null;
    const name = category.toString().trim().toLowerCase();
    if (!name) return null;
    const now = Date.now();
    if (!_validCategoryCache || now - _categoryCacheTime > 300000) {
        try {
            const { data } = await require('../config/supabase').supabaseAdmin
                .from('medicine_categories').select('name').eq('is_active', true);
            if (data) { _validCategoryCache = data.map(c => c.name); _categoryCacheTime = now; }
        } catch (_) {}
    }
    if (_validCategoryCache && _validCategoryCache.length > 0) {
        const exact = _validCategoryCache.find(c => c === name);
        if (exact) return exact;
        // Only partial match if name is 3+ chars and appears at word boundary
        if (name.length >= 3) {
            const partial = _validCategoryCache.find(c => c.startsWith(name) || name.startsWith(c));
            if (partial) return partial;
        }
        return name;
    }
    return name;
};

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
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'wellness_coach', 'fitness_center', 'ambulance']).withMessage('Invalid provider type'),
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
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'wellness_coach', 'fitness_center', 'ambulance']).withMessage('Invalid provider type'),
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
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'wellness_coach', 'fitness_center', 'ambulance']).withMessage('Invalid provider type'),
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
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'wellness_coach', 'fitness_center', 'ambulance']).withMessage('Invalid provider type'),
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
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'wellness_coach', 'fitness_center', 'ambulance']).withMessage('Invalid provider type'),
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
    param('type').isIn(['hospital', 'pharmacy', 'clinic', 'diagnostic_center', 'doctor', 'wellness_coach', 'fitness_center', 'ambulance']).withMessage('Invalid provider type'),
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

    const normalizedCategory = await normalizeCategory(m.category);

    const medicine = {
        name: m.name,
        generic_name: m.generic_name || null,
        manufacturer: m.manufacturer || null,
        category: normalizedCategory,
        subcategory: m.subcategory || null,
        description: m.description || null,
        form: m.form || null,
        dosage_form: m.dosage_form || null,
        strength: m.strength || null,
        pack_size: m.pack_size || null,
        price: parseFloat(m.price) || 0,
        mrp: parseFloat(m.mrp) || parseFloat(m.price) || 0,
        requires_prescription: m.requires_prescription === true || m.requires_prescription === 'true' || false,
        image_url: m.image_url || null,
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
    if (m.category !== undefined) updates.category = await normalizeCategory(m.category);
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
    if (m.image_url !== undefined) updates.image_url = m.image_url || null;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // Clean up old image from storage if image_url is being replaced
    if (updates.image_url !== undefined) {
        const { data: existing } = await supabaseAdmin
            .from('medicines').select('image_url').eq('id', id).maybeSingle();
        if (existing?.image_url && existing.image_url !== updates.image_url) {
            deleteOldImageUrl(existing.image_url).catch(() => {});
        }
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
    
    // Validate and normalize each medicine
    const validMedicines = (await Promise.all(medicines.filter(m => m.name).map(async m => {
        return {
            name: m.name,
            generic_name: m.generic_name || m.genericname || m.genericName || null,
            manufacturer: m.manufacturer || null,
            category: await normalizeCategory(m.category),
            dosage_form: m.dosage_form || m.dosageForm || null,
            strength: m.strength || null,
            price: parseFloat(m.price) || 0,
            mrp: parseFloat(m.mrp) || parseFloat(m.price) || 0,
            requires_prescription: m.requires_prescription === 'true' || m.requiresprescription === 'true' || m.requiresPrescription === true || false,
        };
    }))).filter(m => m.name);

    if (validMedicines.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid medicines found to import' });
    }

    // Insert into Supabase directly, dedup by name (case-insensitive)
    const { supabaseAdmin } = require('../config/supabase');
    
    // Fetch existing medicine names to skip duplicates
    const namesToCheck = validMedicines.map(m => m.name.toLowerCase());
    const { data: existingMedicines } = await supabaseAdmin
        .from('medicines')
        .select('name')
        .in('name', validMedicines.map(m => m.name));
    const existingNames = new Set((existingMedicines || []).map(m => m.name.toLowerCase()));
    
    const newMedicines = validMedicines.filter(m => !existingNames.has(m.name.toLowerCase()));
    const skippedCount = validMedicines.length - newMedicines.length;
    
    if (newMedicines.length === 0) {
        return res.json({ success: true, message: `All ${skippedCount} medicines already exist in catalog`, skipped: skippedCount });
    }

    const { data, error } = await supabaseAdmin.from('medicines').insert(newMedicines);

    if (error) {
        console.error('Error importing medicines:', error);
        return res.status(500).json({ success: false, message: 'Failed to import medicines', error: error.message });
    }

    const msg = skippedCount > 0 
        ? `Imported ${newMedicines.length} medicines, skipped ${skippedCount} duplicates`
        : `Successfully imported ${newMedicines.length} medicines`;
    res.json({ success: true, message: msg, imported: newMedicines.length, skipped: skippedCount });
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


// ==================== MASTER DIAGNOSTIC TESTS ====================

/**
 * @route GET /api/admin/master-tests
 * @desc Get all master diagnostic tests
 */
router.get('/master-tests', asyncHandler(async (req, res) => {
    const { search, category, is_active, page = 1, limit = 20 } = req.query;
    
    let query = enhancedAdminService.rawSupabaseAdmin
        .from('master_diagnostic_tests')
        .select('*', { count: 'exact' });

    if (search) {
        query = query.ilike('name', `%${search}%`);
    }
    if (category) {
        query = query.eq('category', category);
    }
    if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    query = query.range(from, to).order('name', { ascending: true });

    const { data, count, error } = await query;

    if (error) throw new ApiError(500, error.message);

    res.json({
        success: true,
        data,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
        }
    });
}));

/**
 * @route POST /api/admin/master-tests
 * @desc Create a new master diagnostic test
 */
router.post('/master-tests', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('price').optional().isNumeric(),
], validate, asyncHandler(async (req, res) => {
    const testData = req.body;
    
    const { data, error } = await enhancedAdminService.rawSupabaseAdmin
        .from('master_diagnostic_tests')
        .insert([testData])
        .select()
        .single();

    if (error) {
        if (error.code === '23505') {
            throw new ApiError(400, 'Test with this name already exists');
        }
        throw new ApiError(500, error.message);
    }

    res.status(201).json({ success: true, data });
}));

/**
 * @route PUT /api/admin/master-tests/:id
 * @desc Update a master diagnostic test
 */
router.put('/master-tests/:id', validate, asyncHandler(async (req, res) => {
    const m = req.body;

    // Whitelist allowed fields to prevent mass-assignment attacks
    const ALLOWED_FIELDS = ['name', 'category', 'description', 'sample_type',
        'preparation_instructions', 'icon_url', 'price'];
    const safeUpdates = {};
    for (const key of ALLOWED_FIELDS) {
        if (m[key] !== undefined) safeUpdates[key] = m[key];
    }
    // Support common camelCase aliases from web payloads
    if (m.sampleType !== undefined) safeUpdates.sample_type = m.sampleType;
    if (m.preparationInstructions !== undefined) safeUpdates.preparation_instructions = m.preparationInstructions;
    if (m.iconUrl !== undefined) safeUpdates.icon_url = m.iconUrl;

    if (Object.keys(safeUpdates).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    // Clean up old icon from storage if icon_url is being replaced
    if (safeUpdates.icon_url !== undefined) {
        const { data: existing } = await enhancedAdminService.rawSupabaseAdmin
            .from('master_diagnostic_tests').select('icon_url').eq('id', req.params.id).maybeSingle();
        if (existing?.icon_url && existing.icon_url !== safeUpdates.icon_url) {
            deleteOldImageUrl(existing.icon_url).catch(() => {});
        }
    }

    const { data, error } = await enhancedAdminService.rawSupabaseAdmin
        .from('master_diagnostic_tests')
        .update(safeUpdates)
        .eq('id', req.params.id)
        .select()
        .single();

    if (error) throw new ApiError(500, error.message);
    if (!data) throw new ApiError(404, 'Test not found');

    res.json({ success: true, data });
}));

/**
 * @route DELETE /api/admin/master-tests/:id
 * @desc Delete a master diagnostic test
 */
router.delete('/master-tests/:id', asyncHandler(async (req, res) => {
    const { error } = await enhancedAdminService.rawSupabaseAdmin
        .from('master_diagnostic_tests')
        .delete()
        .eq('id', req.params.id);

    if (error) throw new ApiError(500, error.message);

    res.json({ success: true, message: 'Test deleted successfully' });
}));

/**
 * @route POST /api/admin/master-tests/bulk
 * @desc Bulk import master diagnostic tests
 */
router.post('/master-tests/bulk', [
    body('tests').isArray().withMessage('tests must be an array'),
    validate,
], asyncHandler(async (req, res) => {
    const { tests } = req.body;

    const validTests = tests.filter(t => t.name).map(t => ({
        name: t.name,
        category: t.category || null,
        description: t.description || null,
        sample_type: t.sample_type || t.sampletype || t.sampleType || null,
        preparation_instructions: t.preparation_instructions || t.preparationinstructions || t.preparationInstructions || null,
        icon_url: t.icon_url || t.iconurl || t.iconUrl || null,
    }));

    if (validTests.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid tests found to import' });
    }

    const { data, error } = await enhancedAdminService.rawSupabaseAdmin
        .from('master_diagnostic_tests')
        .insert(validTests)
        .select();

    if (error) {
        throw new ApiError(500, error.message);
    }

    res.status(201).json({ success: true, data, count: data?.length || 0 });
}));

// ==================== IMAGE HEALTH CHECK ====================

/**
 * @route GET /api/admin/image-health
 * @desc Dashboard showing medicines/tests missing images
 */
router.get('/image-health', asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');

    const [
        { count: totalMedicines },
        { count: medicinesWithImage },
        { count: totalTests },
        { count: testsWithIcon },
    ] = await Promise.all([
        supabaseAdmin.from('medicines').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('medicines').select('*', { count: 'exact', head: true }).eq('is_active', true).not('image_url', 'is', null),
        supabaseAdmin.from('master_diagnostic_tests').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('master_diagnostic_tests').select('*', { count: 'exact', head: true }).not('icon_url', 'is', null),
    ]);

    const missingMedicineImages = (totalMedicines || 0) - (medicinesWithImage || 0);
    const missingTestIcons = (totalTests || 0) - (testsWithIcon || 0);

    res.json({
        success: true,
        data: {
            medicines: {
                total: totalMedicines || 0,
                withImage: medicinesWithImage || 0,
                missingImage: missingMedicineImages,
                coveragePercent: totalMedicines ? Math.round((medicinesWithImage / totalMedicines) * 100) : 0,
            },
            tests: {
                total: totalTests || 0,
                withIcon: testsWithIcon || 0,
                missingIcon: missingTestIcons,
                coveragePercent: totalTests ? Math.round((testsWithIcon / totalTests) * 100) : 0,
            },
        },
    });
}));

module.exports = router;
