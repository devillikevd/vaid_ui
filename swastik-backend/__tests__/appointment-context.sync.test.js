jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../services/notificationService', () => ({
  sendNotification: jest.fn(() => Promise.resolve({ id: 'notification-1' })),
}));

const { supabaseAdmin } = require('../config/supabase');
const appointmentService = require('../services/appointmentService');

const makeSingleBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

const makeAppointmentsBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    or: jest.fn(() => builder),
    range: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

const makeTerminalInBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    in: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

const makeTerminalOrderBuilder = (result) => {
  const builder = {
    select: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => Promise.resolve(result)),
  };
  return builder;
};

describe('appointment active visibility and consultation context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('active appointments include in-progress sessions with rejoin and prescription context', async () => {
    const patientBuilder = makeSingleBuilder({ data: { id: 'patient-1' }, error: null });
    const appointmentsBuilder = makeAppointmentsBuilder({
      data: [
        {
          id: 'appointment-1',
          patient_id: 'patient-1',
          doctor_id: 'doctor-1',
          appointment_date: '2026-06-27',
          time_slot: '10:00',
          type: 'video',
          status: 'in_progress',
        },
      ],
      count: 1,
      error: null,
    });
    const contextConsultationsBuilder = makeTerminalOrderBuilder({
      data: [
        {
          id: 'consultation-1',
          appointment_id: 'appointment-1',
          status: 'in_progress',
          room_id: 'consultation-1',
          created_at: '2026-06-27T04:30:00.000Z',
        },
      ],
      error: null,
    });
    const prescriptionsBuilder = makeTerminalInBuilder({
      data: [{ id: 'rx-1', consultation_id: 'consultation-1' }],
      error: null,
    });
    const reviewConsultationsBuilder = makeTerminalInBuilder({
      data: [{ id: 'consultation-1', appointment_id: 'appointment-1' }],
      error: null,
    });
    const reviewsBuilder = makeTerminalInBuilder({ data: [], error: null });

    const consultationBuilders = [contextConsultationsBuilder, reviewConsultationsBuilder];
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'patients') return patientBuilder;
      if (table === 'appointments') return appointmentsBuilder;
      if (table === 'consultations') return consultationBuilders.shift();
      if (table === 'prescriptions') return prescriptionsBuilder;
      if (table === 'reviews') return reviewsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await appointmentService.getAppointments(
      'patient-user-1',
      'patient',
      { status: 'active' },
      1,
      10
    );

    expect(appointmentsBuilder.in).toHaveBeenCalledWith('status', ['scheduled', 'confirmed', 'in_progress']);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(expect.objectContaining({
      id: 'appointment-1',
      status: 'in_progress',
      consultation_id: 'consultation-1',
      consultation_status: 'in_progress',
      consultation_room_id: 'consultation-1',
      has_prescription: true,
      is_reviewed: false,
    }));
    expect(result.pagination.total).toBe(1);
  });
});
