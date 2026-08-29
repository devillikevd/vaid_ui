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

jest.mock('../services/organizationPartnershipService', () => ({
  getPartnerships: jest.fn(),
  verifyActivePartnership: jest.fn(),
}));

jest.mock('../services/pharmacyService', () => ({
  createHospitalPharmacyOrder: jest.fn(),
  createClinicPharmacyOrder: jest.fn(),
}));

const { supabaseAdmin } = require('../config/supabase');
const organizationPartnershipService = require('../services/organizationPartnershipService');
const pharmacyService = require('../services/pharmacyService');
const doctorPartnerService = require('../services/doctorPartnerService');

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

describe('Doctor Prescription Partner & Referral Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDoctor = {
    id: 'doc-101',
    name: 'Dr. Sharma',
    user_id: 'user-doc-1',
  };

  const mockPrescription = {
    id: 'rx-101',
    doctor_id: 'doc-101',
    patient_id: 'patient-202',
    consultation_id: 'consult-303',
    diagnosis: 'Type 2 Diabetes',
    notes: 'Continue metformin',
    consultations: {
      id: 'consult-303',
      appointment_id: 'apt-404',
      appointments: {
        id: 'apt-404',
        clinic_id: 'clinic-505',
        hospital_id: null,
        type: 'in_person',
      },
    },
  };

  test('doctorPartnerService exports all required methods', () => {
    expect(typeof doctorPartnerService.getDoctorAffiliatedFacilities).toBe('function');
    expect(typeof doctorPartnerService.getValidatedDoctorAndPrescription).toBe('function');
    expect(typeof doctorPartnerService.getPrescriptionPharmacyPartners).toBe('function');
    expect(typeof doctorPartnerService.getPrescriptionDiagnosticPartners).toBe('function');
    expect(typeof doctorPartnerService.getPrescriptionHospitalPartners).toBe('function');
    expect(typeof doctorPartnerService.routePrescriptionToPharmacy).toBe('function');
    expect(typeof doctorPartnerService.routePrescriptionToDiagnostic).toBe('function');
    expect(typeof doctorPartnerService.referPrescriptionToHospital).toBe('function');
  });

  test('rejects access if doctor does not exist', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    await expect(
      doctorPartnerService.getValidatedDoctorAndPrescription('non-existent-user-id', 'rx-101')
    ).rejects.toThrow('Doctor profile not found');
  });

  test('rejects access if prescription does not exist', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'prescriptions') {
        return makeQueryBuilder({ data: null, error: { message: 'Not found' } });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    await expect(
      doctorPartnerService.getValidatedDoctorAndPrescription('user-doc-1', 'rx-non-existent')
    ).rejects.toThrow('Prescription not found');
  });

  test('rejects access if prescription belongs to another doctor', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'prescriptions') {
        return makeQueryBuilder({
          data: { ...mockPrescription, doctor_id: 'other-doctor-id' },
          error: null,
        });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    await expect(
      doctorPartnerService.getValidatedDoctorAndPrescription('user-doc-1', 'rx-101')
    ).rejects.toThrow('Prescription does not belong to you');
  });

  test('successfully retrieves validated doctor and prescription', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'prescriptions') {
        return makeQueryBuilder({ data: mockPrescription, error: null });
      }
      return makeQueryBuilder({ data: null, error: null });
    });

    const result = await doctorPartnerService.getValidatedDoctorAndPrescription('user-doc-1', 'rx-101');
    expect(result.doctor.id).toBe('doc-101');
    expect(result.prescription.id).toBe('rx-101');
  });

  test('getPrescriptionPharmacyPartners returns active pharmacy partners', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'prescriptions') {
        return makeQueryBuilder({ data: mockPrescription, error: null });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    organizationPartnershipService.getPartnerships.mockResolvedValue([
      {
        id: 'part-1',
        partner: { id: 'pharm-1', name: 'Apollo Pharmacy', type: 'pharmacy' },
      },
    ]);

    const partners = await doctorPartnerService.getPrescriptionPharmacyPartners('user-doc-1', 'rx-101');
    expect(partners).toHaveLength(1);
    expect(partners[0].partner.name).toBe('Apollo Pharmacy');
  });

  test('routePrescriptionToPharmacy creates order via pharmacyService', async () => {
    supabaseAdmin.from.mockImplementation((table) => {
      if (table === 'doctors') {
        return makeQueryBuilder({ data: mockDoctor, error: null });
      }
      if (table === 'prescriptions') {
        return makeQueryBuilder({ data: mockPrescription, error: null });
      }
      return makeQueryBuilder({ data: [], error: null });
    });

    organizationPartnershipService.verifyActivePartnership.mockResolvedValue({ id: 'partnership-1' });
    pharmacyService.createClinicPharmacyOrder.mockResolvedValue({ id: 'order-1', status: 'placed' });

    const order = await doctorPartnerService.routePrescriptionToPharmacy('user-doc-1', 'rx-101', {
      pharmacyId: 'pharm-1',
      items: [{ medicine_name: 'Metformin 500mg', quantity: 30 }],
      deliveryType: 'pickup',
    });

    expect(order.id).toBe('order-1');
    expect(pharmacyService.createClinicPharmacyOrder).toHaveBeenCalledWith(
      'clinic-505',
      'doc-101',
      expect.objectContaining({
        prescriptionId: 'rx-101',
        pharmacyId: 'pharm-1',
      })
    );
  });
});
