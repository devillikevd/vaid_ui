jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  cacheGet: jest.fn(() => Promise.resolve(null)),
  cacheSet: jest.fn(() => Promise.resolve()),
  cacheDel: jest.fn(() => Promise.resolve()),
}));

const { supabaseAdmin } = require('../config/supabase');
const doctorService = require('../services/doctorService');

const makeQueryBuilder = (result) => {
  const promise = Promise.resolve(result);
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    or: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    single: jest.fn(() => promise),
    maybeSingle: jest.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
};

describe('doctorService.recordDirectVisit & Practice Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose direct visit and search methods', () => {
    expect(typeof doctorService.recordDirectVisit).toBe('function');
    expect(typeof doctorService.searchPatientByPhone).toBe('function');
    expect(typeof doctorService.getAnalytics).toBe('function');
  });

  it('should reject when doctor does not exist', async () => {
    supabaseAdmin.from.mockReturnValue(makeQueryBuilder({ data: null, error: { message: 'Not found' } }));
    await expect(doctorService.recordDirectVisit('non-existent-user-id', {
      patientName: 'Test Patient',
      phone: '9876543210',
    })).rejects.toThrow('Doctor profile not found');
  });

  it('should validate patient name and phone when doctor is found', async () => {
    const origResolveDoctor = doctorService._resolveDoctor;
    doctorService._resolveDoctor = jest.fn().mockResolvedValue({
      id: 'doc-uuid-1',
      user_id: 'user-uuid-1',
      consultation_fee: 500,
    });

    try {
      await expect(doctorService.recordDirectVisit('user-uuid-1', {}))
        .rejects
        .toThrow('Patient name and mobile phone number are required');
    } finally {
      doctorService._resolveDoctor = origResolveDoctor;
    }
  });

  it('should record direct walk-in visit for test patient Anshu (9161410177)', async () => {
    const origResolveDoctor = doctorService._resolveDoctor;
    doctorService._resolveDoctor = jest.fn().mockResolvedValue({
      id: 'doc-uuid-1',
      user_id: 'user-uuid-1',
      consultation_fee: 500,
    });

    const mockAppointment = {
      id: 'appt-uuid-direct-1',
      appointment_number: 'DIR-123456-789',
      patient_id: 'pat-uuid-anshu-1',
      doctor_id: 'doc-uuid-1',
      appointment_date: '2026-08-24',
      time_slot: '14:30:00',
      type: 'clinic',
      source: 'direct_walk_in',
      status: 'completed',
      fee: 500,
      consultation_fee: 500,
      payment_status: 'paid',
      payment_reference: 'CASH',
      reason: 'Direct Walk-in Consultation',
      patient: {
        id: 'pat-uuid-anshu-1',
        name: 'Anshu',
        gender: 'male',
        date_of_birth: '2006-01-01',
        user: { phone: '+919161410177', email: null },
      },
    };

    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'users') {
        return makeQueryBuilder({ data: [{ id: 'user-uuid-anshu-1', name: 'Anshu', phone: '+919161410177' }], error: null });
      }
      if (table === 'patients') {
        return makeQueryBuilder({ data: [{ id: 'pat-uuid-anshu-1', user_id: 'user-uuid-anshu-1', name: 'Anshu', gender: 'male' }], error: null });
      }
      if (table === 'appointments') {
        return makeQueryBuilder({ data: mockAppointment, error: null });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    try {
      const result = await doctorService.recordDirectVisit('user-uuid-1', {
        phone: '9161410177',
        patientName: 'Anshu',
        gender: 'Male',
        age: 20,
        visitType: 'walk_in',
        fee: 500,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        reasonForVisit: 'Routine consultation',
      });

      expect(result).toBeDefined();
      expect(result.appointment).toBeDefined();
      expect(result.appointment.id).toBe('appt-uuid-direct-1');
      expect(result.appointment.patient_id).toBe('pat-uuid-anshu-1');
      expect(result.appointment.source).toBe('direct_walk_in');
      expect(result.appointment.status).toBe('completed');
      expect(result.appointment.fee).toBe(500);
    } finally {
      doctorService._resolveDoctor = origResolveDoctor;
    }
  });
});

