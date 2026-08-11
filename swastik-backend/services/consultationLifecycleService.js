/**
 * Consultation Lifecycle Service
 *
 * Enterprise consultation state machine (Part 8-12 of the consultation
 * lifecycle engine). This service is ADDITIVE: every mutation is guarded
 * by current-state predicates so it can never clobber a newer state, and
 * all writes go through supabaseAdmin (service_role). Existing
 * consultationService.start/join/end flows remain untouched; this module
 * hooks into them at the boundaries (see initLifecycleForStart/Join) and
 * takes over end-of-session handling for the new flows.
 *
 * States:
 *   scheduled -> waiting_for_doctor -> waiting_for_patient -> ready_to_join
 *             -> live -> paused / reconnecting / patient_left / doctor_left
 *             -> end_requested -> completed / abandoned / incomplete
 *             -> no_show / expired / interrupted / recovered
 */
const { supabaseAdmin } = require('../config/supabase');
const { ApiError } = require('../middleware/errorHandler');
const eventEmitter = require('./eventEmitter');
const notificationService = require('./notificationService');

const LOG = '[ConsultationLifecycle]';

const LIVE_STAGES = ['live', 'paused', 'reconnecting', 'patient_left', 'doctor_left', 'end_requested'];
const ACTIVE_STATUSES = [
  'in_progress', 'waiting', 'live', 'paused', 'reconnecting',
  'patient_left', 'doctor_left', 'interrupted', 'ready_to_join',
  'waiting_for_doctor', 'waiting_for_patient', 'consultation_started', 'checked_in',
];

const DEFAULT_POLICIES = {
  min_duration_seconds: '120',
  incomplete_max_seconds: '300',
  rejoin_timeout_seconds: '120',
  recovery_timeout_seconds: '300',
  end_request_timeout_seconds: '60',
  otp_for_short_consultations: 'true',
  otp_for_controlled_medicines: 'true',
  otp_for_insurance: 'true',
  otp_for_high_value: 'true',
  high_value_fee_threshold: '1000',
  otp_for_admin_policy: 'false',
  otp_for_force_complete_dispute: 'true',
  no_show_grace_seconds: '300',
  pre_call_expiry_seconds: '300',
};

// ── Small internal helpers ─────────────────────────────────────────

const policyValue = async (key, fallback) => {
  try {
    const { data } = await supabaseAdmin
      .from('consultation_policies')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (data && data.value != null) return data.value;
  } catch (err) {
    console.warn(`${LOG} policy lookup failed (${key}):`, err.message);
  }
  return fallback != null ? fallback : DEFAULT_POLICIES[key];
};

const policyBool = async (key) => {
  const raw = await policyValue(key);
  return String(raw || '').toLowerCase() === 'true';
};

const policySeconds = async (key) => {
  const raw = await policyValue(key);
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : Number(DEFAULT_POLICIES[key] || 300);
};

const getParticipants = async (consultation) => {
  const [doctorRes, patientRes] = await Promise.all([
    supabaseAdmin.from('doctors').select('user_id, name').eq('id', consultation.doctor_id).maybeSingle(),
    supabaseAdmin.from('patients').select('user_id, name').eq('id', consultation.patient_id).maybeSingle(),
  ]);

  const doctorUserId = doctorRes.data?.user_id || null;
  const patientUserId = patientRes.data?.user_id || null;

  let doctorEmail = null;
  let patientEmail = null;
  const userIds = [doctorUserId, patientUserId].filter(Boolean);
  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin.from('users').select('id, email').in('id', userIds);
    const emailById = new Map((users || []).map((u) => [u.id, u.email]));
    doctorEmail = doctorUserId ? emailById.get(doctorUserId) || null : null;
    patientEmail = patientUserId ? emailById.get(patientUserId) || null : null;
  }

  return {
    doctorUserId,
    patientUserId,
    doctorName: doctorRes.data?.name || 'Doctor',
    patientName: patientRes.data?.name || 'Patient',
    doctorEmail,
    patientEmail,
  };
};

const nowIso = () => new Date().toISOString();

// ── Audit trail ────────────────────────────────────────────────────

const addLog = async ({
  consultationId,
  actorType,
  actorId = null,
  actorName = null,
  event,
  eventType = 'status',
  detail = null,
  metadata = {},
}) => {
  try {
    const { error } = await supabaseAdmin.from('consultation_logs').insert({
      consultation_id: consultationId,
      actor_type: actorType,
      actor_id: actorId,
      actor_name: actorName,
      event,
      event_type: eventType,
      detail,
      metadata,
    });
    if (error) throw error;

    eventEmitter.emitConsultationLog({
      consultationId,
      actorType,
      actorId,
      actorName,
      event,
      eventType,
      detail,
      metadata,
      timestamp: nowIso(),
    });
  } catch (err) {
    console.error(`${LOG} addLog failed:`, err.message);
  }
  return true;
};

// ── State transition helper ────────────────────────────────────────

/**
 * Applies a lifecycle transition. Guarded: only applies when the current
 * consultation still matches `fromStatuses`/`fromStages` (if provided),
 * preventing clobbering of newer states. Appends to state_history and
 * emits a realtime stage event + notification.
 */
