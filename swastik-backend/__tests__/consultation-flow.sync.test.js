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
const notificationService = require('../services/notificationService');
const consultationService = require('../services/consultationService');
const eventEmitter = require('../services/eventEmitter');

const makeSelectBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

const makeUpdateBuilder = (result) => {
  const builder = {
    update: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    select: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

describe('consultation start/join delivery contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventEmitter.setIO(null);
  });

  test('patient can join an active consultation using appointment ID', async () => {
    const patientBuilder = makeSelectBuilder({ data: { id: 'patient-1' }, error: null });
    const directConsultationBuilder = makeSelectBuilder({ data: null, error: { code: 'PGRST116' } });
    const appointmentFallbackBuilder = makeSelectBuilder({
      data: {
        id: 'consultation-1',
        appointment_id: 'appointment-1',
        patient_id: 'patient-1',
        status: 'in_progress',
        room_id: null,
        patient_joined_at: null,
      },
      error: null,
    });
    const updateBuilder = makeUpdateBuilder({
      data: {
        id: 'consultation-1',
        appointment_id: 'appointment-1',
        patient_id: 'patient-1',
        status: 'in_progress',
        room_id: 'consultation-1',
        patient_joined_at: '2026-05-18T00:00:00.000Z',
      },
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(patientBuilder)
      .mockReturnValueOnce(directConsultationBuilder)
      .mockReturnValueOnce(appointmentFallbackBuilder)
      .mockReturnValueOnce(updateBuilder);

    const consultation = await consultationService.joinConsultation('patient-user-1', 'appointment-1');

    expect(consultation.id).toBe('consultation-1');
    expect(consultation.room_id).toBe('consultation-1');
    expect(supabaseAdmin.from).toHaveBeenCalledWith('patients');
    expect(supabaseAdmin.from).toHaveBeenCalledWith('consultations');
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      room_id: 'consultation-1',
      patient_joined_at: expect.any(String),
    }));
  });

  test('doctor start emits persistent patient notification with join metadata', async () => {
    eventEmitter.emitConsultationStarted({
      id: 'consultation-1',
      consultation_id: 'consultation-1',
      appointment_id: 'appointment-1',
      room_id: 'consultation-1',
      doctor_id: 'doctor-user-1',
      patient_id: 'patient-user-1',
      doctor_name: 'Asha',
    });

    expect(notificationService.sendNotification).toHaveBeenCalledWith(
      'patient-user-1',
      expect.objectContaining({
        type: 'consultation_started',
        title: 'Doctor is waiting',
        data: expect.objectContaining({
          consultationId: 'consultation-1',
          appointmentId: 'appointment-1',
          roomId: 'consultation-1',
          doctorName: 'Asha',
        }),
      })
    );
  });
});
