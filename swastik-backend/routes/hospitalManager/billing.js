/**
 * Billing Foundation Routes — Deposits, insurance pre-auth
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

// ── DEPOSITS ──

router.post('/deposits', ownerOrManager, requireApproval, [
  body('patientId').notEmpty(),
  body('amount').isFloat({ min: 0.01 }),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { data, error } = await supabaseAdmin
    .from('patient_deposits')
    .insert({
      hospital_id: hospitalId,
      patient_id: req.body.patientId,
      encounter_id: req.body.encounterId || null,
      admission_id: req.body.admissionId || null,
      amount: req.body.amount,
      payment_mode: req.body.paymentMode || 'cash',
      receipt_number: req.body.receiptNumber || null,
      transaction_ref: req.body.transactionRef || null,
      type: req.body.type || 'advance',
      collected_by: req.user.id,
      notes: req.body.notes || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, deposit: data });
}));

router.get('/deposits', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, patientId, admissionId, status, fromDate, toDate } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('patient_deposits')
    .select('*, patient:patients(id, name)', { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (patientId) query = query.eq('patient_id', patientId);
  if (admissionId) query = query.eq('admission_id', admissionId);
  if (status) query = query.eq('status', status);
  if (fromDate) query = query.gte('created_at', fromDate);
  if (toDate) query = query.lte('created_at', toDate);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (error) throw error;
  res.json({ success: true, data: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 } });
}));

// ── INSURANCE PRE-AUTH ──

router.post('/insurance/preauth', ownerOrManager, requireApproval, [
  body('patientId').notEmpty(),
  body('insuranceProvider').notEmpty(),
  body('policyNumber').notEmpty(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { data, error } = await supabaseAdmin
    .from('insurance_preauth')
    .insert({
      hospital_id: hospitalId,
      patient_id: req.body.patientId,
      encounter_id: req.body.encounterId || null,
      admission_id: req.body.admissionId || null,
      insurance_provider: req.body.insuranceProvider,
      policy_number: req.body.policyNumber,
      tpa_name: req.body.tpaName || null,
      member_id: req.body.memberId || null,
      pre_auth_type: req.body.preAuthType || 'cashless',
      requested_amount: req.body.requestedAmount || null,
      diagnosis: req.body.diagnosis || null,
      procedure_name: req.body.procedureName || null,
      estimated_stay_days: req.body.estimatedStayDays || null,
      estimated_cost: req.body.estimatedCost || null,
      created_by: req.user.id,
    })
    .select('*')
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, preauth: data });
}));

router.get('/insurance/preauth', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { page = 1, limit = 20, status, patientId } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabaseAdmin
    .from('insurance_preauth')
    .select('*, patient:patients(id, name)', { count: 'exact' })
    .eq('hospital_id', hospitalId);

  if (status) query = query.eq('status', status);
  if (patientId) query = query.eq('patient_id', patientId);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (error) throw error;
  res.json({ success: true, data: data || [], pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0 } });
}));

router.put('/insurance/preauth/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const allowed = ['status', 'sub_status', 'approved_amount', 'co_pay_percent', 'deductible_amount',
    'pre_auth_number', 'responded_at', 'expiry_date', 'rejection_reason', 'notes', 'query_details'];
  const updates = {};
  for (const k of allowed) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[k] !== undefined) updates[k] = req.body[k];
    else if (req.body[camel] !== undefined) updates[k] = req.body[camel];
  }
  if (updates.status && ['approved', 'partially_approved', 'rejected'].includes(updates.status)) {
    updates.responded_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('insurance_preauth')
    .update(updates)
    .eq('id', req.params.id)
    .eq('hospital_id', hospitalId)
    .select('*')
    .single();
  if (error) throw error;
  res.json({ success: true, preauth: data });
}));

module.exports = router;