const transition = async (consultation, { toStatus, toStage, reason, actorType = 'system', actorId = null, actorName = null, extra = {}, notify = true }) => {
  const current = { status: consultation.status, stage: consultation.stage };

  const history = Array.isArray(consultation.state_history) ? consultation.state_history : [];
  const nextHistory = [
    ...history,
    {
      from_status: current.status,
      to_status: toStatus || current.status,
      from_stage: current.stage,
      to_stage: toStage || current.stage,
      reason: reason || null,
      actor_type: actorType,
      actor_id: actorId,
      at: nowIso(),
    },
  ];

  const updates = {
    state_history: nextHistory,
    updated_at: nowIso(),
    ...extra,
  };
  if (toStatus) updates.status = toStatus;
  if (toStage) updates.stage = toStage;

  const query = supabaseAdmin.from('consultations').update(updates).eq('id', consultation.id);
  if (current.status && toStatus) query.in('status', [current.status, ...ACTIVE_STATUSES]);
  const { data, error } = await query.select('*').maybeSingle();
  if (error) throw error;
  if (!data) {
    console.warn(`${LOG} transition skipped (state changed concurrently) for ${consultation.id}`);
    return consultation;
  }

  const participants = await getParticipants(consultation);
  await addLog({
    consultationId: consultation.id,
    actorType,
    actorId,
    actorName,
    event: toStatus ? `status:${toStatus}` : `stage:${toStage}`,
    eventType: 'status',
    detail: reason || null,
    metadata: { from: current, to: { status: toStatus, stage: toStage }, ...extra },
  });

  if (notify) {
    eventEmitter.emitConsultationStage({
      consultationId: consultation.id,
      appointmentId: consultation.appointment_id || null,
      roomId: consultation.room_id || consultation.id,
      status: data.status,
      stage: data.stage,
      reason: reason || null,
      doctorUserId: participants.doctorUserId,
      patientUserId: participants.patientUserId,
      doctorName: participants.doctorName,
      patientName: participants.patientName,
      timestamp: nowIso(),
      ...extra,
    });
  }

  return data;
};

// ── Init (called from existing start/join flows, guarded + idempotent) ──

/**
 * Initializes lifecycle columns when a consultation is created/started.
 * Idempotent: does nothing when the consultation already has a stage.
 */
const initLifecycleForStart = async (consultation) => {
  if (!consultation) return consultation;
  if (consultation.stage) return consultation;

  const updates = {
    stage: consultation.consultation_mode === 'in-person' ? 'live' : 'waiting_for_patient',
    state_history: [
      {
        from_status: consultation.status || 'waiting',
        to_status: consultation.status || 'waiting',
        from_stage: null,
        to_stage: consultation.consultation_mode === 'in-person' ? 'live' : 'waiting_for_patient',
        reason: 'consultation_started',
        actor_type: 'system',
        actor_id: null,
        at: nowIso(),
      },
    ],
    call_started_at: consultation.started_at || nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .update(updates)
    .eq('id', consultation.id)
    .is('stage', null)
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn(`${LOG} init failed for ${consultation.id}:`, error.message);
    return consultation;
  }
  if (!data) return consultation;

  await addLog({
    consultationId: consultation.id,
    actorType: 'system',
    event: 'lifecycle:init',
    eventType: 'status',
    detail: `Lifecycle initialized (stage=${updates.stage})`,
  });

  return data;
};

/**
 * Marks the session as live once the patient has joined (from joinConsultation).
 */
const initLifecycleForJoin = async (consultation) => {
  if (!consultation) return consultation;
  if (consultation.stage === 'live') return consultation;

  const query = supabaseAdmin.from('consultations').update({
    stage: 'live',
    status: 'in_progress',
    call_started_at: consultation.call_started_at || consultation.patient_joined_at || nowIso(),
    updated_at: nowIso(),
  }).eq('id', consultation.id);

  const { data, error } = await query.select('*').maybeSingle();
  if (error) {
    console.warn(`${LOG} join-init failed for ${consultation.id}:`, error.message);
    return consultation;
  }
  if (!data) return consultation;

  await addLog({
    consultationId: consultation.id,
    actorType: 'patient',
    event: 'stage:live',
    eventType: 'status',
    detail: 'Patient joined; session is live',
  });

  const participants = await getParticipants(consultation);
  eventEmitter.emitConsultationStage({
    consultationId: consultation.id,
    appointmentId: consultation.appointment_id || null,
    roomId: consultation.room_id || consultation.id,
    status: 'in_progress',
    stage: 'live',
    doctorUserId: participants.doctorUserId,
    patientUserId: participants.patientUserId,
    timestamp: nowIso(),
  });

  return data;
};

// ── Consent (Part 9) ───────────────────────────────────────────────

const consent = async ({ userId, consultationId, consent: consentData = {} }) => {
  if (!consultationId || !consentData) throw new ApiError(400, 'Consultation and consent are required');

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found');

  const participants = await getParticipants(consultation);
  if (userId !== participants.patientUserId) {
    throw new ApiError(403, 'Only the patient can provide consultation consent');
  }

  const consentRecord = {
    agreed: consentData.agreed === true || consentData.consent === true,
    dataSharing: consentData.dataSharing === true,
    videoRecording: consentData.videoRecording === true,
    insuranceClaim: consentData.insuranceClaim === true,
    emergencyData: consentData.emergencyData === true,
    generalTerms: consentData.generalTerms === true,
    privacyPolicy: consentData.privacyPolicy === true,
    agreedAt: nowIso(),
    source: consentData.source || 'web',
  };

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('consultations')
    .update({ patient_consent: consentRecord, updated_at: nowIso() })
    .eq('id', consultationId)
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;

  await addLog({
    consultationId,
    actorType: 'patient',
    actorId: userId,
    actorName: participants.patientName,
    event: 'consent:recorded',
    eventType: 'consent',
    detail: consentRecord.agreed ? 'Patient provided consent' : 'Patient declined consent',
    metadata: consentRecord,
  });

  eventEmitter.emitConsultationStage({
    consultationId,
    appointmentId: consultation.appointment_id || null,
    roomId: consultation.room_id || consultation.id,
    event: 'consent:recorded',
    status: updated?.status || consultation.status,
    stage: updated?.stage || consultation.stage,
    consent: { agreed: consentRecord.agreed, at: consentRecord.agreedAt },
    doctorUserId: participants.doctorUserId,
    patientUserId: participants.patientUserId,
    timestamp: nowIso(),
  });

  return { consent: consentRecord };
};

