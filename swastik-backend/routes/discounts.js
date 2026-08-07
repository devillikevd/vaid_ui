/**
 * Discount Campaigns Routes
 * Admin-controlled discount campaigns; pharmacies opt-in/opt-out.
 */
const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireRole, requireApproval, ROLES } = require('../middleware/rbac');
const { asyncHandler } = require('../middleware/errorHandler');
const { body, param, query: queryValidator } = require('express-validator');
const { validate } = require('../middleware/validate');
const { computeBestPrices } = require('../services/discountService');
const pharmacyService = require('../services/pharmacyService');

// Resolve the pharmacy id for a pharmacy-owner user (mirrors routes/pharmacy.js)
const getPharmacyId = async (userId) => {
  const pharmacy = await pharmacyService.getPharmacyByOwner(userId);
  return pharmacy.id;
};

// ==================== PUBLIC / CATALOGUE ROUTES ====================

// Get applicable campaigns for a list of medicines
router.post('/campaigns/applicable',
    optionalAuth,
    [
        body('medicine_ids').isArray({ min: 1 }),
        body('medicine_ids.*').isUUID(),
        body('pharmacy_id').optional().isUUID(),
        body('latitude').optional().isFloat(),
        body('longitude').optional().isFloat()
    ],
    validate,
    asyncHandler(async (req, res) => {
        const { medicine_ids, pharmacy_id } = req.body;
        const now = new Date().toISOString();

        let query = supabaseAdmin
            .from('discount_campaigns')
            .select(`
                *,
                campaign_pharmacy_optins(pharmacy_id, is_active)
            `)
            .eq('is_active', true)
            .lte('start_at', now)
            .gte('end_at', now)
            .or(`scope_type.eq.global,scope_type.eq.medicine`);

        const { data, error } = await query;

        if (error) return res.status(400).json({ success: false, message: error.message });

        // Filter medicine-scoped campaigns to those matching requested ids; filter opt-ins
        const result = (data || []).filter(c => {
            if (c.scope_type === 'medicine') {
                if (!c.scope_ref || !medicine_ids.includes(c.scope_ref)) return false;
            }
            if (pharmacy_id && c.scope_type !== 'global') {
                const optins = (c.campaign_pharmacy_optins || []).filter(o => o.pharmacy_id === pharmacy_id && o.is_active);
                if (optins.length === 0) return false;
            }
            return true;
        }).map(c => ({ ...c, campaign_pharmacy_optins: undefined }));

        res.json({ success: true, data: result });
    })
);

// Calculate best campaign price for multiple medicines at a pharmacy (or global catalogue price)
router.post('/campaigns/best-price',
    optionalAuth,
    [
        body('medicine_ids').isArray({ min: 1 }),
        body('medicine_ids.*').isUUID(),
        body('pharmacy_id').optional().isUUID(),
        body('latitude').optional().isFloat(),
        body('longitude').optional().isFloat()
    ],
    validate,
    asyncHandler(async (req, res) => {
        const { medicine_ids, pharmacy_id, quantity = 1 } = req.body;
        const results = await computeBestPrices(medicine_ids, {
            pharmacyId: pharmacy_id || null,
            quantity,
            userId: req.user?.id || null,
        });
        res.json({ success: true, data: results });
    })
);

// ==================== AUTHENTICATED ROUTES ====================

router.use(authenticate);

// ==================== ADMIN ROUTES ====================

