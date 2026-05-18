const {
  calculateAge,
  dateOfBirthFromAge,
} = require('../utils/patientProfile');

describe('patient profile age/date_of_birth compatibility', () => {
  test('calculates age from stored date_of_birth', () => {
    expect(calculateAge('1992-01-01')).toBeGreaterThan(30);
  });

  test('converts legacy mobile age field into a date_of_birth value', () => {
    expect(dateOfBirthFromAge(34)).toMatch(/^\d{4}-01-01$/);
    expect(dateOfBirthFromAge(-1)).toBeNull();
    expect(dateOfBirthFromAge(151)).toBeNull();
  });
});