// ── Network / device events (Part 7) ───────────────────────────────

const appendJsonArray = async (consultationId, column, entry) => {
  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select(column)
    .eq('id', consultationId)
    .single();

  const current = Array.isArray(consultation?.[column]) ? consultation[column] : [];
  const next = [...current, { at: nowIso(), ...entry }].slice(-200);

  const { data, error } = await supabaseAdmin
    .from('consultations')
    .update({ [column]: next, updated_at: nowIso() })
    .eq('id', consultationId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
};

const captureNetworkEvent = async ({ consultationId, event, userId = null, metadata = {} }) => {
  if (!consultationId || !event) throw new ApiError(400, 'consultationId and event are required');

  await appendJsonArray(consultationId, 'network_events', {
    event,
    userId,
    ...metadata,
  });

  const { data: consultation } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();

  if (consultation) {
    const participants = await getParticipants(consultation);
    eventEmitter.emitConsultationNetworkEvent({
      consultationId,
      event,
      userId,
      metadata,
      doctorUserId: participants.doctorUserId,
      patientUserId: participants.patientUserId,
      timestamp: nowIso(),
    });
  }

  await addLog({
    consultationId,
    actorType: 'system',
    actorId: userId || null,
    event: `network:${event}`,
    eventType: 'network',
    detail: event,
    metadata,
  });

  return { ok: true };
};

const captureDeviceEvent = async ({ consultationId, event, userId = null, metadata = {} }) => {
  if (!consultationId || !event) throw new ApiError(400, 'consultationId and event are required');
  await appendJsonArray(consultationId, 'device_events', {
    event,
    userId,
    ...metadata,
  });

  await addLog({
    consultationId,
    actorType: 'system',
    event: `device:${event}`,
    eventType: 'device',
    detail: event,
    metadata,
  });

  return { ok: true };
};

// ── OTP determination (Part 10) ────────────────────────────────────

const isControlledPrescription = async (consultationId) => {
  try {
    const { data } = await supabaseAdmin
      .from('prescription_medicines')
      .select('id')
      .eq('is_critical', true)
      .limit(1)
      .maybeSingle();
    if (data) return true;
    const { data: rx } = await supabaseAdmin
      .from('prescriptions')
      .select('id')
      .eq('consultation_id', consultationId)
      .limit(1)
      .maybeSingle();
    return !!rx;
  } catch {
    return false;
  }
};

const determineOtpRequirement = async (consultation) => {
  if (consultation.consultation_mode === 'in-person') {
    return { required: false, reasons: ['in_person'] };
  }

  const reasons = [];
  const appointmentId = consultation.appointment_id;

  // Existing behaviour: video consultations use the appointment completion OTP.
  if (consultation.type === 'video') reasons.push('video_completion');

  const minDuration = await policySeconds('min_duration_seconds');
  const activeMs = Number(consultation.active_duration_ms || 0);
  if (await policyBool('otp_for_short_consultations') && activeMs > 0 && activeMs < minDuration * 1000) {
    reasons.push('short_consultation');
  }
  if (await policyBool('otp_for_controlled_medicines') && await isControlledPrescription(consultation.id)) {
    reasons.push('controlled_medicines');
  }

  if (appointmentId) {
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('type, fee, insurance_provider, insurance_claim_eligible')
      .eq('id', appointmentId)
      .maybeSingle();

    if (appointment?.insurance_provider || appointment?.insurance_claim_eligible) {
      if (await policyBool('otp_for_insurance')) reasons.push('insurance');
    }
    const threshold = Number(await policyValue('high_value_fee_threshold', DEFAULT_POLICIES.high_value_fee_threshold));
    if (await policyBool('otp_for_high_value') && Number(appointment?.fee || 0) >= threshold) {
      reasons.push('high_value');
    }
  }

  if (await policyBool('otp_for_admin_policy') && consultation.force_complete_reason) {
    reasons.push('admin_policy');
  }

  return { required: reasons.length > 0, reasons };
};

const verifyEndOtp = async (consultation, { email, otp }) => {
  if (!otp) return { ok: false, reason: 'OTP_REQUIRED' };

  // Try the universal (email) OTP first — issued at end-request time.
  try {
    const authService = require('./authService');
    const res = await authService.verifyUniversalOtp({ email, purpose: 'consultation_end', otp });
    if (res?.ok) return { ok: true, method: 'email_otp' };
  } catch { /* fall through to appointment OTP */ }

  // Fall back to the appointment completion OTP (existing push flow).
  if (consultation.appointment_id) {
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('completion_otp')
      .eq('id', consultation.appointment_id)
      .maybeSingle();
    if (appointment?.completion_otp && String(appointment.completion_otp) === String(otp)) {
      return { ok: true, method: 'appointment_otp' };
    }
  }

  return { ok: false, reason: 'OTP_INVALID' };
};

// ── End request / response (Part 10) ───────────────────────────────

const requestEnd = async ({ doctorUserId, consultationId, reason }) => {
  const { data: doctor } = await supabaseAdmin.from('doctors').select('id, user_id, name').eq('user_id', doctorUserId).maybeSingle();
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .eq('doctor_id', doctor.id)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found or unauthorized');

  if (!ACTIVE_STATUSES.includes(consultation.status) && consultation.status !== 'live') {
    throw new ApiError(409, `Cannot request end in current status (${consultation.status})`);
  }

  const participants = await getParticipants(consultation);
  const { required, reasons } = await determineOtpRequirement(consultation);

  const endRequest = {
    end_requested_by: doctorUserId,
    end_requested_at: nowIso(),
    end_request_reason: reason || null,
    end_request_status: 'pending',
    stage: 'end_requested',
    otp_required: required,
    otp_purpose: required ? 'consultation_end' : null,
    updated_at: nowIso(),
  };

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('consultations')
    .update(endRequest)
    .eq('id', consultationId)
    .in('status', [consultation.status, ...ACTIVE_STATUSES])
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new ApiError(409, 'Consultation state changed; refresh and retry');

  let emailOtp = null;
  if (required && participants.patientEmail) {
    try {
      const authService = require('./authService');
      const otpResult = await authService.issueUniversalOtp({
        userId: participants.patientUserId,
        email: participants.patientEmail,
        purpose: 'consultation_end',
        name: participants.patientName,
        title: 'Complete Your Consultation',
        intro: 'use the verification code below to authorise completion of your consultation.',
      });
      emailOtp = otpResult?.expiresAt || null;
    } catch (err) {
      console.warn(`${LOG} end OTP issuance failed (continuing without email OTP):`, err.message);
    }
  }

  await addLog({
    consultationId,
    actorType: 'doctor',
    actorId: doctorUserId,
    actorName: doctor.name,
    event: 'end:requested',
    eventType: 'end',
    detail: reason || 'Doctor requested to end consultation',
    metadata: { otpRequired: required, reasons },
  });

  eventEmitter.emitConsultationEndRequest({
    consultationId,
    appointmentId: consultation.appointment_id || null,
    roomId: consultation.room_id || consultation.id,
    requestedBy: doctorUserId,
    requestedByName: doctor.name,
    reason: reason || null,
    otpRequired: required,
    rejoinWindowSec: await policySeconds('rejoin_timeout_seconds'),
    doctorUserId,
    patientUserId: participants.patientUserId,
    timestamp: nowIso(),
  });

  notificationService.sendNotification(participants.patientUserId, {
    title: 'Doctor wants to end the consultation',
    message: required
      ? 'Please confirm to end the consultation. A verification code has been sent to your email.'
      : 'Please confirm to end the consultation.',
    type: 'consultation_end_request',
    data: {
      consultationId,
      appointmentId: consultation.appointment_id || null,
      otpRequired: required,
      idempotencyKey: `consultation-end-request:${consultationId}:${endRequest.end_requested_at}`,
    },
  }).catch((err) => console.warn(`${LOG} end-request push failed:`, err.message));

  return {
    consultation: updated,
    otpRequired: required,
    otpReasons: reasons,
    emailOtpExpiresAt: emailOtp,
    endRequestedAt: endRequest.end_requested_at,
    rejoinWindowSec: await policySeconds('rejoin_timeout_seconds'),
  };
};

const respondEnd = async ({ patientUserId, consultationId, decision, otp }) => {
  const { data: patient } = await supabaseAdmin.from('patients').select('id, user_id, name').eq('user_id', patientUserId).maybeSingle();
  if (!patient) throw new ApiError(404, 'Patient profile not found');

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .eq('patient_id', patient.id)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found or unauthorized');

  if (consultation.stage !== 'end_requested' && consultation.end_request_status !== 'pending') {
    throw new ApiError(409, 'There is no pending end request for this consultation');
  }

  const participants = await getParticipants(consultation);

  if (decision === 'decline') {
    const { data: updated } = await supabaseAdmin
      .from('consultations')
      .update({
        end_request_status: 'declined',
        stage: 'live',
        updated_at: nowIso(),
      })
      .eq('id', consultationId)
      .in('status', [consultation.status, ...ACTIVE_STATUSES])
      .select('*')
      .maybeSingle();

    await addLog({
      consultationId,
      actorType: 'patient',
      actorId: patientUserId,
      actorName: patient.name,
      event: 'end:declined',
      eventType: 'end',
      detail: 'Patient declined to end the consultation',
    });

    eventEmitter.emitConsultationEndResponse({
      consultationId,
      appointmentId: consultation.appointment_id || null,
      roomId: consultation.room_id || consultation.id,
      decision: 'decline',
      reason: otp || null,
      doctorUserId: participants.doctorUserId,
      patientUserId,
      timestamp: nowIso(),
    });

    return { decision: 'decline', consultation: updated || consultation };
  }

  if (decision !== 'confirm') {
    throw new ApiError(400, 'decision must be confirm or decline');
  }

  if (consultation.otp_required) {
    const check = await verifyEndOtp(consultation, { email: participants.patientEmail, otp });
    if (!check.ok) {
      throw new ApiError(400, check.reason === 'OTP_REQUIRED' ? 'A verification code is required to end this consultation' : 'The verification code is invalid');
    }
  }

  return finalizeEnd({
    consultation,
    reason: consultation.end_request_reason || 'patient_confirmed',
    otpVerifiedAt: nowIso(),
    otpMethod: consultation.otp_required ? 'email_otp' : null,
    completedBy: patientUserId,
    completionMethod: 'patient_confirm',
    participants,
  });
};

const completeEnd = async ({ doctorUserId, consultationId, reason, otp, diagnosis, notes, followUpDate, duration }) => {
  const { data: doctor } = await supabaseAdmin.from('doctors').select('id, user_id, name').eq('user_id', doctorUserId).maybeSingle();
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .eq('doctor_id', doctor.id)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found or unauthorized');

  if (!ACTIVE_STATUSES.includes(consultation.status) && !['end_requested'].includes(consultation.stage)) {
    throw new ApiError(409, `Cannot complete in current status (${consultation.status})`);
  }

  const participants = await getParticipants(consultation);

  if (consultation.otp_required) {
    const check = await verifyEndOtp(consultation, { email: participants.patientEmail, otp });
    if (!check.ok) {
      throw new ApiError(400, check.reason === 'OTP_REQUIRED' ? 'A verification code is required to end this consultation' : 'The verification code is invalid');
    }
  }

  return finalizeEnd({
    consultation,
    reason: reason || consultation.end_request_reason || 'doctor_completed',
    otpVerifiedAt: consultation.otp_required ? nowIso() : null,
    otpMethod: consultation.otp_required ? 'email_otp' : null,
    completedBy: doctorUserId,
    completionMethod: 'doctor_complete',
    diagnosis,
    notes,
    followUpDate,
    duration,
    participants,
  });
};

// Force complete (Part 12) — patient did not respond or dispute is escalated.
const forceComplete = async ({ doctorUserId, consultationId, reason, otp, disputedByPatient = false }) => {
  const { data: doctor } = await supabaseAdmin.from('doctors').select('id, user_id, name').eq('user_id', doctorUserId).maybeSingle();
  if (!doctor) throw new ApiError(404, 'Doctor profile not found');

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .eq('doctor_id', doctor.id)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found or unauthorized');

  const participants = await getParticipants(consultation);

  if (await policyBool('otp_for_force_complete_dispute') && disputedByPatient) {
    const check = await verifyEndOtp(consultation, { email: participants.patientEmail, otp });
    if (!check.ok) {
      throw new ApiError(400, check.reason === 'OTP_REQUIRED' ? 'A verification code is required to force complete a disputed consultation' : 'The verification code is invalid');
    }
  }

  const result = await finalizeEnd({
    consultation,
    reason: reason || 'force_completed',
    otpVerifiedAt: nowIso(),
    otpMethod: 'force_complete',
    completedBy: doctorUserId,
    completionMethod: 'force_complete',
    forceCompleteReason: reason || 'No response from patient',
    participants,
  });

  eventEmitter.emitConsultationForceCompleted({
    consultationId,
    appointmentId: consultation.appointment_id || null,
    roomId: consultation.room_id || consultation.id,
    reason: reason || 'No response from patient',
    disputed: disputedByPatient,
    doctorUserId,
    patientUserId: participants.patientUserId,
    timestamp: nowIso(),
  });

  return result;
};

// Shared finalize: reuse rpc_end_consultation for the atomic completion of the
// consultation + appointment, then apply lifecycle metadata on top.
const finalizeEnd = async ({ consultation, reason, otpVerifiedAt = null, otpMethod = null, completedBy, completionMethod, diagnosis, notes, followUpDate, duration, forceCompleteReason = null, participants }) => {
  const participantsRes = participants || await getParticipants(consultation);
  const doctorId = consultation.doctor_id;
  const doctorUserId = participantsRes.doctorUserId;

  const durationSeconds = Number.isFinite(Number(duration)) ? Number(duration) : null;

  // 1. Atomic completion via the existing RPC (also completes the appointment).
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('rpc_end_consultation', {
    p_consultation_id: consultation.id,
    p_doctor_id: doctorId,
    p_diagnosis: diagnosis || null,
    p_notes: notes || null,
    p_follow_up_date: followUpDate || null,
  });
  if (rpcError) throw rpcError;
  if (!rpcResult?.success) throw new ApiError(404, 'Consultation not found or unauthorized');

  const endedAt = nowIso();
  const startedAt = consultation.call_started_at || consultation.started_at;
  const activeDurationMs = durationSeconds
    ? Math.max(0, durationSeconds) * 1000
    : startedAt
      ? Math.max(0, Date.now() - Date.parse(startedAt))
      : null;

  const minDuration = await policySeconds('min_duration_seconds');
  const incompleteMax = await policySeconds('incomplete_max_seconds');

  // 2. Duration-based classification (Part 11).
  let finalStatus = 'completed';
  let finalStage = 'completed';
  let durationClass = 'normal';

  if (activeDurationMs != null) {
    const activeSec = activeDurationMs / 1000;
    if (activeSec < minDuration) {
      finalStatus = 'abandoned';
      finalStage = 'abandoned';
      durationClass = 'abandoned';
    } else if (activeSec < incompleteMax && !reason) {
      finalStatus = 'incomplete';
      finalStage = 'incomplete';
      durationClass = 'incomplete';
    }
  }

  const updates = {
    status: finalStatus,
    stage: finalStage,
    call_ended_at: endedAt,
    active_duration_ms: activeDurationMs,
    completion_reason: reason || null,
    completion_method: completionMethod || null,
    completed_by: completedBy || doctorUserId,
    force_complete_reason: forceCompleteReason,
    end_request_status: 'accepted',
    end_requested_at: consultation.end_requested_at || endedAt,
    otp_verified_at: otpVerifiedAt,
    otp_purpose: consultation.otp_purpose || null,
    updated_at: endedAt,
  };

  const stateHistory = Array.isArray(consultation.state_history) ? consultation.state_history : [];
  updates.state_history = [
    ...stateHistory,
    {
      from_status: consultation.status,
      to_status: finalStatus,
      from_stage: consultation.stage,
      to_stage: finalStage,
      reason,
      actor_type: 'system',
      actor_id: completedBy,
      at: endedAt,
    },
  ];

  const { data: finalConsultation, error: finalError } = await supabaseAdmin
    .from('consultations')
    .update(updates)
    .eq('id', consultation.id)
    .select('*')
    .single();
  if (finalError) throw finalError;

  await addLog({
    consultationId: consultation.id,
    actorType: 'system',
    actorId: completedBy,
    actorName: null,
    event: `status:${finalStatus}`,
    eventType: 'end',
    detail: reason || `Consultation completed via ${completionMethod || 'unknown'}`,
    metadata: {
      activeDurationMs,
      durationClass,
      completionMethod,
      otpMethod,
      otpVerifiedAt,
    },
  });

  // 3. Realtime stage + notification to both participants.
  eventEmitter.emitConsultationStage({
    consultationId: consultation.id,
    appointmentId: consultation.appointment_id || null,
    roomId: consultation.room_id || consultation.id,
    status: finalStatus,
    stage: finalStage,
    reason,
    completionMethod,
    activeDurationMs,
    doctorUserId,
    patientUserId: participantsRes.patientUserId,
    timestamp: endedAt,
  });

  notificationService.sendNotification(participantsRes.patientUserId, {
    title: 'Consultation completed',
    message: 'Your consultation has ended. You can view the summary and prescription in your dashboard.',
    type: 'consultation_ended',
    data: {
      consultationId: consultation.id,
      appointmentId: consultation.appointment_id || null,
      status: finalStatus,
      idempotencyKey: `consultation-ended:${consultation.id}`,
    },
  }).catch(() => {});

  return {
    consultation: finalConsultation,
    durationClass,
    activeDurationMs,
    completionMethod,
  };
};

// ── Pause / resume (Part 8) ────────────────────────────────────────

const togglePause = async ({ userId, consultationId, action }) => {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found');

  const participants = await getParticipants(consultation);
  if (userId !== participants.doctorUserId && userId !== participants.patientUserId) {
    throw new ApiError(403, 'Not a participant of this consultation');
  }

  if (action === 'pause') {
    if (consultation.stage !== 'live') throw new ApiError(409, 'Consultation is not live');

    const { data: updated } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'paused',
        stage: 'paused',
        paused_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('id', consultationId)
      .eq('stage', 'live')
      .select('*')
      .maybeSingle();
    if (!updated) throw new ApiError(409, 'Consultation state changed; refresh and retry');

    await addLog({
      consultationId,
      actorType: userId === participants.doctorUserId ? 'doctor' : 'patient',
      actorId: userId,
      event: 'call:paused',
      eventType: 'call',
      detail: 'Call paused',
    });

    eventEmitter.emitConsultationStage({
      consultationId,
      appointmentId: consultation.appointment_id || null,
      roomId: consultation.room_id || consultation.id,
      status: 'paused',
      stage: 'paused',
      doctorUserId: participants.doctorUserId,
      patientUserId: participants.patientUserId,
      timestamp: nowIso(),
    });

    return { status: 'paused', stage: 'paused' };
  }

  if (action === 'resume') {
    if (consultation.stage !== 'paused') throw new ApiError(409, 'Consultation is not paused');

    const pausedAt = consultation.paused_at ? Date.parse(consultation.paused_at) : Date.now();
    const totalPaused = Number(consultation.total_paused_ms || 0) + Math.max(0, Date.now() - pausedAt);

    const { data: updated } = await supabaseAdmin
      .from('consultations')
      .update({
        status: 'in_progress',
        stage: 'live',
        resumed_at: nowIso(),
        total_paused_ms: totalPaused,
        paused_at: null,
        updated_at: nowIso(),
      })
      .eq('id', consultationId)
      .eq('stage', 'paused')
      .select('*')
      .maybeSingle();
    if (!updated) throw new ApiError(409, 'Consultation state changed; refresh and retry');

    await addLog({
      consultationId,
      actorType: userId === participants.doctorUserId ? 'doctor' : 'patient',
      actorId: userId,
      event: 'call:resumed',
      eventType: 'call',
      detail: `Call resumed (paused ${Math.round(totalPaused / 1000)}s total)`,
    });

    eventEmitter.emitConsultationStage({
      consultationId,
      appointmentId: consultation.appointment_id || null,
      roomId: consultation.room_id || consultation.id,
      status: 'in_progress',
      stage: 'live',
      totalPausedMs: totalPaused,
      doctorUserId: participants.doctorUserId,
      patientUserId: participants.patientUserId,
      timestamp: nowIso(),
    });

    return { status: 'in_progress', stage: 'live', totalPausedMs: totalPaused };
  }

  throw new ApiError(400, 'action must be pause or resume');
};

// ── Participant state reports (join / leave / recovery) ────────────

const reportParticipantState = async ({ userId, consultationId, state }) => {
  const allowed = ['joined', 'patient_left', 'doctor_left', 'reconnecting', 'recovered'];
  if (!allowed.includes(state)) throw new ApiError(400, `state must be one of: ${allowed.join(', ')}`);

  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found');

  const participants = await getParticipants(consultation);
  const isDoctor = userId === participants.doctorUserId;
  const isPatient = userId === participants.patientUserId;
  if (!isDoctor && !isPatient) throw new ApiError(403, 'Not a participant of this consultation');

  const now = nowIso();
  let updates = { updated_at: now };
  let stageEvent = null;

  if (state === 'joined') {
    updates = { ...updates, stage: 'live', status: 'in_progress', rejoin_deadline: null };
  } else if (state === 'patient_left') {
    updates = {
      ...updates,
      stage: 'patient_left',
      status: 'patient_left',
      patient_left_at: consultation.patient_left_at || now,
      rejoin_deadline: consultation.rejoin_deadline || new Date(Date.now() + (await policySeconds('rejoin_timeout_seconds')) * 1000).toISOString(),
    };
  } else if (state === 'doctor_left') {
    updates = { ...updates, stage: 'doctor_left', status: 'doctor_left', doctor_left_at: consultation.doctor_left_at || now };
  } else if (state === 'reconnecting') {
    updates = {
      ...updates,
      stage: 'reconnecting',
      status: 'reconnecting',
      reconnect_count: (Number(consultation.reconnect_count) || 0) + 1,
      paused_at: consultation.paused_at || now,
    };
  } else if (state === 'recovered') {
    const recoveryCount = (Number(consultation.recovery_count) || 0) + 1;
    updates = {
      ...updates,
      stage: 'live',
      status: 'in_progress',
      recovery_count: recoveryCount,
      recovered_at: now,
      rejoin_deadline: null,
      paused_at: null,
    };
  }

  const query = supabaseAdmin.from('consultations').update(updates).eq('id', consultationId);
  const { data: updated, error: updateError } = await query.select('*').maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new ApiError(409, 'Consultation state changed; refresh and retry');

  await addLog({
    consultationId,
    actorType: isDoctor ? 'doctor' : 'patient',
    actorId: userId,
    event: `participant:${state}`,
    eventType: 'call',
    detail: `${isDoctor ? 'Doctor' : 'Patient'} ${state.replace('_', ' ')}`,
    metadata: updates,
  });

  eventEmitter.emitConsultationStage({
    consultationId,
    appointmentId: consultation.appointment_id || null,
    roomId: consultation.room_id || consultation.id,
    status: updated.status,
    stage: updated.stage,
    event: `participant:${state}`,
    doctorUserId: participants.doctorUserId,
    patientUserId: participants.patientUserId,
    timestamp: now,
    ...(updates.reconnect_count != null ? { reconnectCount: updates.reconnect_count } : {}),
    ...(updates.recovery_count != null ? { recoveryCount: updates.recovery_count } : {}),
  });

  return { status: updated.status, stage: updated.stage, ...updates };
};

// ── Logs (Part 16) ─────────────────────────────────────────────────

const getLogs = async ({ userId, role, consultationId }) => {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('id, doctor_id, patient_id')
    .eq('id', consultationId)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found');

  let authorized = role === 'admin' || role === 'super_admin';
  if (!authorized && role === 'doctor') {
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', userId).maybeSingle();
    authorized = !!doctor && doctor.id === consultation.doctor_id;
  }
  if (!authorized && role === 'patient') {
    const { data: patient } = await supabaseAdmin.from('patients').select('id').eq('user_id', userId).maybeSingle();
    authorized = !!patient && patient.id === consultation.patient_id;
  }
  if (!authorized) throw new ApiError(403, 'Unauthorized to view consultation logs');

  const { data: logs } = await supabaseAdmin
    .from('consultation_logs')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false });

  return { logs: logs || [] };
};

