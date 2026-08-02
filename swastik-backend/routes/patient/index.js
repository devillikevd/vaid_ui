const express = require('express');
const { body, query, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadProfileImage } = require('../../middleware/upload');
const patientService = require('../../services/patientService');
const appointmentService = require('../../services/appointmentService');
const doctorService = require('../../services/doctorService');
const reportService = require('../../services/reportService');
const dispatchService = require('../../services/dispatchService');
const emergencyContactNotificationService = require('../../services/emergencyContactNotificationService');
const { asyncHandler } = require('../../middleware/errorHandler');
const { supabaseAdmin } = require('../../config/supabase');
const { signStorageUrlsInPayload } = require('../../config/minio');
const eventEmitter = require('../../services/eventEmitter');

// SOS rate limiter — 3 minute cooldown per user
const sosCooldowns = new Map();
const SOS_COOLDOWN_MS = 3 * 60 * 1000;
function checkSosRateLimit(userId) {
  const last = sosCooldowns.get(userId);
  if (last && Date.now() - last < SOS_COOLDOWN_MS) {
    const remaining = Math.ceil((SOS_COOLDOWN_MS - (Date.now() - last)) / 1000);
    return { allowed: false, remainingSeconds: remaining };
  }
  sosCooldowns.set(userId, Date.now());
  return { allowed: true };
}

const router = express.Router();

const normalizeOrderStatus = (status) => (status === 'out_for_delivery' ? 'dispatched' : status);
const normalizePatientOrder = (order) => (order ? { ...order, status: normalizeOrderStatus(order.status) } : order);
const normalizeDiagnosticBookingStatus = (status) => (status === 'booked' ? 'pending' : status);
const normalizePatientDiagnosticBooking = (booking) => (
  booking ? { ...booking, status: normalizeDiagnosticBookingStatus(booking.status) } : booking
);
const normalizeEmergencyStatus = (request) => {
  if (!request) return request;

  const isLegacyBroadcasting =
    request.status === 'pending' &&
    request.dispatch_mode === 'sos_broadcast' &&
    Array.isArray(request.broadcast_ambulance_ids) &&
    request.broadcast_ambulance_ids.length > 0 &&
    Number(request.broadcast_round || 0) > 0;

  return isLegacyBroadcasting
    ? { ...request, status: 'broadcasting' }
    : request;
};
const MAX_HEALTH_CONNECT_DAILY_STEPS = 70000;
const MIN_HEALTH_CONNECT_HEART_RATE = 25;
const MAX_HEALTH_CONNECT_HEART_RATE = 230;
const MIN_HEALTH_CONNECT_TEMP_C = 30;
const MAX_HEALTH_CONNECT_TEMP_C = 45;
const getOrderStatusFilters = (status) => {
  const normalizedStatus = normalizeOrderStatus(status);
  if (normalizedStatus === 'dispatched') {
    return ['dispatched', 'out_for_delivery'];
  }
  return [normalizedStatus];
};
const getDiagnosticBookingStatusFilters = (status) => {
  const normalizedStatus = normalizeDiagnosticBookingStatus(status);
  if (normalizedStatus === 'pending') {
    return ['pending', 'booked'];
  }
  return [normalizedStatus];
};

// Mount reviews router
const reviewsRoutes = require('./reviews');
router.use('/reviews', reviewsRoutes);

// All routes require authentication and patient role
router.use(authenticate);
router.use(authorize('patient'));

// Get patient profile
router.get('/profile',
  asyncHandler(async (req, res) => {
    const profile = await patientService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  })
);

// Get dynamic search suggestions
router.get('/search-suggestions',
  asyncHandler(async (req, res) => {
    // req.user.id is the users table ID. We need the patient's actual ID to pass into getSearchSuggestions.
    // wait, getSearchSuggestions takes patientId and userId.
    // patientService._getPatientByUserId(req.user.id) fetches patientId.
    const patient = await patientService._getPatientByUserId(req.user.id);
    const suggestions = await patientService.getSearchSuggestions(patient.id, req.user.id);
    res.json({ success: true, data: suggestions });
  })
);

// Update patient profile
router.put('/profile',
  [
    body('name').optional().notEmpty(),
    body('age').optional().isInt({ min: 0, max: 150 }),
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('weight').optional().isFloat({ min: 0 }),
    body('height').optional().isFloat({ min: 0 }),
    body('location').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const profile = await patientService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  })
);

// Upload profile image
router.post('/profile/image',
  uploadProfileImage.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }
    const result = await patientService.uploadProfileImage(req.user.id, req.file);
    res.json({ success: true, data: result });
  })
);

