const express = require('express');
const { query, body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { optionalAuth, authenticate } = require('../../middleware/auth');
const hospitalService = require('../../services/hospitalService');
const clinicService = require('../../services/clinicService');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Get facility types
router.get('/types',
  asyncHandler(async (req, res) => {
    const types = await hospitalService.getFacilityTypes();
    res.json({ success: true, data: types });
  })
);

// Get all hospitals (with filters)
router.get('/',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type, city, isEmergencyAvailable, specialization, search } = req.query;
    const result = await hospitalService.getHospitals(
      { type, city, isEmergencyAvailable: isEmergencyAvailable === 'true', specialization, search },
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  })
);

// Get nearby hospitals
router.get('/nearby',
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
    query('radius').optional().isFloat({ min: 1, max: 100 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 10, type, isEmergencyAvailable, is24Hours } = req.query;
    const hospitals = await hospitalService.getNearbyHospitals(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
      { type, isEmergencyAvailable: isEmergencyAvailable === 'true', is24Hours: is24Hours === 'true' }
    );
    res.json({ success: true, data: hospitals });
  })
);

// Get emergency hospitals
router.get('/emergency',
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query;
    const hospitals = await hospitalService.getEmergencyHospitals(
      parseFloat(latitude),
      parseFloat(longitude)
    );
    res.json({ success: true, data: hospitals });
  })
);

// Get pharmacies
router.get('/pharmacies',
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 25 } = req.query;
    const pharmacies = await hospitalService.getPharmacies(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );
    res.json({ success: true, data: pharmacies });
  })
);

// Get clinics
router.get('/clinics',
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 25 } = req.query;
    const clinics = await hospitalService.getClinics(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );
    res.json({ success: true, data: clinics });
  })
);

// Get diagnostic centers
router.get('/diagnostic-centers',
  [
    query('latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
    query('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 25 } = req.query;
    const centers = await hospitalService.getDiagnosticCenters(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );
    res.json({ success: true, data: centers });
  })
);

// Search hospitals
router.get('/search',
  [
    query('q').optional().isString(),
    query('search').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { q, search, latitude, longitude } = req.query;
    const searchTerm = q !== undefined ? q : (search !== undefined ? search : '');
    const hospitals = await hospitalService.searchHospitals(
      searchTerm,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    );
    res.json({ success: true, data: hospitals });
  })
);

// Get clinic doctors (public — for patient discovery in hospital finder)
router.get('/clinics/:clinicId/doctors',
  asyncHandler(async (req, res) => {
    const doctors = await clinicService.getClinicDoctorsPublic(req.params.clinicId);
    res.json({ success: true, data: doctors });
  })
);

// Get pharmacy inventory (public — for patient to browse medicine at a pharmacy)
router.get('/pharmacies/:pharmacyId/inventory',
  asyncHandler(async (req, res) => {
    const pharmacyService = require('../../services/pharmacyService');
    const { search, category, page = 1, limit = 50 } = req.query;
    const result = await pharmacyService.getInventory(
      req.params.pharmacyId,
      { search, category, publicOnly: true },
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  })
);

// Get hospital by ID
router.get('/:id',
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    res.json({ success: true, data: hospital });
  })
);

// Get reviews (public)
router.get('/:id/reviews',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await hospitalService.getReviews(req.params.id, page, limit);
    res.json({ success: true, ...result });
  })
);

// Add review (authenticated)
router.post('/:id/reviews',
  authenticate,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: patient } = await supabaseAdmin.from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
      
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

    const reviewService = require('../../services/reviewService');
    const reviewData = {
      reviewableType: 'hospital',
      reviewableId: req.params.id,
      rating: req.body.rating,
      comment: req.body.comment
    };

    const review = await reviewService.submitReview(patient.id, reviewData);
    res.status(201).json({ success: true, data: review });
  })
);

// Update ER Wait Time (hospital admin)
router.put('/:id/er-wait-time',
  authenticate,
  [
    body('waitMinutes').isInt({ min: 0, max: 600 }).withMessage('Wait time must be between 0 and 600 minutes'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await hospitalService.updateErWaitTime(req.params.id, req.body.waitMinutes);
    res.json({ success: true, data: result });
  })
);