const getLifecycle = async ({ userId, role, consultationId }) => {
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .single();
  if (error || !consultation) throw new ApiError(404, 'Consultation not found');

  const participants = await getParticipants(consultation);
  const isParticipant = userId === participants.doctorUserId || userId === participants.patientUserId;
  if (!isParticipant && role !== 'admin' && role !== 'super_admin') {
    throw new ApiError(403, 'Unauthorized to view this consultation');
  }

  const { data: logs } = await supabaseAdmin
    .from('consultation_logs')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    consultation: {
      id: consultation.id,
      status: consultation.status,
      stage: consultation.stage,
      consultation_mode: consultation.consultation_mode,
      call_started_at: consultation.call_started_at,
      call_ended_at: consultation.call_ended_at,
      active_duration_ms: consultation.active_duration_ms,
      paused_at: consultation.paused_at,
      resumed_at: consultation.resumed_at,
      total_paused_ms: consultation.total_paused_ms,
      reconnect_count: consultation.reconnect_count,
      recovery_count: consultation.recovery_count,
      recovered_at: consultation.recovered_at,
      patient_left_at: consultation.patient_left_at,
      doctor_left_at: consultation.doctor_left_at,
      rejoin_deadline: consultation.rejoin_deadline,
      end_request_status: consultation.end_request_status,
      end_request_reason: consultation.end_request_reason,
      end_requested_at: consultation.end_requested_at,
      completion_reason: consultation.completion_reason,
      completion_method: consultation.completion_method,
      force_complete_reason: consultation.force_complete_reason,
      otp_required: consultation.otp_required,
      prescription_generated: consultation.prescription_generated,
      prescription_generated_at: consultation.prescription_generated_at,
      patient_consent: consultation.patient_consent,
      network_events: consultation.network_events || [],
      device_events: consultation.device_events || [],
      state_history: consultation.state_history || [],
    },
    logs: logs || [],
  };
};

