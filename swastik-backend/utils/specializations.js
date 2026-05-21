/**
 * Standardized specialization list used across the platform.
 * Doctors MUST select from this list during registration & profile setup.
 * Patient app categories map to these exact strings.
 */
const SPECIALIZATIONS = [
  // General Care
  'General Physician',
  'Family Medicine',

  // Women's Health
  'Gynecology',
  'Obstetrics',

  // Skin & Hair
  'Dermatology',

  // Child Care
  'Pediatrics',

  // Dental
  'Dentistry',

  // Eye
  'Ophthalmology',

  // ENT
  'ENT',

  // Mental Health
  'Psychiatry',
  'Psychology',

  // Bones & Joints
  'Orthopedics',

  // Brain & Nerves
  'Neurology',
  'Neurosurgery',

  // Urinary
  'Urology',
  'Nephrology',

  // Lungs
  'Pulmonology',

  // Heart
  'Cardiology',
  'Cardiac Surgery',

  // Stomach & Digestive
  'Gastroenterology',

  // Diabetes & Hormones
  'Endocrinology',
  'Diabetology',

  // Cancer
  'Oncology',

  // Surgery
  'General Surgery',
  'Plastic Surgery',
  'Vascular Surgery',

  // Other
  'Physiotherapy',
  'Radiology',
  'Pathology',
  'Anesthesiology',
  'Emergency Medicine',
  'Infectious Disease',
  'Rheumatology',
  'Allergy & Immunology',
  'Hematology',
  'Geriatrics',
  'Sports Medicine',
  'Pain Management',
  'Nutrition & Dietetics',
  'Ayurveda',
  'Homeopathy',
  'Other',
];

/**
 * Maps patient-app category display names to matching specialization(s).
 * Used by the backend to support fuzzy category-based search.
 */
const CATEGORY_TO_SPECIALIZATIONS = {
  'General Physician': ['General Physician', 'Family Medicine'],
  "Women's Health": ['Gynecology', 'Obstetrics'],
  'Skin & Hair': ['Dermatology'],
  'Child Care': ['Pediatrics'],
  'Dentist': ['Dentistry'],
  'Eye Specialist': ['Ophthalmology'],
  'ENT': ['ENT'],
  'Mental Wellness': ['Psychiatry', 'Psychology'],
  'Bones & Joints': ['Orthopedics'],
  'Brain & Nerves': ['Neurology', 'Neurosurgery'],
  'Urinary': ['Urology', 'Nephrology'],
  'Lungs': ['Pulmonology'],
  'Heart': ['Cardiology', 'Cardiac Surgery'],
  'Stomach': ['Gastroenterology'],
  'Diabetes': ['Endocrinology', 'Diabetology'],
  'Cancer': ['Oncology'],
};

module.exports = { SPECIALIZATIONS, CATEGORY_TO_SPECIALIZATIONS };
