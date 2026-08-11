jest.mock('../config/supabase', () => {
  const resultQueue = [];
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    is: jest.fn(() => builder),
    not: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(() => builder),
    single: jest.fn(() => builder),
    update: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    upsert: jest.fn(() => builder),
    onConflict: jest.fn(() => builder),
    then: (resolve) => {
      const next = resultQueue.length ? resultQueue.shift() : { data: null, error: null };
      return Promise.resolve(resolve(next));
    },
  };
  return {
    __resultQueue: resultQueue,
    __builder: builder,
    supabaseAdmin: {
      from: jest.fn(() => builder),
      rpc: jest.fn(() => Promise.resolve({ data: { success: true, consultation: { id: 'consultation-1' } }, error: null })),
    },
  };
});

jest.mock('../services/eventEmitter', () => ({
  emitConsultationStage: jest.fn(),
  emitConsultationLog: jest.fn(),
  emitConsultationEndRequest: jest.fn(),
  emitConsultationEndResponse: jest.fn(),
  emitConsultationForceCompleted: jest.fn(),
  emitConsultationNetworkEvent: jest.fn(),
  emitConsultationPolicyChanged: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn(() => Promise.resolve({ id: 'n1' })),
}));

jest.mock('../services/authService', () => ({
  issueUniversalOtp: jest.fn(() => Promise.resolve({ expiresAt: '2026-01-01T00:10:00Z' })),
  verifyUniversalOtp: jest.fn(() => Promise.resolve({ ok: true })),
}));

const { supabaseAdmin, __resultQueue } = require('../config/supabase');
const lifecycle = require('../services/consultationLifecycleService');

const pushResult = (data, error = null) => __resultQueue.push({ data, error });
const pushPolicyNulls = (n = 10) => {
  for (let i = 0; i < n; i += 1) pushResult(null);
};

const baseConsultation = (overrides = {}) => ({
  id: 'consultation-1',
  appointment_id: 'appointment-1',
  doctor_id: 'doctor-1',
  patient_id: 'patient-1',
  type: 'video',
  status: 'in_progress',
  stage: 'live',
  room_id: 'room-1',
  started_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  call_started_at: '2026-01-01T00:00:00Z',
  patient_joined_at: '2026-01-01T00:00:00Z',
  state_history: [],
  active_duration_ms: 300000,
  ...overrides,
});

const doctorRow = { id: 'doctor-1', user_id: 'doctor-user-1', name: 'Dr Asha' };
const patientRow = { id: 'patient-1', user_id: 'patient-user-1', name: 'Chandan' };
const usersRow = [
  { id: 'doctor-user-1', email: 'doctor@vaididea.com' },
  { id: 'patient-user-1', email: 'patient@vaididea.com' },
];