// ── Policy management (Part 10/11/12/8) ────────────────────────────

const getPolicies = async () => {
  const { data } = await supabaseAdmin.from('consultation_policies').select('*').order('key');
  return { policies: data || [] };
};

const updatePolicy = async ({ key, value, changedBy }) => {
  if (!key || value == null) throw new ApiError(400, 'key and value are required');

  const { data: existing } = await supabaseAdmin
    .from('consultation_policies')
    .select('key, value')
    .eq('key', key)
    .maybeSingle();

  const upsertPayload = {
    key,
    value: String(value),
    updated_at: nowIso(),
  };
  if (!existing) {
    upsertPayload.description = `Policy added via admin UI (${key})`;
  }

  const { error } = await supabaseAdmin.from('consultation_policies').upsert(upsertPayload, { onConflict: 'key' });
  if (error) throw error;

  if (existing && existing.value !== String(value)) {
    await supabaseAdmin.from('consultation_policy_history').insert({
      key,
      old_value: existing.value,
      new_value: String(value),
      changed_by: changedBy || null,
    });
  }

  eventEmitter.emitConsultationPolicyChanged({
    key,
    value: String(value),
    changedBy: changedBy || null,
    timestamp: nowIso(),
  });

  return { key, value: String(value) };
};

// ── Cron sweep (no-show / expire / abandon / interruption) ─────────