// Delete profile image
router.delete('/profile/image',
  asyncHandler(async (req, res) => {
    const result = await patientService.deleteProfileImage(req.user.id);
    res.json({ success: true, ...result });
  })
);

// ABDM Mock routes for ABHA linking (VULN-BS-06)
router.post('/abha/generate-otp',
  [body('abhaNumber').notEmpty().withMessage('ABHA Number is required')],
  validate,
  asyncHandler(async (req, res) => {
    // Mock OTP generation
    res.json({ success: true, message: 'OTP sent to registered mobile number' });
  })
);

router.post('/abha/verify-otp',
  [
    body('abhaNumber').notEmpty().withMessage('ABHA Number is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { abhaNumber, otp } = req.body;
    // Mock OTP verification - accept 123456
    if (otp !== '123456') {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    const profile = await patientService.updateProfile(req.user.id, { abhaNumber });
    res.json({ success: true, message: 'ABHA number linked successfully', data: profile });
  })
);


// Get dashboard
router.get('/dashboard',
  asyncHandler(async (req, res) => {
    const dashboard = await patientService.getDashboard(req.user.id);
    res.json({ success: true, data: dashboard });
  })
);

// Get health alerts for patient's area (outbreak warnings)
router.get('/health-alerts',
  asyncHandler(async (req, res) => {
    const { getPatientHealthAlerts } = require('../../services/outbreakService');
    const alerts = await getPatientHealthAlerts(req.user.id, req.query.city, req.query.latitude, req.query.longitude);
    res.json({ success: true, data: alerts });
  })
);

// ============ VITALS ============

// Get own vitals history
router.get('/vitals',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await supabaseAdmin
      .from('patient_vitals')
      .select('*', { count: 'exact' })
      .eq('patient_id', patient.id)
      .order('recorded_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    // Normalize: DB uses 'oxygen_level' but API/frontend expect 'oxygen_saturation'
    const normalized = (data || []).map(v => ({
      ...v,
      oxygen_saturation: v.oxygen_level ?? v.oxygen_saturation ?? null,
    }));

    res.json({
      success: true,
      data: normalized,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

// Record new vitals
router.post('/vitals',
  [
    body('type').isIn(['blood_pressure', 'heart_rate', 'temperature', 'blood_sugar', 'oxygen_saturation', 'weight', 'height']).withMessage('Invalid vital type'),
    body('value').notEmpty().withMessage('Value is required').custom((value, { req }) => {
        if (req.body.type === 'blood_pressure') {
            if (typeof value === 'string' && value.includes('/')) {
                const [sys, dia] = value.split('/').map(Number);
                if (isNaN(sys) || isNaN(dia) || sys < 0 || sys > 300 || dia < 0 || dia > 200) throw new Error('Invalid blood pressure values');
            } else {
                const val = parseFloat(value);
                if (isNaN(val) || val < 0 || val > 300) throw new Error('Invalid blood pressure systolic value');
                if (req.body.diastolic) {
                    const dia = parseFloat(req.body.diastolic);
                    if (isNaN(dia) || dia < 0 || dia > 200) throw new Error('Invalid blood pressure diastolic value');
                }
            }
        } else {
            const val = parseFloat(value);
            if (isNaN(val)) throw new Error('Value must be a number');
            if (req.body.type === 'heart_rate' && (val < 0 || val > 300)) throw new Error('Invalid heart rate value');
            if (req.body.type === 'temperature' && (val < 30 || val > 45)) throw new Error('Invalid temperature value');
            if (req.body.type === 'blood_sugar' && (val < 0 || val > 1000)) throw new Error('Invalid blood sugar value');
            if (req.body.type === 'oxygen_saturation' && (val < 0 || val > 100)) throw new Error('Invalid oxygen saturation value');
            if (req.body.type === 'weight' && (val < 0 || val > 500)) throw new Error('Invalid weight value');
            if (req.body.type === 'height' && (val < 0 || val > 300)) throw new Error('Invalid height value');
        }
        return true;
    }),
    body('unit').optional().isString().trim().escape(),
    body('notes').optional().isString().trim().escape(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    // Map type+value to the correct column in patient_vitals table
    const vitalInsert = {
      patient_id: patient.id,
      recorded_by: req.user.id,
      notes: req.body.notes || null,
      recorded_at: new Date().toISOString(),
    };
    const val = parseFloat(req.body.value);
    switch (req.body.type) {
      case 'heart_rate': vitalInsert.heart_rate = Math.round(val); break;
      case 'blood_pressure': {
        // Expect value as "120/80" or separate systolic/diastolic
        if (typeof req.body.value === 'string' && req.body.value.includes('/')) {
          const [sys, dia] = req.body.value.split('/').map(Number);
          vitalInsert.blood_pressure_systolic = Math.round(sys);
          vitalInsert.blood_pressure_diastolic = Math.round(dia);
        } else {
          vitalInsert.blood_pressure_systolic = Math.round(val);
          vitalInsert.blood_pressure_diastolic = req.body.diastolic ? Math.round(parseFloat(req.body.diastolic)) : null;
        }
        break;
      }
      case 'temperature': vitalInsert.temperature = val; break;
      case 'blood_sugar': vitalInsert.blood_sugar = val; break;
      case 'oxygen_saturation': vitalInsert.oxygen_level = val; break;
      case 'weight': vitalInsert.weight = val; break;
      case 'height': vitalInsert.height = val; break;
    }

    const jwt = require('jsonwebtoken');
    vitalInsert.crypto_signature = jwt.sign(
      { type: req.body.type, value: req.body.value, patient_id: patient.id, recorded_at: vitalInsert.recorded_at },
      process.env.JWT_SECRET || 'default-secret'
    );

    const { data, error } = await supabaseAdmin
      .from('patient_vitals')
      .insert(vitalInsert)
      .select('*')
      .single();

    if (error) throw error;

    // Emit real-time event so doctor dashboard gets notified
    eventEmitter.emit('vitals:recorded', {
      patientId: patient.id,
      userId: req.user.id,
      vital: data,
    });
    // Notify only the patient's own doctors via Socket.IO (scoped, not global broadcast)
    if (eventEmitter.io) {
      // Emit to the patient's own room so only their connected doctors receive it
      eventEmitter.io.to(`patient:${req.user.id}`).emit('vitals:new', {
        patientId: patient.id,
        vital: data,
      });
    }

    res.status(201).json({ success: true, data });
  })
);

// Sync vitals from Google Health Connect
router.post('/vitals/sync',
  [
    body('vitals').isArray().withMessage('vitals array is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id, city, state')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

    const vitals = req.body.vitals;
    let feverTriggered = false;

    const insertPayload = [];
    const updatePayload = [];

    vitals.forEach(v => {
      const val = parseFloat(v.value);
      if (!Number.isFinite(val)) return;
      const row = {
        patient_id: patient.id,
        recorded_by: req.user.id,
        recorded_at: v.recorded_at || new Date().toISOString(),
        notes: 'Source: Google Health Connect sync. Reliability depends on the connected device and Health Connect data availability.',
      };
      
      switch (v.type) {
        case 'heart_rate':
          if (val < MIN_HEALTH_CONNECT_HEART_RATE || val > MAX_HEALTH_CONNECT_HEART_RATE) return;
          row.heart_rate = Math.round(val);
          break;
        case 'temperature': 
          if (val < MIN_HEALTH_CONNECT_TEMP_C || val > MAX_HEALTH_CONNECT_TEMP_C) return;
          row.temperature = val; 
          if (val > 100.4 || val > 38.0) feverTriggered = true;
          break;
        case 'steps':
          if (val < 0 || val > MAX_HEALTH_CONNECT_DAILY_STEPS) return;
          row.steps = Math.round(val);
          break;
      }
      if (row.heart_rate !== undefined || row.temperature !== undefined || row.steps !== undefined) {
         insertPayload.push(row);
      }
    });

    if (insertPayload.length > 0) {
      // Fetch recent vitals to prevent duplicates or to update steps
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: existingVitals } = await supabaseAdmin
        .from('patient_vitals')
        .select('id, recorded_at, heart_rate, temperature, steps')
        .eq('patient_id', patient.id)
        .gte('recorded_at', sevenDaysAgo.toISOString());
        
      const existingList = existingVitals || [];

      const safeInsert = [];

      insertPayload.forEach(p => {
        const pTime = new Date(p.recorded_at).getTime();
        // Look for existing record within 5 seconds for HR/Temp, or EXACT match for steps
        const existing = existingList.find(e => {
            if (p.steps !== undefined) {
                return new Date(e.recorded_at).getTime() === pTime;
            }
            return Math.abs(new Date(e.recorded_at).getTime() - pTime) < 5000;
        });

        if (!existing) {
            safeInsert.push(p);
        } else {
            // Update steps if the new value is higher
            if (p.steps !== undefined && existing.steps !== p.steps) {
                updatePayload.push({ id: existing.id, steps: Math.max(existing.steps || 0, p.steps) });
            }
            // Ignore HR/Temp if they are close enough in time (deduplication)
        }
      });

      if (safeInsert.length > 0) {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'default-secret';
        safeInsert.forEach(p => {
          const type = p.heart_rate !== undefined ? 'heart_rate' : (p.temperature !== undefined ? 'temperature' : 'steps');
          const value = p.heart_rate ?? p.temperature ?? p.steps;
          p.crypto_signature = jwt.sign(
            { type, value, patient_id: patient.id, recorded_at: p.recorded_at },
            secret
          );
        });
        await supabaseAdmin.from('patient_vitals').insert(safeInsert);
      }

      // Process updates (e.g., updating today's steps)
      for (const update of updatePayload) {
          await supabaseAdmin.from('patient_vitals').update({ steps: update.steps }).eq('id', update.id);
      }
    }

    // Smart Outbreak Integration: Automatically flag fever clusters
    if (feverTriggered) {
      const { recordHealthEvent } = require('../../services/outbreakService');
      recordHealthEvent({
        source: 'health_connect',
        patientId: patient.id,
        symptoms: ['fever_cluster'],
        city: patient.city,
        state: patient.state
      });
    }

    res.status(201).json({ success: true, message: 'Health Connect data synced securely' });
  })
);

// ============ REMINDERS ============
router.get('/reminders',
  asyncHandler(async (req, res) => {
    const { type, isActive } = req.query;
    const reminders = await patientService.getReminders(req.user.id, { type, isActive });
    res.json({ success: true, data: reminders });
  })
);

// Reminder adherence analytics
router.get('/reminders/adherence',
  [
    query('days').optional().isInt({ min: 1, max: 90 }).withMessage('days must be between 1 and 90'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days, 10) : 7;
    const data = await patientService.getReminderAdherence(req.user.id, days);
    res.json({ success: true, data });
  })
);

// Create reminder
router.post('/reminders',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('type').isIn(['medicine', 'appointment', 'test']).withMessage('Invalid reminder type'),
    body('time').notEmpty().withMessage('Time is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const reminder = await patientService.createReminder(req.user.id, req.body);
    res.status(201).json({ success: true, data: reminder });
  })
);

// Reminder action (taken / skip / snooze)
router.post('/reminders/:id/action',
  [
    param('id').isUUID().withMessage('Invalid reminder ID'),
    body('action').isIn(['taken', 'skip', 'snooze']).withMessage('action must be taken, skip, or snooze'),
    body('snoozeMinutes').optional().isInt({ min: 1, max: 180 }).withMessage('snoozeMinutes must be between 1 and 180'),
    body('scheduledAt').optional().isISO8601().withMessage('scheduledAt must be a valid ISO timestamp'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await patientService.actOnReminder(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: result, message: 'Reminder action saved' });
  })
);