// Create campaign (Admin only)
router.post('/campaigns',
    requireRole(ROLES.ADMIN),
    [
        body('name').trim().isLength({ min: 3, max: 255 }),
        body('discount_type').isIn(['percentage', 'flat']),
        body('discount_value').isFloat({ gt: 0 }),
        body('scope_type').isIn(['global', 'category', 'brand', 'medicine']),
        body('start_at').isISO8601(),
        body('end_at').isISO8601(),
        body('min_order_value').optional().isFloat({ min: 0 }),
        body('max_discount_per_order').optional().isFloat({ min: 0 }),
        body('max_redemptions_total').optional().isInt({ min: 1 }),
        body('max_redemptions_per_user').optional().isInt({ min: 1 }),
        body('scope_ref').optional().isString()
    ],
    validate,
    asyncHandler(async (req, res) => {
        const {
            name, description, discount_type, discount_value, scope_type, scope_ref,
            min_order_value, max_discount_per_order, max_redemptions_total,
            max_redemptions_per_user, start_at, end_at
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('discount_campaigns')
            .insert({
                name,
                description: description || null,
                discount_type,
                discount_value,
                scope_type,
                scope_ref: scope_ref || null,
                min_order_value: min_order_value || 0,
                max_discount_per_order: max_discount_per_order || null,
                max_redemptions_total: max_redemptions_total || null,
                max_redemptions_per_user: max_redemptions_per_user || 1,
                start_at,
                end_at,
                created_by: req.user.id
            })
            .select()
            .single();

        if (error) return res.status(400).json({ success: false, message: error.message });
        res.status(201).json({ success: true, data });
    })
);

// List campaigns (Admin)
router.get('/campaigns',
    requireRole(ROLES.ADMIN),
    [
        queryValidator('page').optional().isInt({ min: 1 }),
        queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
        queryValidator('status').optional().isIn(['active', 'upcoming', 'expired', 'all']),
        queryValidator('scope_type').optional().isIn(['global', 'category', 'brand', 'medicine'])
    ],
    validate,
    asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const { status, scope_type } = req.query;

        let query = supabaseAdmin.from('discount_campaigns').select('*', { count: 'exact' });
        if (scope_type) query = query.eq('scope_type', scope_type);

        const now = new Date().toISOString();
        if (status && status !== 'all') {
            if (status === 'active') {
                query = query.eq('is_active', true).lte('start_at', now).gte('end_at', now);
            } else if (status === 'upcoming') {
                query = query.eq('is_active', true).gt('start_at', now);
            } else if (status === 'expired') {
                query = query.or(`is_active.eq.false,end_at.lt.${now}`);
            }
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, data, pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } });
    })
);

// Get campaign by ID (Admin) — with opt-in pharmacy count and redemption count
router.get('/campaigns/:id',
    requireRole(ROLES.ADMIN),
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req, res) => {
        const { data, error } = await supabaseAdmin
            .from('discount_campaigns')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) return res.status(404).json({ success: false, message: 'Campaign not found' });

        const [{ count: optedIn }, { count: totalRedemptions }] = await Promise.all([
            supabaseAdmin.from('campaign_pharmacy_optins')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', req.params.id)
                .eq('is_active', true),
            supabaseAdmin.from('campaign_redemptions')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', req.params.id),
        ]);

        res.json({
            success: true,
            data: {
                ...data,
                opted_in_pharmacies: optedIn || 0,
                total_redemptions: totalRedemptions || 0,
            }
        });
    })
);

// Update campaign (Admin)
router.put('/campaigns/:id',
    requireRole(ROLES.ADMIN),
    [
        param('id').isUUID(),
        body('name').optional().trim().isLength({ min: 3, max: 255 }),
        body('discount_value').optional().isFloat({ gt: 0 }),
        body('min_order_value').optional().isFloat({ min: 0 }),
        body('max_discount_per_order').optional().isFloat({ min: 0 }),
        body('max_redemptions_total').optional().isInt({ min: 1 }),
        body('max_redemptions_per_user').optional().isInt({ min: 1 }),
        body('is_active').optional().isBoolean(),
        body('start_at').optional().isISO8601(),
        body('end_at').optional().isISO8601()
    ],
    validate,
    asyncHandler(async (req, res) => {
        const allowed = ['name', 'description', 'discount_value', 'min_order_value', 'max_discount_per_order',
                         'max_redemptions_total', 'max_redemptions_per_user', 'is_active', 'start_at', 'end_at'];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        const { data, error } = await supabaseAdmin
            .from('discount_campaigns')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) return res.status(400).json({ success: false, message: error.message });
        if (!data) return res.status(404).json({ success: false, message: 'Campaign not found' });
        res.json({ success: true, data });
    })
);

