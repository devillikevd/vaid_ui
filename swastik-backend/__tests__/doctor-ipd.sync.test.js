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
const doctorIpdService = require('../services/doctorIpdService');

const makeQueryBuilder = (result) => {
  const promise = Promise.resolve(result);
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    neq: jest.fn(() => builder),
    or: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    single: jest.fn(() => promise),
    maybeSingle: jest.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return builder;
};

describe('Doctor IPD (In-Patients) & Ward Rounds Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDoctor = {
    id: 'doc-101',
    name: 'Dr. Sharma',
    specialization: 'Internal Medicine',
    hospital_id: 'hosp-1',
  };

  const mockDoctorNoHospital = {
    id: 'doc-102',
    name: 'Dr. Verma',
    specialization: 'Dermatology',
    hospital_id: null,
  };

  const mockAdmissions = [
    {
      id: 'adm-1',
      admission_number: 'IPD-2026-001',
      hospital_id: 'hosp-1',
      patient_id: 'pat-1',
      attending_doctor_id: 'doc-101',
      admitting_doctor_id: 'doc-101',
      ward_id: 'ward-1',
      bed_id: 'bed-101',
      admitted_at: '2026-08-25T10:00:00Z',
      status: 'admitted',
      provisional_diagnosis: 'Acute Gastroenteritis',
      patient: { id: 'pat-1', name: 'John Doe', age: 45, gender: 'Male', phone: '9876543210', blood_group: 'O+' },
      hospital: { id: 'hosp-1', name: 'City Central Hospital', address: 'Main St', city: 'Delhi' },
      ward: { id: 'ward-1', name: 'Male Medical Ward', ward_type: 'General' },
      bed: { id: 'bed-101', bed_number: 'B-101', bed_type: 'Standard' },
    },
  ];

  test('getMyAdmissions returns active admissions for affiliated doctor', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'hospital_doctors') {
        return makeQueryBuilder({ data: [{ hospital_id: 'hosp-1' }], error: null });
      }
      if (table === 'hospital_doctor_invites') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'patient_admissions') {
        return makeQueryBuilder({ data: mockAdmissions, error: null });
      }
      if (table === 'ipd_doctor_rounds') {
        return makeQueryBuilder({
          data: [{
            id: 'rnd-1',
            admission_id: 'adm-1',
            round_date: '2026-08-28T09:30:00Z',
            clinical_notes: 'Patient stable and afebrile',
            treatment_orders: 'Continue IV fluids',
          }],
          error: null,
        });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    const result = await doctorIpdService.getMyAdmissions('user-doc-1');
    expect(result.doctor.id).toBe('doc-101');
    expect(result.hasHospitalAffiliation).toBe(true);
    expect(result.admissions).toHaveLength(1);
    expect(result.admissions[0].admission_number).toBe('IPD-2026-001');
    expect(result.admissions[0].latest_round).toBeDefined();
    expect(result.admissions[0].latest_round.clinical_notes).toBe('Patient stable and afebrile');
  });

  test('getMyAdmissions correctly flags hasHospitalAffiliation: false for doctor without any hospital link', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctorNoHospital, error: null });
      }
      if (table === 'hospital_doctors') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'hospital_doctor_invites') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'patient_admissions') {
        return makeQueryBuilder({ data: [], error: null });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    const result = await doctorIpdService.getMyAdmissions('user-doc-2');
    expect(result.hasHospitalAffiliation).toBe(false);
    expect(result.admissions).toHaveLength(0);
  });

  test('createDoctorRound throws 403 Forbidden when doctor is not authorized for the admission', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctorNoHospital, error: null });
      }
      if (table === 'hospital_doctors') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'hospital_doctor_invites') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'patient_admissions') {
        return makeQueryBuilder({
          data: {
            id: 'adm-999',
            hospital_id: 'hosp-other',
            patient_id: 'pat-2',
            attending_doctor_id: 'doc-other',
            admitting_doctor_id: 'doc-other',
          },
          error: null,
        });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    await expect(
      doctorIpdService.createDoctorRound('user-doc-2', {
        admissionId: 'adm-999',
        clinicalNotes: 'Test SOAP note',
      })
    ).rejects.toThrow('Unauthorized to create rounds for this admission');
  });

  test('createDoctorRound successfully logs ward round note for authorized doctor', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'hospital_doctors') {
        return makeQueryBuilder({ data: [{ hospital_id: 'hosp-1' }], error: null });
      }
      if (table === 'hospital_doctor_invites') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'patient_admissions') {
        return makeQueryBuilder({
          data: {
            id: 'adm-1',
            hospital_id: 'hosp-1',
            patient_id: 'pat-1',
            attending_doctor_id: 'doc-101',
            admitting_doctor_id: 'doc-101',
          },
          error: null,
        });
      }
      if (table === 'ipd_doctor_rounds') {
        return makeQueryBuilder({
          data: {
            id: 'rnd-new',
            admission_id: 'adm-1',
            doctor_id: 'doc-101',
            clinical_notes: 'Patient responding well to treatment',
          },
          error: null,
        });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    const round = await doctorIpdService.createDoctorRound('user-doc-1', {
      admissionId: 'adm-1',
      clinicalNotes: 'Patient responding well to treatment',
      dischargeRecommended: false,
    });

    expect(round).toBeDefined();
    expect(round.id).toBe('rnd-new');
  });

  test('getDoctorRounds throws 403 Forbidden for unauthorized doctor', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctorNoHospital, error: null });
      }
      if (table === 'hospital_doctors') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'hospital_doctor_invites') {
        return makeQueryBuilder({ data: [], error: null });
      }
      if (table === 'patient_admissions') {
        return makeQueryBuilder({
          data: {
            id: 'adm-other',
            hospital_id: 'hosp-other',
            attending_doctor_id: 'doc-someone-else',
            admitting_doctor_id: 'doc-someone-else',
          },
          error: null,
        });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    await expect(
      doctorIpdService.getDoctorRounds('user-doc-2', 'adm-other')
    ).rejects.toThrow('Unauthorized to view rounds for this admission');
  });
});