// Update reminder
router.put('/reminders/:id',
  asyncHandler(async (req, res) => {
    const reminder = await patientService.updateReminder(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: reminder });
  })
);

// Delete reminder
router.delete('/reminders/:id',
  asyncHandler(async (req, res) => {
    const result = await patientService.deleteReminder(req.user.id, req.params.id);
    res.json({ success: true, ...result });
  })
);

// ============ EMERGENCY CONTACTS ============

// Add emergency contact
router.post('/emergency-contacts',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').isMobilePhone().withMessage('Valid phone is required'),
    body('relation').notEmpty().withMessage('Relation is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const contact = await patientService.addEmergencyContact(req.user.id, req.body);
    res.status(201).json({ success: true, data: contact });
  })
);

// Delete emergency contact
router.delete('/emergency-contacts/:id',
  asyncHandler(async (req, res) => {
    const result = await patientService.deleteEmergencyContact(req.user.id, req.params.id);
    res.json({ success: true, ...result });
  })
);

// Notify emergency contacts without creating an ambulance/SOS request.
// Used by Guardian fall detection: contacts get FCM/notification only.
router.post('/emergency-contact-alert',
  [
    body('alertType').optional().isIn(['fall_detected', 'fall', 'car_crash', 'crash', 'accident', 'sos', 'emergency']),
    body('latitude').optional({ nullable: true }).isFloat(),
    body('longitude').optional({ nullable: true }).isFloat(),
    body('notes').optional({ nullable: true }).isString(),
    body('sourceId').optional({ nullable: true }).isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await emergencyContactNotificationService.notifyEmergencyContacts(req.user.id, req.body);
    res.status(202).json({ success: true, data: result });
  })
);