// AI Symptom-to-Specialty Matcher
router.get('/symptom-match',
  [
    query('symptoms').notEmpty().withMessage('Symptoms query is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { symptoms, latitude, longitude } = req.query;

    // Symptom → Specialty mapping dictionary
    const SYMPTOM_SPECIALTY_MAP = {
      // Cardiology
      'chest pain': 'Cardiology', 'heart': 'Cardiology', 'palpitation': 'Cardiology',
      'blood pressure': 'Cardiology', 'bp': 'Cardiology', 'heartbeat': 'Cardiology',
      // Neurology
      'headache': 'Neurology', 'migraine': 'Neurology', 'seizure': 'Neurology',
      'dizziness': 'Neurology', 'numbness': 'Neurology', 'stroke': 'Neurology',
      'paralysis': 'Neurology', 'memory loss': 'Neurology',
      // Orthopedics
      'bone': 'Orthopedics', 'fracture': 'Orthopedics', 'joint pain': 'Orthopedics',
      'back pain': 'Orthopedics', 'knee': 'Orthopedics', 'spine': 'Orthopedics',
      'shoulder': 'Orthopedics', 'hip pain': 'Orthopedics',
      // Dermatology
      'skin': 'Dermatology', 'rash': 'Dermatology', 'acne': 'Dermatology',
      'eczema': 'Dermatology', 'hair loss': 'Dermatology', 'itching': 'Dermatology',
      // Gastroenterology
      'stomach': 'Gastroenterology', 'digestion': 'Gastroenterology', 'acid reflux': 'Gastroenterology',
      'vomiting': 'Gastroenterology', 'diarrhea': 'Gastroenterology', 'liver': 'Gastroenterology',
      'abdominal pain': 'Gastroenterology', 'constipation': 'Gastroenterology',
      // Pulmonology
      'breathing': 'Pulmonology', 'cough': 'Pulmonology', 'asthma': 'Pulmonology',
      'shortness of breath': 'Pulmonology', 'lung': 'Pulmonology', 'wheezing': 'Pulmonology',
      // ENT
      'ear': 'ENT', 'nose': 'ENT', 'throat': 'ENT', 'sinus': 'ENT',
      'hearing': 'ENT', 'tonsil': 'ENT', 'snoring': 'ENT',
      // Ophthalmology
      'eye': 'Ophthalmology', 'vision': 'Ophthalmology', 'blurry': 'Ophthalmology',
      // Gynecology
      'pregnancy': 'Gynecology', 'period': 'Gynecology', 'menstrual': 'Gynecology',
      'pcod': 'Gynecology', 'pcos': 'Gynecology', 'fertility': 'Gynecology',
      // Urology
      'kidney': 'Urology', 'urinary': 'Urology', 'bladder': 'Urology', 'prostate': 'Urology',
      // Pediatrics
      'child': 'Pediatrics', 'baby': 'Pediatrics', 'infant': 'Pediatrics', 'vaccination': 'Pediatrics',
      // Psychiatry
      'anxiety': 'Psychiatry', 'depression': 'Psychiatry', 'insomnia': 'Psychiatry',
      'stress': 'Psychiatry', 'mental': 'Psychiatry', 'panic': 'Psychiatry',
      // Endocrinology
      'diabetes': 'Endocrinology', 'thyroid': 'Endocrinology', 'hormone': 'Endocrinology',
      'sugar': 'Endocrinology',
      // Dentistry
      'tooth': 'Dentistry', 'dental': 'Dentistry', 'gum': 'Dentistry', 'cavity': 'Dentistry',
      // General
      'fever': 'General Physician', 'cold': 'General Physician', 'flu': 'General Physician',
      'body pain': 'General Physician', 'weakness': 'General Physician', 'fatigue': 'General Physician',
    };

    const symptomsLower = symptoms.toLowerCase();
    const matchedSpecialties = new Set();

    for (const [keyword, specialty] of Object.entries(SYMPTOM_SPECIALTY_MAP)) {
      if (symptomsLower.includes(keyword)) {
        matchedSpecialties.add(specialty);
      }
    }

    if (matchedSpecialties.size === 0) {
      matchedSpecialties.add('General Physician');
    }

    const specialtiesArray = Array.from(matchedSpecialties);

    // Find nearby hospitals with matching specializations
    let matchedHospitals = [];
    if (latitude && longitude) {
      try {
        const allNearby = await hospitalService.getNearbyHospitals(
          parseFloat(latitude), parseFloat(longitude), 15
        );
        matchedHospitals = allNearby
          .filter(h => {
            const hospSpecs = (h.specializations || []).map(s => s.toLowerCase());
            return specialtiesArray.some(s => hospSpecs.includes(s.toLowerCase()));
          })
          .slice(0, 5);
      } catch (e) { /* ignore */ }
    }

    res.json({
      success: true,
      data: {
        matchedSpecialties: specialtiesArray,
        primarySpecialty: specialtiesArray[0],
        confidence: matchedSpecialties.size > 0 ? 'high' : 'low',
        nearbyMatchedHospitals: matchedHospitals.map(h => ({
          id: h.id, name: h.name, distance: h.distanceText,
          specializations: h.specializations,
        })),
      }
    });
  })
);

module.exports = router;