// Delete campaign (Admin)
router.delete('/campaigns/:id',
    requireRole(ROLES.ADMIN),
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req, res) => {
        const { error } = await supabaseAdmin
            .from('discount_campaigns')
            .delete()
            .eq('id', req.params.id);
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Campaign deleted' });
    })
);

// ==================== PHARMACY ROUTES ====================

// List campaigns available for pharmacy to opt-in
router.get('/pharmacy/campaigns/available',
    requireRole(ROLES.PHARMACY_OWNER),
    requireApproval,
    [queryValidator('status').optional().isIn(['active', 'upcoming'])],
    validate,
    asyncHandler(async (req, res) => {
        const pharmacyId = await getPharmacyId(req.user.id);
        const { status } = req.query;
        const now = new Date().toISOString();

        let query = supabaseAdmin
            .from('discount_campaigns')
            .select('*, campaign_pharmacy_optins(pharmacy_id, is_active)')
            .eq('is_active', true)
            .gte('end_at', now);
        if (status === 'active') query = query.lte('start_at', now);
        else if (status === 'upcoming') query = query.gt('start_at', now);

        const { data, error } = await query.order('start_at', { ascending: true });

        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({
            success: true,
            data: (data || []).map(c => ({
                ...c,
                opted_in: (c.campaign_pharmacy_optins || []).some(o => o.pharmacy_id === pharmacyId && o.is_active),
                campaign_pharmacy_optins: undefined
            }))
        });
    })
);

// Opt-in to campaign
router.post('/pharmacy/campaigns/:id/optin',
    requireRole(ROLES.PHARMACY_OWNER),
    requireApproval,
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req, res) => {
        const pharmacyId = await getPharmacyId(req.user.id);
        const campaignId = req.params.id;
        const now = new Date().toISOString();

        // Campaign must exist and be active/upcoming
        const { data: camp, error: campErr } = await supabaseAdmin
            .from('discount_campaigns')
            .select('id')
            .eq('id', campaignId)
            .eq('is_active', true)
            .gte('end_at', now)
            .maybeSingle();
        if (campErr) return res.status(400).json({ success: false, message: campErr.message });
        if (!camp) return res.status(404).json({ success: false, message: 'Campaign not found or not active' });

        // Upsert opt-in
        const { data, error } = await supabaseAdmin
            .from('campaign_pharmacy_optins')
            .upsert(
                { campaign_id: campaignId, pharmacy_id: pharmacyId, is_active: true, opted_in_at: now, opted_out_at: null },
                { onConflict: 'campaign_id,pharmacy_id' }
            )
            .select()
            .single();
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, data, message: 'Opted in successfully' });
    })
);

// Opt-out from campaign
router.post('/pharmacy/campaigns/:id/optout',
    requireRole(ROLES.PHARMACY_OWNER),
    requireApproval,
    [param('id').isUUID()],
    validate,
    asyncHandler(async (req, res) => {
        const pharmacyId = await getPharmacyId(req.user.id);
        const campaignId = req.params.id;

        const { error } = await supabaseAdmin
            .from('campaign_pharmacy_optins')
            .update({ is_active: false, opted_out_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('pharmacy_id', pharmacyId);
        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({ success: true, message: 'Opted out successfully' });
    })
);

// Get my opted-in campaigns
router.get('/pharmacy/campaigns/mine',
    requireRole(ROLES.PHARMACY_OWNER),
    requireApproval,
    validate,
    asyncHandler(async (req, res) => {
        const pharmacyId = await getPharmacyId(req.user.id);
        const now = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('campaign_pharmacy_optins')
            .select(`
                opted_in_at,
                campaign:discount_campaigns!inner(*)
            `)
            .eq('pharmacy_id', pharmacyId)
            .eq('is_active', true)
            .eq('campaign.is_active', true)
            .gte('campaign.end_at', now)
            .order('opted_in_at', { ascending: true });

        if (error) return res.status(400).json({ success: false, message: error.message });
        res.json({
            success: true,
            data: (data || []).map(row => ({
                ...(row.campaign || {}),
                opted_in_at: row.opted_in_at
            }))
        });
    })
);

module.exports = router;