// ============ FAMILY MEMBERS ============

// Add family member
router.post('/family-members',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('relation').trim().notEmpty().withMessage('Relation is required'),
    body('phone').optional({ nullable: true, checkFalsy: true }).trim()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const member = await patientService.addFamilyMember(req.user.id, req.body);
    res.status(201).json({ success: true, data: member });
  })
);

// Delete family member
router.delete('/family-members/:id',
  asyncHandler(async (req, res) => {
    const result = await patientService.deleteFamilyMember(req.user.id, req.params.id);
    res.json({ success: true, data: result });
  })
);

// ============ SAVED ADDRESSES ============

// Add saved address
router.post('/addresses',
  [
    body('label').trim().notEmpty().withMessage('Label is required'),
    body('address').trim().notEmpty().withMessage('Address is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const address = await patientService.addSavedAddress(req.user.id, req.body);
    res.status(201).json({ success: true, data: address });
  })
);

// Delete saved address
router.delete('/addresses/:id',
  asyncHandler(async (req, res) => {
    const result = await patientService.deleteSavedAddress(req.user.id, req.params.id);
    res.json({ success: true, data: result });
  })
);

// ============ APPOINTMENTS (proxy for Android app) ============
// Android calls patients/appointments/* — these proxy to appointmentService

// Get patient appointments
router.get('/appointments',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const result = await appointmentService.getAppointments(
      req.user.id,
      'patient',
      { status },
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  })
);

