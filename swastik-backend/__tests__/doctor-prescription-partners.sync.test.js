const doctorPartnerService = require('../services/doctorPartnerService');

describe('Doctor Prescription Partner & Referral Service Unit Tests', () => {
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
    await expect(
      doctorPartnerService.getValidatedDoctorAndPrescription('non-existent-user-id', 'some-prescription-id')
    ).rejects.toThrow();
  });
});
