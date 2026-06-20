const { body } = require('express-validator');

const VALID_CLINIC_TYPES = [
  'General',
  'Dental',
  'Ayurvedic',
  'Homeopathic',
  'Specialty',
  'Polyclinic'
];

exports.validateClinicRegistration = [
  body('type')
    .optional()
    .isIn(VALID_CLINIC_TYPES)
    .withMessage(`Invalid clinic type. Must be one of: ${VALID_CLINIC_TYPES.join(', ')}`)
];