// Book appointment
router.post('/appointments',
  [
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
    body('date').isDate().withMessage('Valid date is required'),
    body('timeSlot').notEmpty().withMessage('Time slot is required'),
    body('type').isIn(['video', 'clinic', 'home_visit', 'in_person']).withMessage('Invalid appointment type'),
    body('hospitalId').optional().isUUID().withMessage('Hospital ID must be valid'),
    body('clinicId').optional().isUUID().withMessage('Clinic ID must be valid'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    if (req.body.type === 'in_person') req.body.type = 'clinic';
    const appointment = await appointmentService.bookAppointment(req.user.id, req.body);
    res.status(201).json({ success: true, data: appointment });
  })
);

router.get('/appointments/:appointmentId/record-access',
  [
    param('appointmentId').isUUID().withMessage('Valid appointment ID is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const access = await patientService.getMedicalRecordAccessForAppointment(req.user.id, req.params.appointmentId);
    res.json({ success: true, data: access });
  })
);

router.post('/appointments/:appointmentId/record-access',
  [
    param('appointmentId').isUUID().withMessage('Valid appointment ID is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { guardian_analytics } = req.body;
    let parsedAnalytics = null;
    if (guardian_analytics) {
      try {
        parsedAnalytics = typeof guardian_analytics === 'string' ? JSON.parse(guardian_analytics) : guardian_analytics;
      } catch (err) {
        console.warn('Invalid guardian_analytics JSON provided');
      }
    }
    const access = await patientService.grantMedicalRecordAccessForAppointment(req.user.id, req.params.appointmentId, parsedAnalytics);
    res.json({
      success: true,
      data: access,
      message: 'Medical records shared with your doctor for this consultation',
    });
  })
);

router.delete('/appointments/:appointmentId/record-access',
  [
    param('appointmentId').isUUID().withMessage('Valid appointment ID is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const access = await patientService.revokeMedicalRecordAccessForAppointment(req.user.id, req.params.appointmentId);
    res.json({
      success: true,
      data: access,
      message: 'Medical record access revoked',
    });
  })
);

// Cancel appointment
router.put('/appointments/:id/cancel',
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.cancelAppointment(
      req.user.id,
      req.params.id,
      req.body.reason
    );
    res.json({ success: true, data: appointment });
  })
);

// ============ DOCTORS (proxy for Android app) ============
// Android calls patients/doctors/* — these proxy to doctorService

// Get recommended doctors (smart recommendation engine)
// Must be BEFORE /doctors/:id to avoid route collision
router.get('/doctors/recommended',
  asyncHandler(async (req, res) => {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 8;

    // Get patient ID for the recommendation engine
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const recommended = await patientService.getRecommendedDoctors(
      patient.id,
      req.user.id,
      limit
    );
    const signedRecommended = await signStorageUrlsInPayload(recommended);
    res.json({ success: true, data: signedRecommended });
  })
);

// Search doctors
router.get('/doctors',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, specialization, search, hospitalId, clinicId, city, latitude, longitude, global, sortBy, consultationType } = req.query;
    const result = await doctorService.getAllDoctors(
      { specialization, search, hospitalId, clinicId, city, latitude, longitude, global: global === 'true', sortBy, consultationType },
      parseInt(page),
      parseInt(limit)
    );
    const signedResult = await signStorageUrlsInPayload(result);
    res.json({ success: true, ...signedResult });
  })
);

// Get doctor details
router.get('/doctors/:id',
  asyncHandler(async (req, res) => {
    const doctorDetails = await doctorService.getDoctorById(req.params.id);
    const dataPayload = {
      doctor: doctorDetails,
      schedules: doctorDetails.slots || [],
      reviews: doctorDetails.reviews || [],
      reviewDistribution: doctorDetails.reviewDistribution || {},
      queueCount: doctorDetails.queueCount || 0,
      clinics: doctorDetails.affiliatedClinics?.map(ac => ({ ...ac.clinic, consultation_fee: ac.consultation_fee, schedule: ac.schedule })) || [],
      hospitals: doctorDetails.affiliatedHospitals?.map(ah => ({ ...ah.hospital, department: ah.department, designation: ah.designation, schedule: ah.schedule })) || []
    };

    const signedData = await signStorageUrlsInPayload(dataPayload);

    res.json({
      success: true,
      data: signedData
    });
  })
);

