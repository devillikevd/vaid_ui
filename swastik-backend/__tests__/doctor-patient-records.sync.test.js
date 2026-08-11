jest.mock('../config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

jest.mock('../config/minio', () => ({
  uploadProfileImage: jest.fn(),
  deleteFile: jest.fn(),
  signStorageUrlsInPayload: jest.fn((payload) => Promise.resolve(payload)),
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
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
    single: jest.fn(() => promise),
    maybeSingle: jest.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
};

describe('doctor patient records from consultations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists patients who only have consultation rows', async () => {
    const doctorBuilder = makeQueryBuilder({ data: { id: 'doctor-1' }, error: null });
    const appointmentsBuilder = makeQueryBuilder({ data: [], error: null });
    const consultationsBuilder = makeQueryBuilder({
      data: [
        {
          patient_id: 'patient-1',
          started_at: '2026-05-18T03:15:00.000Z',
          ended_at: null,
          created_at: '2026-05-18T03:00:00.000Z',
          patient: {
            id: 'patient-1',
            name: 'Patient One',
            date_of_birth: '1992-01-01',
            gender: 'female',
            blood_group: 'B+',
            profile_image_url: null,
            user: {
              email: 'patient@example.com',
              phone: '+919999999999',
            },
          },
        },
      ],
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(doctorBuilder)
      .mockReturnValueOnce(appointmentsBuilder)
      .mockReturnValueOnce(consultationsBuilder);

    const result = await doctorService.getPatients('doctor-user-1', 1, 20, '');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(expect.objectContaining({
      id: 'patient-1',
      name: 'Patient One',
      age: expect.any(Number),
      email: 'patient@example.com',
      phone: '+919999999999',
      lastVisit: '2026-05-18T03:15:00.000Z',
      totalVisits: 1,
    }));
    expect(result.pagination.total).toBe(1);
    expect(supabaseAdmin.from).toHaveBeenCalledWith('consultations');
  });

  test('allows details for consultation-only patients', async () => {
    const doctorBuilder = makeQueryBuilder({ data: { id: 'doctor-1' }, error: null });
    const appointmentAccessBuilder = makeQueryBuilder({ data: null, error: null });
    const consultationAccessBuilder = makeQueryBuilder({ data: { id: 'consultation-1' }, error: null });
    const grantBuilder = makeQueryBuilder({ data: null, error: null });
    const patientBuilder = makeQueryBuilder({
      data: {
        id: 'patient-1',
        name: 'Patient One',
        date_of_birth: '1992-01-01',
        user: {
          email: 'patient@example.com',
          phone: '+919999999999',
        },
      },
      error: null,
    });
    const consultationsBuilder = makeQueryBuilder({
      data: [
        {
          id: 'consultation-1',
          started_at: '2026-05-18T03:15:00.000Z',
          ended_at: null,
          created_at: '2026-05-18T03:00:00.000Z',
          prescriptions: [],
        },
      ],
      error: null,
    });
    const appointmentsBuilder = makeQueryBuilder({ data: [], error: null });
    const reportsBuilder = makeQueryBuilder({ data: [], error: null });
    const notesBuilder = makeQueryBuilder({ data: { notes: '' }, error: null });

    supabaseAdmin.from
      .mockReturnValueOnce(doctorBuilder)
      .mockReturnValueOnce(appointmentAccessBuilder)
      .mockReturnValueOnce(consultationAccessBuilder)
      .mockReturnValueOnce(grantBuilder)
      .mockReturnValueOnce(patientBuilder)
      .mockReturnValueOnce(consultationsBuilder)
      .mockReturnValueOnce(appointmentsBuilder)
      .mockReturnValueOnce(reportsBuilder)
      .mockReturnValueOnce(notesBuilder);

    const result = await doctorService.getPatientDetails('doctor-user-1', 'patient-1');

    expect(result).toEqual(expect.objectContaining({
      id: 'patient-1',
      name: 'Patient One',
      age: expect.any(Number),
      email: 'patient@example.com',
      phone: '+919999999999',
      totalVisits: 1,
      lastVisit: '2026-05-18T03:15:00.000Z',
    }));
    expect(result.consultations).toHaveLength(1);
  });
});
