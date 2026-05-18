const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 0;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return 0;

  const today = new Date();
  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthDate.getUTCMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }

  return age >= 0 && age <= 150 ? age : 0;
};

const dateOfBirthFromAge = (age) => {
  const parsedAge = Number.parseInt(age, 10);
  if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 150) return null;

  const year = new Date().getUTCFullYear() - parsedAge;
  return `${year}-01-01`;
};

module.exports = {
  calculateAge,
  dateOfBirthFromAge,
};
