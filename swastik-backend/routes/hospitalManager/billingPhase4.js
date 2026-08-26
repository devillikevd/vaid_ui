/**
 * Billing Phase 4 Routes — Charge Aggregation, Invoicing,
 * Revenue Reporting, TPA Claims, Tally Export
 */
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { requireRole, requireApproval, ROLES } = require('../../middleware/rbac');
const { asyncHandler } = require('../../middleware/errorHandler');
const billingService = require('../../services/billingService');
const hospitalManagerService = require('../../services/hospitalManagerService');

const ownerOrManager = requireRole(ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER);

const getHospitalId = async (userId) => {
  const hospital = await hospitalManagerService.getHospitalByOwner(userId);
  return hospital.id;
};

// ═══════════════════════════════════════════════
// ENCOUNTER CHARGES
// ═══════════════════════════════════════════════

// Auto-aggregate charges from lab/rad/OT/room
router.post('/charges/aggregate', ownerOrManager, requireApproval, [
  body('encounterId').optional().isUUID(),
  body('admissionId').optional().isUUID(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const charges = await billingService.aggregateEncounterCharges(hospitalId, {
    encounterId: req.body.encounterId,
    admissionId: req.body.admissionId,
  });
  res.json({ success: true, message: `${charges.length} new charges aggregated`, data: charges });
}));

// List charges
router.get('/charges', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await billingService.getCharges(hospitalId, {
    encounterId: req.query.encounterId,
    admissionId: req.query.admissionId,
    status: req.query.status,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
  });
  res.json({ success: true, ...result });
}));

// ═══════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════

// Generate invoice from pending charges
router.post('/invoices/generate', ownerOrManager, requireApproval, [
  body('patientId').optional().isUUID(),
  body('encounterId').optional().isUUID(),
  body('admissionId').optional().isUUID(),
  body('chargeIds').optional().isArray(),
  body('discountAmount').optional().isFloat({ min: 0 }),
  body('preauthId').optional().isUUID(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await billingService.generateInvoice(hospitalId, {
    patientId: req.body.patientId,
    encounterId: req.body.encounterId,
    admissionId: req.body.admissionId,
    chargeIds: req.body.chargeIds,
    discountAmount: req.body.discountAmount || 0,
    preauthId: req.body.preauthId,
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, ...result });
}));

// Finalize invoice
router.put('/invoices/:id/finalize', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const invoice = await billingService.finalizeInvoice(hospitalId, req.params.id, req.user.id);
  res.json({ success: true, invoice });
}));

// Record payment
router.post('/invoices/:id/payment', ownerOrManager, requireApproval, [
  param('id').isUUID(),
  body('amount').isFloat({ min: 0.01 }),
  body('paymentMode').isString(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const invoice = await billingService.recordPayment(hospitalId, req.params.id, {
    amount: req.body.amount,
    paymentMode: req.body.paymentMode,
    paymentRef: req.body.paymentRef,
  });
  res.json({ success: true, invoice });
}));

// ═══════════════════════════════════════════════
// TPA CLAIMS
// ═══════════════════════════════════════════════

router.post('/tpa-claims', ownerOrManager, requireApproval, [
  body('patientId').notEmpty(),
  body('insuranceProvider').notEmpty(),
  body('policyNumber').notEmpty(),
  body('claimAmount').isFloat({ min: 1 }),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const claim = await billingService.createTpaClaim(hospitalId, {
    patient_id: req.body.patientId,
    admission_id: req.body.admissionId || null,
    invoice_id: req.body.invoiceId || null,
    preauth_id: req.body.preauthId || null,
    insurance_provider: req.body.insuranceProvider,
    tpa_name: req.body.tpaName || null,
    policy_number: req.body.policyNumber,
    member_id: req.body.memberId || null,
    claim_amount: req.body.claimAmount,
    diagnosis: req.body.diagnosis || null,
    procedure_name: req.body.procedureName || null,
    icd_codes: req.body.icdCodes || [],
    admission_date: req.body.admissionDate || null,
    discharge_date: req.body.dischargeDate || null,
    created_by: req.user.id,
  });
  res.status(201).json({ success: true, claim });
}));

router.get('/tpa-claims', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await billingService.getTpaClaims(hospitalId, {
    status: req.query.status,
    provider: req.query.provider,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 20,
  });
  res.json({ success: true, ...result });
}));

router.put('/tpa-claims/:id', ownerOrManager, requireApproval, [
  param('id').isUUID(), validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const claim = await billingService.updateTpaClaim(hospitalId, req.params.id, req.body);
  res.json({ success: true, claim });
}));

// ═══════════════════════════════════════════════
// REVENUE REPORTING
// ═══════════════════════════════════════════════

// Build daily summary (can be called via cron or manually)
router.post('/revenue/build-daily', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const summary = await billingService.buildDailyRevenue(hospitalId, req.body.date);
  res.json({ success: true, summary });
}));

// Get revenue report for date range
router.get('/revenue', ownerOrManager, requireApproval, [
  query('fromDate').isISO8601(),
  query('toDate').isISO8601(),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const data = await billingService.getRevenueSummary(hospitalId, {
    fromDate: req.query.fromDate,
    toDate: req.query.toDate,
  });

  // Aggregate totals
  const totals = data.reduce((acc, d) => ({
    totalInvoices: acc.totalInvoices + (d.total_invoices || 0),
    grossRevenue: acc.grossRevenue + parseFloat(d.gross_revenue || 0),
    netRevenue: acc.netRevenue + parseFloat(d.net_revenue || 0),
    totalCollected: acc.totalCollected + parseFloat(d.total_collected || 0),
    totalOutstanding: acc.totalOutstanding + parseFloat(d.total_outstanding || 0),
    insuranceBilled: acc.insuranceBilled + parseFloat(d.insurance_billed || 0),
    discountGiven: acc.discountGiven + parseFloat(d.discount_given || 0),
  }), { totalInvoices: 0, grossRevenue: 0, netRevenue: 0, totalCollected: 0, totalOutstanding: 0, insuranceBilled: 0, discountGiven: 0 });

  res.json({ success: true, data, totals });
}));

// ═══════════════════════════════════════════════
// TALLY EXPORT
// ═══════════════════════════════════════════════

router.post('/tally/export', ownerOrManager, requireApproval, [
  body('fromDate').isISO8601(),
  body('toDate').isISO8601(),
  body('type').optional().isIn(['sales', 'receipt', 'journal', 'credit_note']),
  validate,
], asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const result = await billingService.generateTallyExport(hospitalId, {
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    type: req.body.type || 'sales',
    exportedBy: req.user.id,
  });

  // Return XML as downloadable or JSON
  if (req.query.format === 'xml') {
    res.set('Content-Type', 'application/xml');
    res.set('Content-Disposition', `attachment; filename="tally_export_${req.body.fromDate}_${req.body.toDate}.xml"`);
    return res.send(result.xml);
  }

  res.json({
    success: true,
    exportId: result.exportId,
    voucherCount: result.voucherCount,
    totalAmount: result.totalAmount,
    xml: result.xml,
  });
}));

// Get export history
router.get('/tally/exports', ownerOrManager, requireApproval, asyncHandler(async (req, res) => {
  const hospitalId = await getHospitalId(req.user.id);
  const { supabaseAdmin } = require('../../config/supabase');

  const { data, error } = await supabaseAdmin
    .from('tally_export_log')
    .select('id, export_type, export_date, period_from, period_to, voucher_count, total_amount, status, created_at')
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  res.json({ success: true, data: data || [] });
}));

module.exports = router;