// Get doctor slots
router.get('/doctors/:id/slots',
  [
    query('date').notEmpty().withMessage('Date is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const slots = await doctorService.getAvailableSlots(req.params.id, req.query.date);
    // Wrap as { date, slots } to match Android SlotsResponse DTO
    res.json({ success: true, data: { date: req.query.date, slots } });
  })
);

// ============ PRESCRIPTIONS ============
// Returns actual prescriptions from the prescriptions table (not reports)

// Get prescriptions for this patient
router.get('/prescriptions',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    // Resolve patient record ID from user ID
    const { data: patient } = await supabaseAdmin
      .from('patients').select('id').eq('user_id', req.user.id).single();

    if (!patient) {
      return res.json({ success: true, data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        *,
        prescription_medicines (*),
        doctors!prescriptions_doctor_id_fkey (id, name, specialization, profile_image_url),
        consultations!prescriptions_consultation_id_fkey (id, appointment_id)
      `, { count: 'exact' })
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const now = new Date();

    // Auto-expire prescriptions whose valid_until has passed
    const expiredIds = (data || [])
      .filter(rx => rx.status === 'active' && rx.valid_until && new Date(rx.valid_until) < now)
      .map(rx => rx.id);

    if (expiredIds.length > 0) {
      await supabaseAdmin.from('prescriptions').update({ status: 'expired' }).in('id', expiredIds);
    }

    // Map to shape expected by Android Prescription model
    const prescriptions = (data || []).map(rx => ({
      id: rx.id,
      prescription_number: rx.prescription_number || '',
      diagnosis: rx.diagnosis || '',
      notes: rx.notes,
      follow_up_date: rx.follow_up_date,
      created_at: rx.created_at,
      status: (expiredIds.includes(rx.id) ? 'expired' : rx.status),
      valid_from: rx.valid_from,
      valid_until: rx.valid_until,
      is_dispensed: rx.is_dispensed,
      file_url: rx.file_url,
      pdf_url: rx.pdf_url,
      dietary_advice: rx.dietary_advice,
      lifestyle_advice: rx.lifestyle_advice,
      instructions: rx.instructions,
      appointment_id: rx.consultations?.appointment_id || null,
      doctor: rx.doctors ? {
        id: rx.doctors.id,
        name: rx.doctors.name,
        specialization: rx.doctors.specialization,
        profile_image_url: rx.doctors.profile_image_url,
      } : null,
      medicines: (rx.prescription_medicines || []).map(m => ({
        medicine_name: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        quantity: m.quantity,
        before_food: m.before_food || false,
        is_critical: m.is_critical || false,
      })),
    }));

    res.json({
      success: true,
      data: await signStorageUrlsInPayload(prescriptions),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, totalPages: Math.ceil((count || 0) / parseInt(limit)) },
    });
  })
);

// Get prescription by ID
router.get('/prescriptions/:id',
  asyncHandler(async (req, res) => {

    const { data: patient } = await supabaseAdmin
      .from('patients').select('id').eq('user_id', req.user.id).single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { data: rx, error } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        *,
        prescription_medicines (*),
        doctors!prescriptions_doctor_id_fkey (id, name, specialization, profile_image_url)
      `)
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !rx) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    // Auto-expire if valid_until has passed
    let effectiveStatus = rx.status;
    if (rx.status === 'active' && rx.valid_until && new Date(rx.valid_until) < new Date()) {
      await supabaseAdmin.from('prescriptions').update({ status: 'expired' }).eq('id', rx.id);
      effectiveStatus = 'expired';
    }

    const prescriptionPayload = {
      id: rx.id,
      prescription_number: rx.prescription_number || '',
      diagnosis: rx.diagnosis || '',
      notes: rx.notes,
      follow_up_date: rx.follow_up_date,
      created_at: rx.created_at,
      status: effectiveStatus,
      valid_from: rx.valid_from,
      valid_until: rx.valid_until,
      is_dispensed: rx.is_dispensed,
      file_url: rx.file_url,
      pdf_url: rx.pdf_url,
      dietary_advice: rx.dietary_advice,
      lifestyle_advice: rx.lifestyle_advice,
      instructions: rx.instructions,
      doctor: rx.doctors ? {
        id: rx.doctors.id,
        name: rx.doctors.name,
        specialization: rx.doctors.specialization,
        profile_image_url: rx.doctors.profile_image_url,
      } : null,
      medicines: (rx.prescription_medicines || []).map(m => ({
        medicine_name: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        quantity: m.quantity,
        before_food: m.before_food || false,
        is_critical: m.is_critical || false,
      })),
    };

    res.json({
      success: true,
      data: await signStorageUrlsInPayload(prescriptionPayload),
    });
  })
);

