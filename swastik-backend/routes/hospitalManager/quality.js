/**
 * Quality & Compliance Routes — Incidents, NABH indicators
 */
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const hospitalManagerService = require('../../services/hospitalManagerService');
const { supabaseAdmin } = require('../../config/supabase');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);
const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ── INCIDENTS ──

router.post('/incidents', ownerOrManager, requireApproval, [
  body('incidentType').notEmpty(),
  body('description').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { data, error } = await supabaseAdmin
    .from('hospital_incidents')
    .insert({
      hospital_id: hospitalId,
      incident_type: req.body.incidentType,
      severity: req.body.severity || 'low',
      category: req.body.category || null,
      department_id: req.body.departmentId || null,
      ward_id: req.body.wardId || null,
      patient_id: req.body.patientId || null,
      reported_by: req.user.id,
      description: req.body.description,
      immediate_action: req.body.immediateAction || null,
      occurred_at: req.body.occurredAt || new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, incident: data });
}));

router.get('/incidents', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, status, severity, incidentType, fromDate, toDate } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('hospital_incidents')
    .select(`
      *,
      department:hospital_departments(id, name),
      ward:hospital_wards(id, name),
      reporter:users!hospital_incidents_reported_by_fkey(id, name)
    `, { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);
  if (incidentType) query = query.eq('incident_type', incidentType);
  if (fromDate) query = query.gte('occurred_at', fromDate);
  if (toDate) query = query.lte('occurred_at', toDate);

  const { data, error, count } = await query
    .order('occurred_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (error) throw error;
  res.json({ success: true, data: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 } });
}));

router.put('/incidents/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const allowed = ['status', 'priority', 'root_cause', 'corrective_action', 'preventive_action',
    'investigation_findings', 'closure_notes', 'is_reportable'];
  const updates = {};
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[k] !== undefined) updates[k] = req.body[k];
    else if (req.body[camel] !== undefined) updates[k] = req.body[camel];
  }

  if (updates.status === 'investigating') {
    updates.investigated_by = req.user.id;
    updates.investigation_started_at = new Date().toISOString();
  } else if (updates.status === 'closed') {
    updates.closed_by = req.user.id;
    updates.closed_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('hospital_incidents')
    .update(updates)
    .eq('id', req.params.id)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();
  if (error) throw error;
  res.json({ success: true, incident: data });
}));

// ── QUALITY INDICATORS ──

router.get('/quality-indicators', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { category, periodStart, periodEnd } = req.query;

  let query = supabaseAdmin
    .from('quality_indicators')
    .select('*')
    .eq('hospital_id', hospitalId);

  if (category) query = query.eq('category', category);
  if (periodStart) query = query.gte('period_start', periodStart);
  if (periodEnd) query = query.lte('period_end', periodEnd);

  const { data, error } = await query.order('category').order('indicator_name');
  if (error) throw error;
  res.json({ success: true, indicators: data || [] });
}));

module.exports = router;
