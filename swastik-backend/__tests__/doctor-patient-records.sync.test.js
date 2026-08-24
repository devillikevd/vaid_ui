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
    const prescriptionsBuilder = makeQueryBuilder({ data: [], error: null });
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
      .mockReturnValueOnce(prescriptionsBuilder)
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

  test('applies multi-dimensional filtering: search, source, visitType, and combined AND logic', async () => {
    const mockDoctor = { id: 'doc-1' };
    const mockAppointments = [
      {
        patient_id: 'pat-1',
        appointment_date: '2026-08-20',
        created_at: '2026-08-20T10:00:00Z',
        type: 'video',
        status: 'completed',
        payment_reference: 'PAY_123',
        reason: 'General checkup',
        patient: {
          id: 'pat-1',
          name: 'Divyanshu Singh',
          date_of_birth: '1995-05-10',
          gender: 'male',
          blood_group: 'O+',
          profile_image_url: null,
          user: { email: 'divyanshu@example.com', phone: '+917355442326' },
        },
      },
      {
        patient_id: 'pat-2',
        appointment_date: '2026-08-22',
        created_at: '2026-08-22T11:00:00Z',
        type: 'clinic',
        status: 'completed',
        payment_reference: 'PAY_VAIDIDEA_002',
        reason: 'Scheduled clinic visit',
        patient: {
          id: 'pat-2',
          name: 'Rahul Verma',
          date_of_birth: '1990-03-12',
          gender: 'male',
          blood_group: 'B+',
          profile_image_url: null,
          user: { email: 'rahul@example.com', phone: '+919811122233' },
        },
      },
      {
        patient_id: 'pat-3',
        appointment_date: '2026-08-23',
        created_at: '2026-08-23T09:00:00Z',
        type: 'walk_in',
        status: 'completed',
        payment_reference: 'DIRECT_WALK_IN_99',
        reason: 'Direct walk-in visit',
        patient: {
          id: 'pat-3',
          name: 'Anshu Sharma',
          date_of_birth: '1998-08-15',
          gender: 'female',
          blood_group: 'A+',
          profile_image_url: null,
          user: { email: 'anshu@practice.org', phone: '+919876543210' },
        },
      },
      {
        patient_id: 'pat-3',
        appointment_date: '2026-08-24',
        created_at: '2026-08-24T09:00:00Z',
        type: 'video',
        status: 'completed',
        payment_reference: 'PAY_VAIDIDEA_99',
        reason: 'Follow-up on Vaididea app',
        patient: {
          id: 'pat-3',
          name: 'Anshu Sharma',
          date_of_birth: '1998-08-15',
          gender: 'female',
          blood_group: 'A+',
          profile_image_url: null,
          user: { email: 'anshu@practice.org', phone: '+919876543210' },
        },
      },
    ];

    const mockConsultations = [];

    const setupMocks = () => {
      supabaseAdmin.from
        .mockReturnValueOnce(makeQueryBuilder({ data: mockDoctor, error: null }))
        .mockReturnValueOnce(makeQueryBuilder({ data: mockAppointments, error: null }))
        .mockReturnValueOnce(makeQueryBuilder({ data: mockConsultations, error: null }));
    };

    // 1. Search by name (case-insensitive partial)
    setupMocks();
    const searchNameRes = await doctorService.getPatients('user-1', 1, 20, 'divyanshu');
    expect(searchNameRes.data).toHaveLength(1);
    expect(searchNameRes.data[0].id).toBe('pat-1');

    // 2. Search by email with dot
    setupMocks();
    const searchEmailRes = await doctorService.getPatients('user-1', 1, 20, 'anshu@practice.org');
    expect(searchEmailRes.data).toHaveLength(1);
    expect(searchEmailRes.data[0].id).toBe('pat-3');

    // 3. Search by phone
    setupMocks();
    const searchPhoneRes = await doctorService.getPatients('user-1', 1, 20, '7355442326');
    expect(searchPhoneRes.data).toHaveLength(1);
    expect(searchPhoneRes.data[0].id).toBe('pat-1');

    // 4. Source = vaididea (pat-1, pat-2, pat-3 all have Vaididea visits)
    setupMocks();
    const vaidideaRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'vaididea');
    expect(vaidideaRes.data.map(p => p.id)).toEqual(expect.arrayContaining(['pat-1', 'pat-2', 'pat-3']));

    // 5. Source = direct (pat-3 has direct visit)
    setupMocks();
    const directRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'direct');
    expect(directRes.data).toHaveLength(1);
    expect(directRes.data[0].id).toBe('pat-3');

    // 6. Source = mixed (pat-3 has both direct and vaididea)
    setupMocks();
    const mixedRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'mixed');
    expect(mixedRes.data).toHaveLength(1);
    expect(mixedRes.data[0].id).toBe('pat-3');

    // 7. Visit Type = in_person_clinic (pat-2)
    setupMocks();
    const clinicRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'all', 'in_person_clinic');
    expect(clinicRes.data).toHaveLength(1);
    expect(clinicRes.data[0].id).toBe('pat-2');

    // 8. Visit Type = walk_in_clinic (pat-3)
    setupMocks();
    const walkInRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'all', 'walk_in_clinic');
    expect(walkInRes.data).toHaveLength(1);
    expect(walkInRes.data[0].id).toBe('pat-3');

    // 9. Combined: Source = vaididea + Visit Type = in_person_clinic (pat-2 has Vaididea clinic visit)
    setupMocks();
    const combinedVaidClinicRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'vaididea', 'in_person_clinic');
    expect(combinedVaidClinicRes.data).toHaveLength(1);
    expect(combinedVaidClinicRes.data[0].id).toBe('pat-2');

    // 10. Combined: Source = direct + Visit Type = walk_in_clinic (pat-3 has Direct walk-in visit)
    setupMocks();
    const combinedDirectWalkInRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'direct', 'walk_in_clinic');
    expect(combinedDirectWalkInRes.data).toHaveLength(1);
    expect(combinedDirectWalkInRes.data[0].id).toBe('pat-3');

    // 11. Combined: Source = direct + Visit Type = video_consultation (pat-3's video visit was Vaididea, not direct -> 0 matches)
    setupMocks();
    const combinedDirectVideoRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'direct', 'video_consultation');
    expect(combinedDirectVideoRes.data).toHaveLength(0);

    // 12. Combined: Source = vaididea + Visit Type = video_consultation (pat-1 and pat-3 have Vaididea video visits -> 2 matches)
    setupMocks();
    const combinedVaidVideoRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent', 'vaididea', 'video_consultation');
    expect(combinedVaidVideoRes.data).toHaveLength(2);
    expect(combinedVaidVideoRes.data.map(p => p.id)).toEqual(expect.arrayContaining(['pat-1', 'pat-3']));

    // 13. Sorting: Frequent visits first (pat-3 has 2 visits, pat-1 and pat-2 have 1 visit)
    setupMocks();
    const sortFreqRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'frequent');
    expect(sortFreqRes.data[0].id).toBe('pat-3');
    expect(sortFreqRes.data[0].totalVisits).toBe(2);

    // 14. Sorting: Recent visit first (pat-3 on Aug 24, pat-2 on Aug 22, pat-1 on Aug 20)
    setupMocks();
    const sortRecentRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'recent');
    expect(sortRecentRes.data[0].id).toBe('pat-3');
    expect(sortRecentRes.data[1].id).toBe('pat-2');
    expect(sortRecentRes.data[2].id).toBe('pat-1');

    // 15. Sorting: Oldest visit first (pat-1 on Aug 20, pat-2 on Aug 22, pat-3 on Aug 24)
    setupMocks();
    const sortOldestRes = await doctorService.getPatients('user-1', 1, 20, '', 'all', 'oldest');
    expect(sortOldestRes.data[0].id).toBe('pat-1');
    expect(sortOldestRes.data[1].id).toBe('pat-2');
    expect(sortOldestRes.data[2].id).toBe('pat-3');
  });
});
