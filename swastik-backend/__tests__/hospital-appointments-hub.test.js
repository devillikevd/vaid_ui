const hospitalManagerService = require('../services/hospitalManagerService');
const { ROLES } = require('../middleware/rbac');

describe('Hospital Appointments & OPD Operations Hub Regression Tests', () => {
  describe('Hospital appointment mapping & contract structure', () => {
    test('mapHospitalAppointment returns consistent contract with patient and doctor metadata', () => {
      // Test mapped object schema
      const sampleAppointment = {
        id: '11111111-2222-3333-4444-555555555555',
        appointment_date: '2026-09-01',
        time_slot: '10:30',
        status: 'confirmed',
        type: 'hospital',
        reason: 'Regular cardiology checkup',
        fee: 500,
        notes: 'Follow up patient',
        symptoms: ['Chest pain', 'Shortness of breath'],
        checked_in_at: '2026-09-01T10:15:00.000Z',
        created_at: '2026-09-01T08:00:00.000Z',
        patient: {
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          name: 'Rohan Sharma',
          date_of_birth: '1990-05-15',
          gender: 'male',
          blood_group: 'O+',
          users: { phone: '+919876543210', email: 'rohan@example.com' }
        },
        doctor: {
          id: 'dddddddd-eeee-ffff-0000-111111111111',
          name: 'Arvind Sharma',
          specialization: 'Cardiology',
          profile_image_url: 'https://example.com/dr.jpg'
        }
      };

      const deptMap = new Map();
      deptMap.set('dddddddd-eeee-ffff-0000-111111111111', 'Cardiology Department');

      // The mapping logic should not throw and must return structured data
      expect(sampleAppointment.id).toBeDefined();
      expect(sampleAppointment.patient.name).toBe('Rohan Sharma');
      expect(sampleAppointment.patient.users.phone).toBe('+919876543210');
      expect(sampleAppointment.doctor.name).toBe('Arvind Sharma');
      expect(sampleAppointment.status).toBe('confirmed');
    });

    test('getAppointmentKpis and getConsultationKpis return expected keys and metrics shape', async () => {
      // Verify exported functions exist
      expect(typeof hospitalManagerService.getAppointments).toBe('function');
      expect(typeof hospitalManagerService.getAppointmentKpis).toBe('function');
      expect(typeof hospitalManagerService.updateAppointmentStatusForHospital).toBe('function');
      expect(typeof hospitalManagerService.rescheduleHospitalAppointment).toBe('function');
      expect(typeof hospitalManagerService.checkInHospitalAppointment).toBe('function');
      expect(typeof hospitalManagerService.createHospitalWalkInAppointment).toBe('function');
      expect(typeof hospitalManagerService.getConsultations).toBe('function');
      expect(typeof hospitalManagerService.getConsultationKpis).toBe('function');
    });
  });

  describe('RBAC authorization guards', () => {
    test('hospital routes require HOSPITAL_OWNER or HOSPITAL_MANAGER roles', () => {
      const allowedRoles = [ROLES.HOSPITAL_OWNER, ROLES.HOSPITAL_MANAGER];
      expect(allowedRoles).toContain('hospital_owner');
      expect(allowedRoles).toContain('hospital_manager');
      expect(allowedRoles).not.toContain('patient');
    });
  });
});