describe('consultation lifecycle engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resultQueue.length = 0;
  });

  test('initLifecycleForStart is idempotent when stage already exists', async () => {
    const consultation = baseConsultation({ stage: 'live' });
    const result = await lifecycle.initLifecycleForStart(consultation);
    expect(result).toBe(consultation);
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  test('initLifecycleForStart initializes stage to waiting_for_patient', async () => {
    const consultation = baseConsultation({ stage: null });
    pushResult({
      ...consultation,
      stage: 'waiting_for_patient',
      state_history: [{ from_status: 'waiting', to_status: 'waiting', to_stage: 'waiting_for_patient', reason: 'consultation_started', at: '2026-01-01T00:00:00Z' }],
    });
    pushResult({ id: 'log-1' });

    const result = await lifecycle.initLifecycleForStart(consultation);
    expect(result.stage).toBe('waiting_for_patient');
    expect(result.state_history.length).toBe(1);
    expect(result.state_history[0].reason).toBe('consultation_started');
  });

  test('consent requires the patient role and records consent', async () => {
    const consultation = baseConsultation();
    pushResult(consultation); // consultations single
    pushResult(doctorRow); // doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    pushResult({ ...consultation, patient_consent: { agreed: true, agreedAt: '2026-01-01T00:05:00Z' } }); // update
    pushResult({ id: 'log-1' }); // insert

    const result = await lifecycle.consent({
      userId: 'patient-user-1',
      consultationId: 'consultation-1',
      consent: { agreed: true, dataSharing: true },
    });

    expect(result.consent.agreed).toBe(true);
    expect(result.consent.dataSharing).toBe(true);
    expect(result.consent.source).toBe('web');
  });

  test('requestEnd creates an end request and requires OTP for video consultations', async () => {
    const consultation = baseConsultation({ status: 'in_progress', stage: 'live' });
    pushResult(doctorRow); // doctors
    pushResult(consultation); // consultations single
    pushResult(doctorRow); // getParticipants doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    pushPolicyNulls(9); // determineOtpRequirement policy lookups (defaults)
    pushResult({ ...consultation, end_request_status: 'pending', stage: 'end_requested', otp_required: true }); // update
    pushResult(null); // otp_verifications delete
    pushResult(null); // otp_verifications insert
    pushResult({ id: 'log-1' }); // consultation_logs insert

    const result = await lifecycle.requestEnd({
      doctorUserId: 'doctor-user-1',
      consultationId: 'consultation-1',
      reason: 'Diagnosis complete',
    });

    expect(result.otpRequired).toBe(true);
    expect(result.consultation.stage).toBe('end_requested');
    expect(result.consultation.end_request_status).toBe('pending');
    const authService = require('../services/authService');
    expect(authService.issueUniversalOtp).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'consultation_end', email: 'patient@vaididea.com' })
    );
  });

  test('respondEnd decline keeps the session live', async () => {
    pushResult(patientRow); // patients
    pushResult(baseConsultation({ stage: 'end_requested', end_request_status: 'pending' })); // consultations
    pushResult(doctorRow); // doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    pushResult({ ...baseConsultation(), stage: 'live', end_request_status: 'declined' }); // update
    pushResult({ id: 'log-1' }); // insert

    const result = await lifecycle.respondEnd({
      patientUserId: 'patient-user-1',
      consultationId: 'consultation-1',
      decision: 'decline',
    });

    expect(result.decision).toBe('decline');
    expect(result.consultation.end_request_status).toBe('declined');
  });

  test('respondEnd confirm finalizes via rpc_end_consultation', async () => {
    const consultation = baseConsultation({ stage: 'end_requested', end_request_status: 'pending', otp_required: true, otp_purpose: 'consultation_end' });
    pushResult(patientRow); // patients
    pushResult(consultation); // consultations
    pushResult(doctorRow); // doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    // verifyEndOtp hits mocked authService first — no DB
    pushPolicyNulls(2); // finalizeEnd policySeconds(min_duration, incomplete_max)
    pushResult({ ...baseConsultation(), status: 'completed', stage: 'completed', completion_reason: 'Diagnosis complete' }); // update
    pushResult({ id: 'log-1' }); // insert

    const result = await lifecycle.respondEnd({
      patientUserId: 'patient-user-1',
      consultationId: 'consultation-1',
      decision: 'confirm',
      otp: '123456',
    });

    expect(supabaseAdmin.rpc).toHaveBeenCalledWith('rpc_end_consultation', expect.objectContaining({ p_consultation_id: 'consultation-1' }));
    expect(result.consultation.status).toBe('completed');
    expect(result.completionMethod).toBe('patient_confirm');
    const authService = require('../services/authService');
    expect(authService.verifyUniversalOtp).toHaveBeenCalled();
  });

  test('togglePause resume restores live state and accumulates paused time', async () => {
    const pausedAt = new Date(Date.now() - 60000).toISOString();
    pushResult(baseConsultation({ status: 'paused', stage: 'paused', paused_at: pausedAt, total_paused_ms: 10000 })); // consultations
    pushResult(doctorRow); // doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    pushResult({ ...baseConsultation(), status: 'in_progress', stage: 'live', total_paused_ms: 70000 }); // update
    pushResult({ id: 'log-1' }); // insert

    const result = await lifecycle.togglePause({
      userId: 'patient-user-1',
      consultationId: 'consultation-1',
      action: 'resume',
    });

    expect(result.status).toBe('in_progress');
    expect(result.stage).toBe('live');
    expect(result.totalPausedMs).toBeGreaterThan(10000);
  });

  test('reportParticipantState patient_left sets a rejoin deadline', async () => {
    pushResult(baseConsultation()); // consultations
    pushResult(doctorRow); // doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    pushPolicyNulls(1); // policySeconds(rejoin_timeout_seconds)
    pushResult({ ...baseConsultation(), status: 'patient_left', stage: 'patient_left', rejoin_deadline: '2026-01-01T00:12:00Z' }); // update
    pushResult({ id: 'log-1' }); // insert

    const result = await lifecycle.reportParticipantState({
      userId: 'patient-user-1',
      consultationId: 'consultation-1',
      state: 'patient_left',
    });

    expect(result.stage).toBe('patient_left');
    expect(result.rejoin_deadline).toBeTruthy();
  });

  test('runLifecycleSweep marks waiting_for_patient no-shows', async () => {
    const stale = baseConsultation({
      status: 'waiting',
      stage: 'waiting_for_patient',
      patient_joined_at: null,
      started_at: '2026-01-01T00:00:00Z',
    });
    pushPolicyNulls(5); // policySeconds lookups at the top of the sweep
    pushResult([stale]); // candidates select
    pushResult({ ...stale, status: 'no_show', stage: 'no_show' }); // update
    pushResult(doctorRow); // doctors
    pushResult(patientRow); // patients
    pushResult(usersRow); // users
    pushResult({ id: 'log-1' }); // insert

    const result = await lifecycle.runLifecycleSweep();
    expect(result.noShow).toBe(1);
    const eventEmitter = require('../services/eventEmitter');
    expect(eventEmitter.emitConsultationStage).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'no_show', reason: expect.stringContaining('no-show') })
    );
  });

  test('getPolicies returns policy rows', async () => {
    pushResult([{ key: 'min_duration_seconds', value: '120', description: null, updated_at: '2026-01-01' }]);
    const result = await lifecycle.getPolicies();
    expect(result.policies.length).toBe(1);
    expect(result.policies[0].key).toBe('min_duration_seconds');
  });
});