// Forward prescription to a pharmacy — creates an order linked to the prescription
router.post('/prescriptions/:id/forward-to-pharmacy',
  [
    body('pharmacyId').notEmpty().withMessage('Pharmacy ID is required'),
    body('deliveryAddress').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {

    const { data: patient } = await supabaseAdmin
      .from('patients').select('id').eq('user_id', req.user.id).single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    // Verify prescription belongs to this patient and is active
    const { data: rx, error: rxErr } = await supabaseAdmin
      .from('prescriptions')
      .select('id, status, valid_until, medicines, prescription_medicines(*)')
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .single();

    if (rxErr || !rx) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (rx.status === 'expired' || rx.status === 'cancelled') {
      return res.status(400).json({ success: false, message: `Cannot forward a ${rx.status} prescription` });
    }

    // Check if prescription has expired by date
    if (rx.valid_until && new Date(rx.valid_until) < new Date()) {
      // Mark as expired
      await supabaseAdmin.from('prescriptions').update({ status: 'expired' }).eq('id', rx.id);
      return res.status(400).json({ success: false, message: 'This prescription has expired' });
    }

    // Verify pharmacy exists
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name')
      .eq('id', req.body.pharmacyId)
      .eq('is_active', true)
      .eq('is_approved', true)
      .maybeSingle();

    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }

    // Build order items from prescription medicines
    const rxMeds = rx.prescription_medicines || [];
    const items = rxMeds.map(m => ({
      medicineId: m.medicine_id || null,
      name: m.medicine_name,
      genericName: m.generic_name || null,
      quantity: m.quantity || 1,
      price: 0, // pharmacy will set actual price
      fromPrescription: true,
    }));

    const pharmacyService = require('../../services/pharmacyService');
    const order = await pharmacyService.createOrder(req.user.id, {
      pharmacyId: pharmacy.id,
      items,
      prescriptionId: rx.id,
      deliveryAddress: req.body.deliveryAddress || null,
    });

    res.status(201).json({ success: true, data: order, message: `Prescription forwarded to ${pharmacy.name}` });
  })
);

// ============ REPORTS (proxy for Android app) ============
// Android calls patients/reports — these proxy to reportService

router.get('/reports',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await reportService.getReports(
      req.user.id,
      {},
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  })
);

// ============ EMERGENCY (proxy for Android app) ============
// Android calls patients/emergency — uses new SOS Broadcast Dispatch system

// Request emergency (SOS broadcast to nearby ambulances)
router.post('/emergency',
  [
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
    body('emergencyType').optional().isIn(['medical', 'general', 'cardiac', 'accident', 'trauma', 'pregnancy', 'other']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const rateCheck = checkSosRateLimit(req.user.id);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `SOS cooldown active. Please wait ${rateCheck.remainingSeconds}s before sending another SOS.`
      });
    }
    const result = await dispatchService.requestSOS(req.user.id, req.body);
    res.status(result.alreadyActive ? 200 : 201).json({ success: true, data: result });
  })
);

// Request direct SOS to a specific hospital
router.post('/emergency/hospital',
  [
    body('hospitalId').isUUID().withMessage('Valid hospital ID is required'),
    body('latitude').isFloat().withMessage('Valid latitude is required'),
    body('longitude').isFloat().withMessage('Valid longitude is required'),
    body('emergencyType').optional().isIn(['medical', 'general', 'cardiac', 'accident', 'trauma', 'pregnancy', 'other']),
    body('notes').optional().isString()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const rateCheck = checkSosRateLimit(req.user.id);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `SOS cooldown active. Please wait ${rateCheck.remainingSeconds}s before sending another SOS.`
      });
    }
    const result = await dispatchService.requestDirectHospitalSOS(req.user.id, req.body);
    res.status(result.alreadyActive ? 200 : 201).json({ success: true, data: result });
  })
);

