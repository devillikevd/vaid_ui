const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { asyncHandler, ApiError } = require('../../middleware/errorHandler');
const { supabaseAdmin } = require('../../config/supabase');
const consentService = require('../../services/consentService');
const patientService = require('../../services/patientService');

const router = express.Router();

router.use(authenticate);
router.use(authorize('patient'));


/**
 * @route GET /api/patient/referrals/pending-consent
 * @desc Fetch referrals awaiting consent for the authenticated patient
 */
router.get('/pending-consent', asyncHandler(async (req, res) => {
  const patient = await patientService._getPatientByUserId(req.user.id);
  
  const { data: referrals, error } = await supabaseAdmin
    .from('universal_referrals')
    .select('id, sender_snapshot_name, receiver_snapshot_name, reason, urgency, created_at, status, attachments:referral_attachments(document_type, file_name)')
    .eq('patient_id', patient.id)
    .eq('status', 'awaiting_consent')
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(400, error.message);

  res.json({ success: true, data: referrals });
}));

/**
 * @route POST /api/patient/referrals/:id/approve-consent
 * @desc Approve consent for a referral
 */
router.post('/:id/approve-consent',
  [
    param('id').isUUID().withMessage('Valid referral ID required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const patient = await patientService._getPatientByUserId(req.user.id);
    
    // 1. Fetch referral
    const { data: referral, error } = await supabaseAdmin
      .from('universal_referrals')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !referral) {
      throw new ApiError(404, 'Referral request not found');
    }

    if (referral.patient_id !== patient.id) {
      throw new ApiError(403, 'Unauthorized');
    }

    if (referral.status !== 'awaiting_consent') {
      throw new ApiError(400, 'Referral is not awaiting consent');
    }

    // 2. Grant canonical consent
    await consentService.grantConsent({
      patientId: patient.id,
      entityType: referral.receiver_type,
      entityId: referral.receiver_id,
      entityName: referral.receiver_snapshot_name,
      purpose: 'Referral: ' + referral.reason,
      durationDays: 365,
      dataScopes: ['referral_documents']
    });

    // 3. Update referral state (but DO NOT submit it; the provider must click Send Referral)
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('universal_referrals')
      .update({ consent_granted: true })
      .eq('id', referral.id)
      .select('*')
      .single();

    if (updateError) throw new ApiError(400, updateError.message);

    res.json({ success: true, data: updated, message: 'Consent approved successfully.' });
  })
);

/**
 * @route POST /api/patient/referrals/:id/decline-consent
 * @desc Decline consent for a referral
 */
router.post('/:id/decline-consent',
  [
    param('id').isUUID().withMessage('Valid referral ID required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const patient = await patientService._getPatientByUserId(req.user.id);
    
    // 1. Fetch referral
    const { data: referral, error } = await supabaseAdmin
      .from('universal_referrals')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !referral) {
      throw new ApiError(404, 'Referral request not found');
    }

    if (referral.patient_id !== patient.id) {
      throw new ApiError(403, 'Unauthorized');
    }

    if (referral.status !== 'awaiting_consent') {
      throw new ApiError(400, 'Referral is not awaiting consent');
    }

    // 2. Update referral state to consent_declined
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('universal_referrals')
      .update({ status: 'consent_declined', consent_granted: false })
      .eq('id', referral.id)
      .select('*')
      .single();

    if (updateError) throw new ApiError(400, updateError.message);

    res.json({ success: true, data: updated, message: 'Consent declined.' });
  })
);

module.exports = router;
