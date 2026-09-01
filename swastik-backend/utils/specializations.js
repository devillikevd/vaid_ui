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
  'Sexology',
  'Sexologist',
  'Sexual Health',
  'Andrology',
  'Veterinary',
  'Other',
];

/**
 * Maps patient-app category & symptom display names to matching specialization(s).
 * Used by the backend to support fuzzy category & symptom-based search.
 */
const CATEGORY_TO_SPECIALIZATIONS = {
  // General
  'General Physician': ['General Physician', 'Family Medicine'],
  'General Care': ['General Physician', 'Family Medicine'],
  'Fever': ['General Physician', 'Family Medicine'],
  'Viral Fever': ['General Physician', 'Family Medicine'],
  'Cold & Cough': ['General Physician', 'Family Medicine', 'Pulmonology'],
  'Cold': ['General Physician', 'Family Medicine'],
  'Cough': ['General Physician', 'Pulmonology'],
  'COVID': ['General Physician', 'Pulmonology'],
  'Weakness': ['General Physician', 'Family Medicine'],

  // Women's Health
  "Women's Health": ['Gynecology', 'Obstetrics'],
  'Gynecologist': ['Gynecology', 'Obstetrics'],
  'Gynecology': ['Gynecology', 'Obstetrics'],
  'Obstetrics': ['Obstetrics', 'Gynecology'],
  'Pregnancy': ['Gynecology', 'Obstetrics'],
  'Period Pain': ['Gynecology', 'Obstetrics'],
  'PCOS': ['Gynecology', 'Endocrinology'],
  'PCOD': ['Gynecology', 'Endocrinology'],
  'Fertility': ['Gynecology'],
  'IVF': ['Gynecology'],

  // Brain & Nerves / Symptoms
  'Brain & Nerves': ['Neurology', 'Neurosurgery'],
  'Neurology': ['Neurology', 'Neurosurgery'],
  'Neurologist': ['Neurology', 'Neurosurgery'],
  'Headache': ['Neurology', 'Neurosurgery'],
  'Migraine': ['Neurology'],
  'Head Pain': ['Neurology'],
  'Seizures': ['Neurology'],
  'Epilepsy': ['Neurology'],
  'Stroke': ['Neurology'],
  'Dizziness': ['Neurology', 'ENT'],

  // Skin & Hair
  'Skin & Hair': ['Dermatology'],
  'Dermatologist': ['Dermatology'],
  'Dermatology': ['Dermatology'],
  'Acne': ['Dermatology'],
  'Pimples': ['Dermatology'],
  'Hair Fall': ['Dermatology'],
  'Hair Loss': ['Dermatology'],
  'Skin Rash': ['Dermatology'],
  'Itching': ['Dermatology'],
  'Eczema': ['Dermatology'],
  'Psoriasis': ['Dermatology'],

  // Child Care
  'Child Care': ['Pediatrics'],
  'Child Specialist': ['Pediatrics'],
  'Pediatrics': ['Pediatrics'],
  'Pediatrician': ['Pediatrics'],

  // Dental
  'Dentist': ['Dentistry'],
  'Dental Care': ['Dentistry'],
  'Dentistry': ['Dentistry'],
  'Toothache': ['Dentistry'],
  'Teeth': ['Dentistry'],

  // Eye
  'Eye Specialist': ['Ophthalmology'],
  'Ophthalmology': ['Ophthalmology'],
  'Ophthalmologist': ['Ophthalmology'],
  'Eye Pain': ['Ophthalmology'],
  'Cataract': ['Ophthalmology'],

  // ENT
  'ENT': ['ENT'],
  'ENT Specialist': ['ENT'],
  'Ear, Nose, Throat': ['ENT'],
  'Sinus': ['ENT'],
  'Sinusitis': ['ENT'],
  'Vertigo': ['ENT'],
  'Ear Pain': ['ENT'],
  'Throat Pain': ['ENT'],

  // Mental Health
  'Mental Wellness': ['Psychiatry', 'Psychology'],
  'Psychiatry': ['Psychiatry', 'Psychology'],
  'Psychiatrist': ['Psychiatry'],
  'Psychology': ['Psychology'],
  'Anxiety': ['Psychiatry', 'Psychology'],
  'Depression': ['Psychiatry', 'Psychology'],
  'Stress': ['Psychiatry', 'Psychology'],
  'Insomnia': ['Psychiatry', 'Psychology'],

  // Bones & Joints
  'Bones & Joints': ['Orthopedics'],
  'Orthopedics': ['Orthopedics'],
  'Orthopedist': ['Orthopedics'],
  'Back Pain': ['Orthopedics'],
  'Knee Pain': ['Orthopedics'],
  'Joint Pain': ['Orthopedics'],
  'Fracture': ['Orthopedics'],
  'Sciatica': ['Orthopedics', 'Neurology'],

  // Urinary & Kidney
  'Urinary': ['Urology', 'Nephrology'],
  'Urinary Issues': ['Urology', 'Nephrology'],
  'Urology': ['Urology', 'Nephrology'],
  'Urologist': ['Urology'],
  'Kidney': ['Nephrology', 'Urology'],
  'Kidney Issues': ['Nephrology', 'Urology'],
  'Kidney Stones': ['Urology'],
  'Kidney Stone': ['Urology'],
  'UTI': ['Urology', 'General Physician'],
  'Nephrology': ['Nephrology'],

  // Lungs & Breathing
  'Lungs': ['Pulmonology'],
  'Lungs & Breathing': ['Pulmonology'],
  'Pulmonology': ['Pulmonology'],
  'Pulmonologist': ['Pulmonology'],
  'Asthma': ['Pulmonology'],
  'Breathlessness': ['Pulmonology', 'Cardiology'],

  // Heart
  'Heart': ['Cardiology', 'Cardiac Surgery'],
  'Heart Specialist': ['Cardiology', 'Cardiac Surgery'],
  'Cardiology': ['Cardiology', 'Cardiac Surgery'],
  'Cardiologist': ['Cardiology'],
  'Chest Pain': ['Cardiology', 'Pulmonology'],
  'High BP': ['Cardiology', 'General Physician'],
  'Hypertension': ['Cardiology'],

  // Stomach & Digestive
  'Stomach': ['Gastroenterology'],
  'Stomach & Digestion': ['Gastroenterology'],
  'Digestive Issues': ['Gastroenterology'],
  'Gastroenterology': ['Gastroenterology'],
  'Gastroenterologist': ['Gastroenterology'],
  'Stomach Pain': ['Gastroenterology'],
  'Acidity': ['Gastroenterology'],
  'Gas': ['Gastroenterology'],
  'Constipation': ['Gastroenterology'],
  'Diarrhea': ['Gastroenterology'],

  // Diabetes & Hormones
  'Diabetes': ['Endocrinology', 'Diabetology'],
  'Diabetes Management': ['Endocrinology', 'Diabetology'],
  'Diabetology': ['Diabetology', 'Endocrinology'],
  'Diabetologist': ['Diabetology'],
  'Endocrinology': ['Endocrinology'],
  'Thyroid': ['Endocrinology'],

  // Cancer
  'Cancer': ['Oncology'],
  'Cancer Specialist': ['Oncology'],
  'Oncology': ['Oncology'],
  'Oncologist': ['Oncology'],

  // Sexual Health
  'Sexual Health': ['Sexology', 'Sexologist', 'Sexual Health', 'Andrology', 'Urology'],
  'Sexology': ['Sexology', 'Sexologist', 'Sexual Health', 'Andrology', 'Urology'],
  'Sexologist': ['Sexology', 'Sexologist', 'Sexual Health', 'Andrology', 'Urology'],

  // Surgery & Others
  'General Surgery': ['General Surgery'],
  'Piles': ['General Surgery'],
  'Hemorrhoids': ['General Surgery'],
  'Fissure': ['General Surgery'],
  'Fistula': ['General Surgery'],
  'Hernia': ['General Surgery'],
  'Plastic Surgery': ['Plastic Surgery'],
  'Vascular Surgery': ['Vascular Surgery'],
  'Physiotherapy': ['Physiotherapy'],
  'Diet & Nutrition': ['Nutrition & Dietetics'],
  'Nutrition & Dietetics': ['Nutrition & Dietetics'],
  'Ayurveda': ['Ayurveda'],
  'Homeopathy': ['Homeopathy'],
  'Pain Management': ['Pain Management'],
  'Sports Medicine': ['Sports Medicine'],
  'Allergy & Immunology': ['Allergy & Immunology'],
  'Rheumatology': ['Rheumatology'],
  'Veterinary': ['Veterinary'],
};

module.exports = { SPECIALIZATIONS, CATEGORY_TO_SPECIALIZATIONS };