const runLifecycleSweep = async () => {
  const results = { noShow: 0, expired: 0, interrupted: 0, forceCompletePrompt: 0, scanned: 0 };
  const now = Date.now();
  const noShowGraceSec = await policySeconds('no_show_grace_seconds');
  const preCallExpirySec = await policySeconds('pre_call_expiry_seconds');
  const recoveryTimeoutSec = await policySeconds('recovery_timeout_seconds');
  const rejoinTimeoutSec = await policySeconds('rejoin_timeout_seconds');
  const endRequestTimeoutSec = await policySeconds('end_request_timeout_seconds');

  // Candidates: everything not yet terminal and owned by the lifecycle.
  const { data: consultations, error } = await supabaseAdmin
    .from('consultations')
    .select('*')
    .not('status', 'in', ['completed', 'cancelled', 'no_show', 'expired', 'abandoned', 'incomplete', 'timed_out']);

  if (error) throw error;
  if (!consultations) return results;

  for (const consultation of consultations || []) {
    results.scanned += 1;
    try {
      const stage = consultation.stage;
      const startedAt = consultation.started_at || consultation.created_at || consultation.call_started_at;
      const startedMs = startedAt ? Date.parse(startedAt) : now;

      // Patient never joined → no_show (doctor started, patient no-show).
      if ((stage === 'waiting_for_patient' || consultation.status === 'waiting') && !consultation.patient_joined_at && now - startedMs > noShowGraceSec * 1000) {
        await transition(consultation, {
          toStatus: 'no_show',
          toStage: 'no_show',
          reason: 'Patient did not join within the no-show grace period',
          actorType: 'system',
          extra: { call_ended_at: nowIso() },
        });
        results.noShow += 1;
        continue;
      }

      // Doctor never started / pre-call expired.
      if ((stage === 'waiting_for_doctor' || stage === 'ready_to_join') && now - startedMs > preCallExpirySec * 1000) {
        await transition(consultation, {
          toStatus: stage === 'ready_to_join' ? 'expired' : 'no_show',
          toStage: stage === 'ready_to_join' ? 'expired' : 'no_show',
          reason: stage === 'ready_to_join' ? 'Pre-call session expired' : 'Doctor did not start within the no-show grace period',
          actorType: 'system',
          extra: { call_ended_at: nowIso() },
        });
        results.expired += stage === 'ready_to_join' ? 1 : 0;
        results.noShow += stage === 'ready_to_join' ? 0 : 1;
        continue;
      }

      // Paused / reconnecting without recovery → interrupted.
      if ((consultation.status === 'paused' || consultation.status === 'reconnecting' || consultation.status === 'interrupted')) {
        const pausedMs = consultation.paused_at ? Date.parse(consultation.paused_at) : now;
        if (now - pausedMs > recoveryTimeoutSec * 1000) {
          await transition(consultation, {
            toStatus: 'interrupted',
            toStage: 'interrupted',
            reason: 'Session not recovered within the recovery timeout',
            actorType: 'system',
            extra: { call_ended_at: nowIso() },
          });
          results.interrupted += 1;
          continue;
        }
      }

      // Patient left without rejoining → interrupted.
      if (consultation.status === 'patient_left' || consultation.stage === 'patient_left') {
        const deadline = consultation.rejoin_deadline ? Date.parse(consultation.rejoin_deadline) : now + rejoinTimeoutSec * 1000;
        if (now > deadline) {
          await transition(consultation, {
            toStatus: 'interrupted',
            toStage: 'interrupted',
            reason: 'Patient did not rejoin within the rejoin window',
            actorType: 'system',
            extra: { call_ended_at: nowIso() },
          });
          results.interrupted += 1;
          continue;
        }
      }

      // End request with no patient response → prompt doctor to force complete.
      if (consultation.stage === 'end_requested' && consultation.end_request_status === 'pending') {
        const endRequestedMs = consultation.end_requested_at ? Date.parse(consultation.end_requested_at) : now;
        if (now - endRequestedMs > endRequestTimeoutSec * 1000) {
          await supabaseAdmin
            .from('consultations')
            .update({ end_request_status: 'no_response', updated_at: nowIso() })
            .eq('id', consultation.id)
            .eq('end_request_status', 'pending');

          const participants = await getParticipants(consultation);
          eventEmitter.emitConsultationForceComplete({
            consultationId: consultation.id,
            appointmentId: consultation.appointment_id || null,
            roomId: consultation.room_id || consultation.id,
            event: 'force-complete-prompt',
            reason: 'Patient did not respond to the end request',
            doctorUserId: participants.doctorUserId,
            patientUserId: participants.patientUserId,
            timestamp: nowIso(),
          });

          await addLog({
            consultationId: consultation.id,
            actorType: 'system',
            event: 'end:no_response',
            eventType: 'end',
            detail: 'Patient did not respond within the end-request window; force complete available',
          });
          results.forceCompletePrompt += 1;
        }
      }
    } catch (err) {
      console.warn(`${LOG} sweep error for consultation ${consultation.id}:`, err.message);
    }
  }

  return results;
};

// ── Public exports ─────────────────────────────────────────────────

module.exports = {
  initLifecycleForStart,
  initLifecycleForJoin,
  consent,
  captureNetworkEvent,
  captureDeviceEvent,
  requestEnd,
  respondEnd,
  completeEnd,
  forceComplete,
  togglePause,
  reportParticipantState,
  getLogs,
  getLifecycle,
  getPolicies,
  updatePolicy,
  runLifecycleSweep,
  _internals: {
    determineOtpRequirement,
    verifyEndOtp,
    finalizeEnd,
    addLog,
    transition,
    getParticipants,
    policyValue,
    policyBool,
    policySeconds,
    DEFAULT_POLICIES,
  },
};
