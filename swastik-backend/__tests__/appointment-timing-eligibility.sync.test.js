jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn(() => Promise.resolve({ id: 'notification-1' })),
}));

const { supabaseAdmin } = require('../config/supabase');
const {
  parseAppointmentDateTimeMs,
  checkAppointmentStartEligibility,
  isAppointmentTimePast,
  checkAppointmentApprovalEligibility,
} = require('../utils/appointmentTiming');
const consultationService = require('../services/consultationService');
const appointmentService = require('../services/appointmentService');

const makeSingleBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    update: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

describe('Appointment Timing & 10-Minute Consultation Start Eligibility', () => {
  const testDate = '2026-05-18';
  const testTime = '10:00';

  // 2026-05-18T10:00:00+05:30 in UTC is 2026-05-18T04:30:00.000Z
  const scheduledStartMs = Date.parse('2026-05-18T10:00:00+05:30');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('correctly parses IST (+05:30) datetime', () => {
    const parsed = parseAppointmentDateTimeMs(testDate, testTime);
    expect(parsed).toBe(scheduledStartMs);
    expect(new Date(parsed).toISOString()).toBe('2026-05-18T04:30:00.000Z');
  });

  test('handles appointmentDate with ISO timestamps and time slots with ranges/seconds', () => {
    const parsedIso = parseAppointmentDateTimeMs('2026-05-18T00:00:00.000Z', '10:00:00');
    expect(parsedIso).toBe(scheduledStartMs);

    const parsedRange = parseAppointmentDateTimeMs('2026-05-18', '10:00 - 10:30');
    expect(parsedRange).toBe(scheduledStartMs);
  });

  test('appointment at 10:00, current time 09:49 (11 mins before) -> rejected with TOO_EARLY', () => {
    const time0949Ms = Date.parse('2026-05-18T09:49:00+05:30');
    const apt = { appointment_date: testDate, time_slot: testTime, status: 'confirmed' };
    const result = checkAppointmentStartEligibility(apt, time0949Ms);

    expect(result.canStart).toBe(false);
    expect(result.code).toBe('TOO_EARLY');
    expect(result.reason).toBe('Consultation cannot be started yet. You can start it 10 minutes before the scheduled time.');
  });

  test('appointment at 10:00, current time 09:50 (exactly 10 mins before) -> allowed', () => {
    const time0950Ms = Date.parse('2026-05-18T09:50:00+05:30');
    const apt = { appointment_date: testDate, time_slot: testTime, status: 'confirmed' };
    const result = checkAppointmentStartEligibility(apt, time0950Ms);

    expect(result.canStart).toBe(true);
    expect(result.code).toBe('ELIGIBLE');
  });

  test('appointment at 10:00, current time 10:00 (scheduled start time) -> allowed', () => {
    const time1000Ms = Date.parse('2026-05-18T10:00:00+05:30');
    const apt = { appointment_date: testDate, time_slot: testTime, status: 'confirmed' };
    const result = checkAppointmentStartEligibility(apt, time1000Ms);

    expect(result.canStart).toBe(true);
    expect(result.code).toBe('ELIGIBLE');
  });

  test('appointment at 10:00, current time 10:30 (during active consultation window) -> allowed', () => {
    const time1030Ms = Date.parse('2026-05-18T10:30:00+05:30');
    const apt = { appointment_date: testDate, time_slot: testTime, status: 'confirmed' };
    const result = checkAppointmentStartEligibility(apt, time1030Ms);

    expect(result.canStart).toBe(true);
    expect(result.code).toBe('ELIGIBLE');
  });

  test('future appointment tomorrow -> rejected for start', () => {
    const todayMs = Date.parse('2026-05-18T10:00:00+05:30');
    const tomorrowApt = { appointment_date: '2026-05-19', time_slot: '10:00', status: 'confirmed' };
    const result = checkAppointmentStartEligibility(tomorrowApt, todayMs);

    expect(result.canStart).toBe(false);
    expect(result.code).toBe('TOO_EARLY');
  });

  test('completed appointment -> rejected from starting', () => {
    const time1000Ms = Date.parse('2026-05-18T10:00:00+05:30');
    const completedApt = { appointment_date: testDate, time_slot: testTime, status: 'completed' };
    const result = checkAppointmentStartEligibility(completedApt, time1000Ms);

    expect(result.canStart).toBe(false);
    expect(result.code).toBe('APPOINTMENT_COMPLETED');
    expect(result.reason).toContain('already been completed');
  });

  test('cancelled appointment -> rejected from starting', () => {
    const time1000Ms = Date.parse('2026-05-18T10:00:00+05:30');
    const cancelledApt = { appointment_date: testDate, time_slot: testTime, status: 'cancelled' };
    const result = checkAppointmentStartEligibility(cancelledApt, time1000Ms);

    expect(result.canStart).toBe(false);
    expect(result.code).toBe('APPOINTMENT_CANCELLED');
    expect(result.reason).toContain('has been cancelled');
  });

  describe('Appointment Approval vs Consultation Start Separation', () => {
    test('1. Exact screenshot scenario: future appointment on 2026-09-04 09:00 with now = 2026-08-28 -> direct approve allowed, NO past modal', () => {
      const nowMs = Date.parse('2026-08-28T22:15:00+05:30');
      const apt = { appointment_date: '2026-09-04', time_slot: '09:00', status: 'scheduled' };

      const isPast = isAppointmentTimePast(apt.appointment_date, apt.time_slot, nowMs);
      const approvalEligibility = checkAppointmentApprovalEligibility(apt, nowMs);

      expect(isPast).toBe(false);
      expect(approvalEligibility.canDirectlyApprove).toBe(true);
      expect(approvalEligibility.isPast).toBe(false);
    });

    test('2. Future appointment 1 hour away -> direct approval allowed, start consultation rejected (TOO_EARLY)', () => {
      const nowMs = Date.parse('2026-09-04T08:00:00+05:30');
      const apt = { appointment_date: '2026-09-04', time_slot: '09:00', status: 'scheduled' };

      expect(isAppointmentTimePast(apt.appointment_date, apt.time_slot, nowMs)).toBe(false);
      expect(checkAppointmentApprovalEligibility(apt, nowMs).canDirectlyApprove).toBe(true);

      const startResult = checkAppointmentStartEligibility(apt, nowMs);
      expect(startResult.canStart).toBe(false);
      expect(startResult.code).toBe('TOO_EARLY');
    });

    test('3. Future appointment 9 minutes away -> direct approval allowed, start consultation allowed (within 10m window)', () => {
      const nowMs = Date.parse('2026-09-04T08:51:00+05:30');
      const apt = { appointment_date: '2026-09-04', time_slot: '09:00', status: 'scheduled' };

      expect(isAppointmentTimePast(apt.appointment_date, apt.time_slot, nowMs)).toBe(false);
      expect(checkAppointmentApprovalEligibility(apt, nowMs).canDirectlyApprove).toBe(true);

      const startResult = checkAppointmentStartEligibility(apt, nowMs);
      expect(startResult.canStart).toBe(true);
      expect(startResult.code).toBe('ELIGIBLE');
    });

    test('4. Exact scheduled time (2026-09-04 09:00:00) -> direct approval allowed', () => {
      const exactTimeMs = Date.parse('2026-09-04T09:00:00+05:30');
      const apt = { appointment_date: '2026-09-04', time_slot: '09:00', status: 'scheduled' };

      expect(isAppointmentTimePast(apt.appointment_date, apt.time_slot, exactTimeMs)).toBe(false);
      expect(checkAppointmentApprovalEligibility(apt, exactTimeMs).canDirectlyApprove).toBe(true);
    });

    test('5. One minute after scheduled time (2026-09-04 09:01:00) -> past handling (reschedule modal required)', () => {
      const pastTimeMs = Date.parse('2026-09-04T09:01:00+05:30');
      const apt = { appointment_date: '2026-09-04', time_slot: '09:00', status: 'scheduled' };

      expect(isAppointmentTimePast(apt.appointment_date, apt.time_slot, pastTimeMs)).toBe(true);
      const approvalEligibility = checkAppointmentApprovalEligibility(apt, pastTimeMs);
      expect(approvalEligibility.canDirectlyApprove).toBe(false);
      expect(approvalEligibility.isPast).toBe(true);
    });
  });

  test('consultationService.startConsultation rejects early start with HTTP 409', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const aptBuilder = makeSingleBuilder({
      data: {
        id: 'apt-future-1',
        appointment_date: futureDate,
        time_slot: '10:00',
        status: 'confirmed',
      },
      error: null,
    });
    supabaseAdmin.from.mockReturnValueOnce(aptBuilder);

    await expect(
      consultationService.startConsultation('doc-user-1', 'apt-future-1')
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Consultation cannot be started yet. You can start it 10 minutes before the scheduled time.',
    });
  });

  test('appointmentService.updateAppointmentStatus rejects early in_progress transition with HTTP 409', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const docBuilder = makeSingleBuilder({ data: { id: 'doc-1' }, error: null });
    const currentAptBuilder = makeSingleBuilder({
      data: {
        id: 'apt-future-2',
        appointment_date: futureDate,
        time_slot: '10:00',
        status: 'confirmed',
        type: 'video',
      },
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(docBuilder)
      .mockReturnValueOnce(currentAptBuilder);

    await expect(
      appointmentService.updateAppointmentStatus('doc-user-1', 'apt-future-2', 'in_progress')
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Consultation cannot be started yet. You can start it 10 minutes before the scheduled time.',
    });
  });

  test('appointmentService.updateAppointmentStatus allows future appointment confirmation', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const docBuilder = makeSingleBuilder({ data: { id: 'doc-1' }, error: null });
    const currentAptBuilder = makeSingleBuilder({
      data: {
        id: 'apt-future-3',
        appointment_date: futureDate,
        time_slot: '10:00',
        status: 'scheduled',
        type: 'video',
      },
      error: null,
    });
    const updateAptBuilder = makeSingleBuilder({
      data: {
        id: 'apt-future-3',
        appointment_date: futureDate,
        time_slot: '10:00',
        status: 'confirmed',
        type: 'video',
        doctor_id: 'doc-1',
        patient_id: 'patient-1',
      },
      error: null,
    });
    const patientUserBuilder = makeSingleBuilder({ data: { user_id: 'pat-user-1' }, error: null });
    const consultationsBuilder = {
      select: jest.fn(() => consultationsBuilder),
      in: jest.fn(() => consultationsBuilder),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    };

    supabaseAdmin.from
      .mockReturnValueOnce(docBuilder)
      .mockReturnValueOnce(currentAptBuilder)
      .mockReturnValueOnce(updateAptBuilder)
      .mockReturnValueOnce(patientUserBuilder)
      .mockReturnValueOnce(consultationsBuilder);

    const result = await appointmentService.updateAppointmentStatus('doc-user-1', 'apt-future-3', 'confirmed');
    expect(result.status).toBe('confirmed');
  });
});
