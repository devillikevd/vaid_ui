const clinicService = require('../../services/clinicService');

describe('Clinic Department Architecture & Assignment Rules', () => {
    test('exports department assignment and available-doctors functions', () => {
        expect(typeof clinicService.getClinicDepartments).toBe('function');
        expect(typeof clinicService.getClinicDepartmentMeta).toBe('function');
        expect(typeof clinicService.getClinicDepartmentById).toBe('function');
        expect(typeof clinicService.getDepartmentAvailableDoctors).toBe('function');
        expect(typeof clinicService.assignDoctorToDepartment).toBe('function');
        expect(typeof clinicService.unassignDoctorFromDepartment).toBe('function');
        expect(typeof clinicService.setDepartmentDoctors).toBe('function');
        expect(typeof clinicService.getClinicDoctorsPublic).toBe('function');
    });
});
