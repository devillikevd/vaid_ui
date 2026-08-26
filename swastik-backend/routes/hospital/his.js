/**
 * Public hospital HIS routes (no auth required for some, auth for bill estimates).
 * 
 * Mounted at: /api/hospitals
 * Provides bed availability and service catalog endpoints consumed by mobile app.
 */
const express = require('express');
const { param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { asyncHandler } = require('../../middleware/errorHandler');
const { supabaseAdmin } = require('../../config/supabase');

const router = express.Router();

// ──────────────────────────────────────────────────
// GET /:id/beds/available — Ward-wise bed availability (public)
// ──────────────────────────────────────────────────
router.get(
  '/:id/beds/available',
  [param('id').isUUID(), validate],
  asyncHandler(async (req, res) => {
    const hospitalId = req.params.id;

    const { data: wards, error } = await supabaseAdmin
      .from('hospital_wards')
      .select('id, name, ward_type, floor, total_beds, occupied_beds, charge_per_day')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    const wardList = (wards || []).map((w) => {
      const available = Math.max(0, (w.total_beds || 0) - (w.occupied_beds || 0));
      const occupancy = w.total_beds > 0 ? Math.round((w.occupied_beds / w.total_beds) * 100) : 0;
      return {
        ...w,
        available_beds: available,
        occupancy_percent: occupancy,
      };
    });

    const totalBeds = wardList.reduce((s, w) => s + (w.total_beds || 0), 0);
    const totalAvailable = wardList.reduce((s, w) => s + w.available_beds, 0);

    res.json({
      success: true,
      data: {
        wards: wardList,
        total_beds: totalBeds,
        total_available: totalAvailable,
        occupancy_percent: totalBeds > 0 ? Math.round(((totalBeds - totalAvailable) / totalBeds) * 100) : 0,
      },
    });
  })
);

// ──────────────────────────────────────────────────
// GET /:id/services — Hospital service catalog (public)
// ──────────────────────────────────────────────────
router.get(
  '/:id/services',
  [
    param('id').isUUID(),
    query('category').optional().isString(),
    query('search').optional().isString(),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const hospitalId = req.params.id;

    let qb = supabaseAdmin
      .from('hospital_services')
      .select('id, name, code, category, sub_category, rate, gst_percent, description, is_package')
      .eq('hospital_id', hospitalId)
      .eq('is_active', true)
      .order('category')
      .order('name');

    if (req.query.category) {
      qb = qb.eq('category', req.query.category);
    }
    if (req.query.search) {
      qb = qb.ilike('name', `%${req.query.search}%`);
    }

    const { data, error } = await qb;
    if (error) throw error;

    const services = (data || []).map((s) => ({
      id: s.id,
      service_name: s.name,
      category: s.category,
      rate: parseFloat(s.rate) || 0,
      gst_percent: parseFloat(s.gst_percent) || 0,
      total_with_gst: (parseFloat(s.rate) || 0) * (1 + (parseFloat(s.gst_percent) || 0) / 100),
      service_type: s.is_package ? 'package' : 'individual',
    }));

    const estimatedTotal = services.reduce((s, svc) => s + svc.total_with_gst, 0);

    res.json({
      success: true,
      data: {
        services,
        estimated_total: estimatedTotal,
      },
    });
  })
);

// ──────────────────────────────────────────────────
// GET /:id/bill-estimate — Estimate cost for selected services
// ──────────────────────────────────────────────────
router.get(
  '/:id/bill-estimate',
  [
    param('id').isUUID(),
    query('services').isString().withMessage('Comma-separated service IDs required'),
    validate,
  ],
  asyncHandler(async (req, res) => {
    const hospitalId = req.params.id;
    const serviceIds = req.query.services.split(',').map((s) => s.trim()).filter(Boolean);

    if (serviceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No services specified' });
    }

    const { data, error } = await supabaseAdmin
      .from('hospital_services')
      .select('id, name, category, rate, gst_percent')
      .eq('hospital_id', hospitalId)
      .in('id', serviceIds);

    if (error) throw error;

    const services = (data || []).map((s) => ({
      service_name: s.name,
      category: s.category,
      rate: parseFloat(s.rate) || 0,
      gst_percent: parseFloat(s.gst_percent) || 0,
      total_with_gst: (parseFloat(s.rate) || 0) * (1 + (parseFloat(s.gst_percent) || 0) / 100),
    }));

    const estimatedTotal = services.reduce((sum, svc) => sum + svc.total_with_gst, 0);

    res.json({
      success: true,
      data: {
        services,
        estimated_total: Math.round(estimatedTotal * 100) / 100,
      },
    });
  })
);

module.exports = router;