// Get active emergency
router.get('/emergency/active',
  asyncHandler(async (req, res) => {
    // Resolve patient record ID from user ID
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!patient) {
      res.json({ success: true, data: null });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('emergency_requests')
      .select(`
        *,
        vehicle:ambulances(
          vehicle_number,
          driver_name,
          driver_phone,
          vehicle_type,
          current_latitude,
          current_longitude
        )
      `)
      .eq('patient_id', patient.id)
      .in('status', [
        'pending',
        'broadcasting',
        'assigned',
        'dispatched',
        'accepted',
        'en_route',
        'en_route_pickup',
        'arrived',
        'arrived_pickup',
        'picked_up',
        'patient_onboard',
        'en_route_hospital',
        'arrived_hospital',
      ])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    res.json({ success: true, data: normalizeEmergencyStatus(data || null) });
  })
);

// Cancel emergency
router.put('/emergency/:id/cancel',
  [
    param('id').isUUID().withMessage('Valid emergency request ID is required'),
    body('reason').trim().isLength({ min: 12, max: 500 }).withMessage('Cancellation reason must be 12-500 characters'),
    body('legalNoticeAccepted').custom(value => value === true).withMessage('Cancellation policy acknowledgement is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await dispatchService.cancelByPatient(
      req.user.id,
      req.params.id,
      req.body
    );
    res.json({ success: true, ...result });
  })
);

// ============ REVIEWS (proxy for Android app) ============



// ============ MEDICINE ORDERS (patient-side) ============

// Get my orders
router.get('/orders',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabaseAdmin
      .from('pharmacy_orders')
      .select('*, pharmacy:pharmacies(id, name, phone, address, latitude, longitude), delivery_agents(*)', { count: 'exact' })
      .eq('patient_id', patient.id);

    if (status) {
      const statusFilters = getOrderStatusFilters(status);
      query = statusFilters.length > 1
        ? query.in('status', statusFilters)
        : query.eq('status', statusFilters[0]);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: (data || []).map(normalizePatientOrder),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / parseInt(limit))),
      },
    });
  })
);

// Get single order
router.get('/orders/:id',
  asyncHandler(async (req, res) => {

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*, pharmacy:pharmacies(id, name, phone, address, city, latitude, longitude), delivery_agents(*)')
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: normalizePatientOrder(data) });
  })
);

// Cancel order
router.patch('/orders/:id/cancel',
  asyncHandler(async (req, res) => {

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    // Only cancel if pending
    const { data: order } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*')
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .single();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order in current status' });
    }

    const { data, error } = await supabaseAdmin
      .from('pharmacy_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    // Notify pharmacy
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('owner_id')
      .eq('id', order.pharmacy_id)
      .single();

    if (pharmacy) {
      eventEmitter.emitOrderStatusUpdated({
        ...data,
        patient_id: req.user.id,
        pharmacy_owner_id: pharmacy.owner_id,
      });
    }

    res.json({ success: true, data: normalizePatientOrder(data) });
  })
);

// ============ DIAGNOSTIC BOOKINGS (patient-side) ============

// Get my diagnostic bookings
router.get('/diagnostic-bookings',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabaseAdmin
      .from('diagnostic_bookings')
      .select(`
        *,
        test:diagnostic_tests(id, name, category, price),
        center:diagnostic_centers(id, name, phone, address, city, latitude, longitude),
        delivery_agents(*)
      `, { count: 'exact' })
      .eq('patient_id', patient.id);

    if (status) {
      const statusFilters = getDiagnosticBookingStatusFilters(status);
      query = statusFilters.length > 1
        ? query.in('status', statusFilters)
        : query.eq('status', statusFilters[0]);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: (data || []).map(normalizePatientDiagnosticBooking),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

// Get single diagnostic booking
router.get('/diagnostic-bookings/:id',
  asyncHandler(async (req, res) => {

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('diagnostic_bookings')
      .select(`
        *,
        test:diagnostic_tests(id, name, category, price, description),
        center:diagnostic_centers(id, name, phone, address, city, email, latitude, longitude)
      `)
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: normalizePatientDiagnosticBooking(data) });
  })
);

// Cancel diagnostic booking
router.patch('/diagnostic-bookings/:id/cancel',
  asyncHandler(async (req, res) => {

    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const { data: booking } = await supabaseAdmin
      .from('diagnostic_bookings')
      .select('*, test:diagnostic_tests(id, name, category, price), center:diagnostic_centers(id, name, phone, address, city, latitude, longitude), delivery_agents(*)')
      .eq('id', req.params.id)
      .eq('patient_id', patient.id)
      .single();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const normalizedStatus = normalizeDiagnosticBookingStatus(booking.status);
    if (!['pending', 'confirmed'].includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel booking in current status' });
    }

    const { data, error } = await supabaseAdmin
      .from('diagnostic_bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    eventEmitter.emitDiagnosticBookingStatusUpdated({
      ...data,
      patient_id: req.user.id,
    });

    res.json({ success: true, data: normalizePatientDiagnosticBooking(data) });
  })
);

module.exports = router;
