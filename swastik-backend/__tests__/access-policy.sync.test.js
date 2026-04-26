const { ROLES } = require('../middleware/rbac');
const {
  CONSULTATION_ROLE_POLICY,
  VITALS_SESSION_ALLOWED_ROLES,
} = require('../config/accessPolicy');

describe('consultation + vitals access policy sync', () => {
  test('consultation role policy matches expected clinical flow ownership', () => {
    expect(CONSULTATION_ROLE_POLICY).toEqual({
      START: ROLES.DOCTOR,
      JOIN: ROLES.PATIENT,
      END: ROLES.DOCTOR,
      LEAVE: ROLES.PATIENT,
      ADD_PRESCRIPTION: ROLES.DOCTOR,
      AI_ASSIST: ROLES.DOCTOR,
    });
  });

  test('vitals session allowed roles include all required operational roles', () => {
    const expected = [
      ROLES.DOCTOR,
      ROLES.PATIENT,
      ROLES.SUPER_ADMIN,
      ROLES.ADMIN,
      ROLES.HOSPITAL_OWNER,
      ROLES.HOSPITAL_MANAGER,
      ROLES.CLINIC_OWNER,
    ];

    expect(VITALS_SESSION_ALLOWED_ROLES).toEqual(expected);
    expect(new Set(VITALS_SESSION_ALLOWED_ROLES).size).toBe(VITALS_SESSION_ALLOWED_ROLES.length);
  });
});
