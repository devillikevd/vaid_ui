const express = require('express');
const { body, query, param } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate, authorize, optionalAuth } = require('../../middleware/auth');
const { requireApproval } = require('../../middleware/rbac');
const { uploadProfileImage } = require('../../middleware/upload');
const doctorService = require('../../services/doctorService');
const { asyncHandler } = require('../../middleware/errorHandler');

const { cacheMiddleware } = require('../../middleware/cache');

const router = express.Router();

// ============ PUBLIC ROUTES ============

// Get all doctors (with filters)
router.get('/',
  optionalAuth,
  cacheMiddleware(60 * 5), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, specialization, isAvailable, minRating, maxFee, search, city, latitude, longitude } = req.query;
    const result = await doctorService.getAllDoctors(
      { specialization, isAvailable, minRating, maxFee, search, city, latitude, longitude },
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, ...result });
  })
);

// Get specialties (standardized list)
router.get('/specialties',
  asyncHandler(async (req, res) => {
    const { SPECIALIZATIONS } = require('../../utils/specializations');
    // Return both: the master list AND what's currently active in DB
    const dbSpecialties = await doctorService.getSpecialties();
    res.json({ 
      success: true, 
      data: {
        standardized: SPECIALIZATIONS,
        active: dbSpecialties
      }
    });
  })
);

// ============ DOCTOR PROTECTED ROUTES ============
// NOTE: /me/* routes MUST be registered before /:id to prevent Express
// from matching "me" as a doctor ID parameter.

// Get doctor profile (own)
router.get('/me/profile',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const profile = await doctorService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  })
);

// Get doctor reviews (own)
router.get('/me/reviews',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const { supabaseAdmin } = require('../../config/supabase');
    
    // Get the doctor's profile ID
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const reviewService = require('../../services/reviewService');
    const result = await reviewService.getEntityReviews('doctor', doctor.id, parseInt(page), parseInt(limit));
    
    res.json({ success: true, ...result });
  })
);

// Update doctor profile
router.put('/me/profile',
  authenticate,
  authorize('doctor'),
  [
    body('name').optional().notEmpty(),
    body('specialization').optional().notEmpty(),
    body('experience').optional().isInt({ min: 0 }),
    body('qualifications').optional().isArray(),
    body('qualifications.*').optional().isString().trim(),
    body('consultationFee').optional().isInt({ min: 0 }),
    body('consultation_fee').optional().isInt({ min: 0 }),
    body('bio').optional().isString().trim(),
    body('languages').optional().isArray(),
    body('languages.*').optional().isString().trim(),
    body('registration_number').optional().isString().trim(),
    body('license_number').optional().isString().trim(),
    body('license_document_url').optional().isString().trim(),
    body('degree_certificate_url').optional().isString().trim(),
    body('profile_image_url').optional().isString().trim(),
    body('intro_video_url').optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const profile = await doctorService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  })
);

// Doctor hospital invites (accept/reject association requests)
router.get('/me/hospital-invites',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const invites = await doctorService.getHospitalInvites(req.user.id);
    res.json({ success: true, data: invites });
  })
);

router.post('/me/hospital-invites/:inviteId/respond',
  authenticate,
  authorize('doctor'),
  [
    param('inviteId').isUUID().withMessage('Invalid invite ID'),
    body('decision').isIn(['accept', 'reject']).withMessage('Decision must be accept or reject'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.respondHospitalInvite(req.user.id, req.params.inviteId, req.body.decision);
    res.json({ success: true, ...result });
  })
);

router.get('/me/clinic-invites',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const invites = await doctorService.getClinicInvites(req.user.id);
    res.json({ success: true, data: invites });
  })
);

router.post('/me/clinic-invites/:inviteId/respond',
  authenticate,
  authorize('doctor'),
  [
    param('inviteId').isUUID().withMessage('Invalid invite ID'),
    body('decision').isIn(['accept', 'reject']).withMessage('Decision must be accept or reject'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.respondClinicInvite(req.user.id, req.params.inviteId, req.body.decision);
    res.json({ success: true, ...result });
  })
);

router.use('/me', authenticate, authorize('doctor'), requireApproval);

// Get doctor dashboard
router.get('/me/dashboard',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const dashboard = await doctorService.getDashboard(req.user.id);
    res.json({ success: true, data: dashboard });
  })
);

// Update availability
router.put('/me/availability',
  authenticate,
  authorize('doctor'),
  [
    body('isAvailable').isBoolean().withMessage('isAvailable must be boolean'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.updateAvailability(req.user.id, req.body.isAvailable);
    res.json({ success: true, data: result });
  })
);

// Get schedule / slots
router.get('/me/slots',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const { data: slots, error } = await supabaseAdmin
      .from('doctor_slots')
      .select('*')
      .eq('doctor_id', doctor.id)
      .order('slot_date', { ascending: true });

    if (error) throw error;

    const { data: allAppointments, error: aptError } = await supabaseAdmin
      .from('appointments')
      .select('appointment_date, time_slot, patient_notes')
      .eq('doctor_id', doctor.id)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);

    if (aptError) throw aptError;

    const blocked = [];
    const booked = [];

    (allAppointments || []).forEach(a => {
      const time = a.time_slot.length > 5 ? a.time_slot.slice(0, 5) : a.time_slot;
      const apt = { date: a.appointment_date, time };
      if (a.patient_notes === 'BLOCKED_BY_DOCTOR') {
        blocked.push(apt);
      } else {
        booked.push(apt);
      }
    });

    res.json({ success: true, data: slots || [], blocked, booked });
  })
);

// Toggle blocked slot
router.post('/me/slots/block',
  authenticate,
  authorize('doctor'),
  [
    body('date').isDate().withMessage('Valid date is required'),
    body('timeSlot').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid time slot (HH:MM) is required'),
    body('action').isIn(['block', 'unblock']).withMessage('Action must be block or unblock'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { date, timeSlot, action } = req.body;
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    if (action === 'block') {
      const { error } = await supabaseAdmin
        .from('appointments')
        .insert({
          doctor_id: doctor.id,
          patient_id: null,
          appointment_date: date,
          time_slot: timeSlot + ':00',
          status: 'scheduled',
          type: 'clinic',
          patient_notes: 'BLOCKED_BY_DOCTOR'
        });
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('appointments')
        .delete()
        .eq('doctor_id', doctor.id)
        .eq('appointment_date', date)
        .eq('time_slot', timeSlot + ':00')
        .eq('status', 'scheduled')
        .eq('patient_notes', 'BLOCKED_BY_DOCTOR');
      if (error) throw error;
    }

    res.json({ success: true, message: `Slot successfully ${action}ed` });
  })
);

// Update slots
router.put('/me/slots',
  authenticate,
  authorize('doctor'),
  [
    body('slots').isArray().withMessage('Slots must be an array'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const slots = await doctorService.updateSlots(req.user.id, req.body.slots);
    res.json({ success: true, data: slots });
  })
);

// Get patients list
router.get('/me/patients',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search = '', filter = 'all', sort = 'recent' } = req.query;
    const result = await doctorService.getPatients(
      req.user.id,
      parseInt(page),
      parseInt(limit),
      typeof search === 'string' ? search : '',
      typeof filter === 'string' ? filter : 'all',
      typeof sort === 'string' ? sort : 'recent'
    );
    res.json({ success: true, ...result });
  })
);

// ============ VITALS ============

// Get all vitals for the doctor's patients
// NOTE: This route MUST be before /me/patients/:patientId to avoid 'vitals' matching as a patientId
router.get('/me/patients/vitals',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { page = 1, limit = 50, patientId } = req.query;

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    let vitalsQuery = supabaseAdmin
      .from('patient_vitals')
      .select(`
        *,
        patients!patient_vitals_patient_id_fkey (id, name, gender, blood_group, date_of_birth)
      `, { count: 'exact' })
      .order('recorded_at', { ascending: false });

    if (patientId) {
      // Security check: Verify doctor has access to this patient
      const [{ data: hasAppt }, { data: hasConsult }] = await Promise.all([
        supabaseAdmin.from('appointments').select('id').eq('doctor_id', doctor.id).eq('patient_id', patientId).limit(1).maybeSingle(),
        supabaseAdmin.from('consultations').select('id').eq('doctor_id', doctor.id).eq('patient_id', patientId).limit(1).maybeSingle(),
      ]);
      if (!hasAppt && !hasConsult) {
        return res.status(403).json({ success: false, message: 'You can only view vitals of your patients' });
      }
      vitalsQuery = vitalsQuery.eq('patient_id', patientId);
    } else {
      vitalsQuery = vitalsQuery.eq('recorded_by', req.user.id);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await vitalsQuery.range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const vitals = (data || []).map(v => ({
      id: v.id,
      patientId: v.patient_id,
      patientName: v.patients?.name || 'Unknown',
      patientGender: v.patients?.gender,
      heartRate: v.heart_rate,
      bloodPressure: v.blood_pressure_systolic && v.blood_pressure_diastolic
        ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
        : null,
      bloodPressureSystolic: v.blood_pressure_systolic,
      bloodPressureDiastolic: v.blood_pressure_diastolic,
      temperature: v.temperature,
      oxygenLevel: v.oxygen_level,
      respiratoryRate: v.respiratory_rate,
      weight: v.weight,
      bloodSugar: v.blood_sugar,
      notes: v.notes,
      recordedAt: v.recorded_at,
    }));

    res.json({
      success: true,
      data: vitals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  })
);

// Get patient details
// NOTE: This route MUST be after /me/patients/vitals to prevent 'vitals' matching as :patientId
router.get('/me/patients/:patientId',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const patient = await doctorService.getPatientDetails(req.user.id, req.params.patientId);
    res.json({ success: true, data: patient });
  })
);

// Record vitals for a specific patient
router.post('/me/patients/:patientId/vitals',
  authenticate,
  authorize('doctor'),
  [
    body('heartRate').optional().isInt({ min: 20, max: 300 }),
    body('bloodPressureSystolic').optional().isInt({ min: 50, max: 300 }),
    body('bloodPressureDiastolic').optional().isInt({ min: 30, max: 200 }),
    body('temperature').optional().isFloat({ min: 90, max: 115 }),
    body('oxygenLevel').optional().isFloat({ min: 0, max: 100 }),
    body('respiratoryRate').optional().isInt({ min: 5, max: 60 }),
    body('weight').optional().isFloat({ min: 0 }),
    body('bloodSugar').optional().isFloat({ min: 0 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');

    // Fix #17: Verify doctor has treated this patient (has appointment or consultation)
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const { data: hasRelation } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor.id)
      .eq('patient_id', req.params.patientId)
      .limit(1)
      .maybeSingle();

    if (!hasRelation) {
      const { data: hasConsultation } = await supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('patient_id', req.params.patientId)
        .limit(1)
        .maybeSingle();

      if (!hasConsultation) {
        return res.status(403).json({ success: false, message: 'You can only record vitals for your patients' });
      }
    }

    const { data: vitals, error } = await supabaseAdmin
      .from('patient_vitals')
      .insert({
        patient_id: req.params.patientId,
        recorded_by: req.user.id,
        consultation_id: req.body.consultationId || null,
        // Fix #15: Use ?? instead of || to preserve falsy values like 0
        heart_rate: req.body.heartRate ?? null,
        blood_pressure_systolic: req.body.bloodPressureSystolic ?? null,
        blood_pressure_diastolic: req.body.bloodPressureDiastolic ?? null,
        temperature: req.body.temperature ?? null,
        oxygen_level: req.body.oxygenLevel ?? null,
        respiratory_rate: req.body.respiratoryRate ?? null,
        weight: req.body.weight ?? null,
        blood_sugar: req.body.bloodSugar ?? null,
        notes: req.body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: vitals });
  })
);

// Get prescriptions written by this doctor
router.get('/me/prescriptions',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const { data: doctor } = await require('../../config/supabase').supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await require('../../config/supabase').supabaseAdmin
      .from('prescriptions')
      .select(`
        *,
        prescription_medicines (*),
        patients!prescriptions_patient_id_fkey (id, name),
        consultations!prescriptions_consultation_id_fkey (id, appointment_id)
      `, { count: 'exact' })
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    const prescriptions = (data || []).map(rx => ({
      id: rx.id,
      patientName: rx.patients?.name || 'Unknown',
      patientPhone: '',
      date: rx.created_at,
      diagnosis: rx.diagnosis,
      notes: rx.notes,
      followUpDate: rx.follow_up_date,
      medications: (rx.prescription_medicines || []).map(m => ({
        name: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      })),
      consultationId: rx.consultation_id,
      appointmentId: rx.consultations?.appointment_id || null,
      status: rx.status || 'active',
    }));

    res.json({
      success: true,
      data: prescriptions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, totalPages: Math.ceil((count || 0) / parseInt(limit)) },
    });
  })
);

// Get doctor lifetime journey stats
router.get('/me/journey',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    
    // Get doctor profile and joined date
    const { data: doctor, error: docError } = await supabaseAdmin
      .from('doctors')
      .select(`
        id, rating, total_reviews,
        user:users!doctors_user_id_fkey(created_at)
      `)
      .eq('user_id', req.user.id)
      .single();

    if (docError || !doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Get all completed appointments for this doctor to calculate earnings and unique patients
    const { data: consultations, error: consError } = await supabaseAdmin
      .from('appointments')
      .select('id, fee, patient_id')
      .eq('doctor_id', doctor.id)
      .eq('status', 'completed');

    if (consError) {
      return res.status(500).json({ success: false, message: 'Failed to fetch journey stats' });
    }

    // Calculate stats
    let lifetimeEarnings = 0;
    const uniquePatients = new Set();
    
    (consultations || []).forEach(cons => {
      lifetimeEarnings += (cons.fee || 0);
      if (cons.patient_id) {
        uniquePatients.add(cons.patient_id);
      }
    });

    res.json({
      success: true,
      data: {
        joinedDate: doctor.user?.created_at,
        totalPatients: uniquePatients.size,
        totalConsultations: (consultations || []).length,
        lifetimeEarnings,
        averageRating: doctor.rating || 0,
        totalReviews: doctor.total_reviews || 0
      }
    });
  })
);

// Get earnings breakdown
router.get('/me/earnings',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { data: doctor, error: docError } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (docError || !doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const { date, startDate, endDate } = req.query;
    
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        id, 
        appointment_date, 
        time_slot, 
        fee,
        type,
        symptoms,
        patient:patients(id, name),
        consultation:consultations(
          id, 
          started_at, 
          ended_at, 
          duration_minutes, 
          rating, 
          review, 
          chief_complaint, 
          symptoms,
          prescriptions(id, file_url, pdf_url)
        )
      `)
      .eq('doctor_id', doctor.id)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .order('time_slot', { ascending: false });

    if (date === 'today') {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('appointment_date', today);
    } else if (date && date !== 'all') {
      query = query.eq('appointment_date', date);
    } else if (startDate && endDate) {
      query = query.gte('appointment_date', startDate).lte('appointment_date', endDate);
    } else if (startDate) {
      query = query.gte('appointment_date', startDate);
    } else if (endDate) {
      query = query.lte('appointment_date', endDate);
    }

    const { data: earnings, error: earnError } = await query;

    if (earnError) {
      return res.status(500).json({ success: false, message: 'Failed to fetch earnings' });
    }

    res.json({
      success: true,
      data: earnings
    });
  })
);

// ============ PUBLIC PARAMETERIZED ROUTES ============
// These MUST come after /me/* routes to prevent Express from matching
// "me" as a :id parameter.

// Get doctor by ID
router.get('/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const doctor = await doctorService.getDoctorById(req.params.id);
    res.json({ success: true, data: doctor });
  })
);

// Get doctor available slots
router.get('/:id/slots',
  [
    query('date').notEmpty().withMessage('Date is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const slots = await doctorService.getAvailableSlots(req.params.id, req.query.date);
    res.json({ success: true, data: slots });
  })
);

// Get doctor queue stats
router.get('/:id/queue-stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { id } = req.params;

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Fetch today's appointments and doctor's slot schedule in parallel
    const [appointmentsResult, slotsResult] = await Promise.all([
      supabaseAdmin
        .from('appointments')
        .select('status, time_slot')
        .eq('doctor_id', id)
        .eq('appointment_date', today),
      supabaseAdmin
        .from('doctor_slots')
        .select('start_time, end_time, slot_duration, day_of_week')
        .eq('doctor_id', id)
        .eq('is_active', true)
    ]);

    if (appointmentsResult.error) {
      console.error("Queue stats error:", appointmentsResult.error);
      return res.status(500).json({ success: false, message: 'Failed to fetch queue stats' });
    }

    const appointments = appointmentsResult.data || [];
    const slots = slotsResult.data || [];

    // BUG FIX: Use 'scheduled' (actual creation status) instead of 'pending' (which never exists)
    const currentQueue = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
    const inProgress = appointments.filter(a => a.status === 'in_progress' || a.status === 'started').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const estimatedWaitTime = currentQueue * 15; // 15 mins per patient

    // Calculate next available slot by checking which time slots are not yet booked
    let nextAvailableSlot = null;
    const todayDow = now.getDay(); // 0=Sun, 1=Mon, ...
    const todaySchedule = slots.find(s => s.day_of_week === todayDow);

    if (todaySchedule) {
      const bookedSlots = new Set(
        appointments
          .filter(a => ['scheduled', 'confirmed', 'in_progress', 'started'].includes(a.status))
          .map(a => a.time_slot)
          .filter(Boolean)
      );

      // Generate all possible time slots from the schedule
      const startParts = todaySchedule.start_time.split(':');
      const endParts = todaySchedule.end_time.split(':');
      const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || 0);
      const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || 0);
      const duration = todaySchedule.slot_duration || 15;

      for (let m = startMins; m < endMins; m += duration) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const slotTime = `${hh}:${mm}`;

        // Only consider slots that are in the future and not already booked
        if (slotTime >= currentTimeStr && !bookedSlots.has(slotTime)) {
          nextAvailableSlot = slotTime;
          break;
        }
      }
    }

    res.json({
      success: true,
      data: {
        currentQueue,
        inProgress,
        completed,
        estimatedWaitTime,
        nextAvailableSlot
      }
    });
  })
);

// Submit a review for a doctor
router.post('/:id/reviews',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid doctor ID'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().trim(),
    body('consultationId').optional().isUUID().withMessage('Invalid consultation ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { id } = req.params;
    const { rating, comment, consultationId } = req.body;
    
    // Get patient id from current user
    const { data: patient } = await supabaseAdmin.from('patients')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
      
    if (!patient) return res.status(404).json({ success: false, message: 'Patient profile not found' });

    const reviewService = require('../../services/reviewService');
    const reviewData = {
      reviewableType: 'doctor',
      reviewableId: id,
      consultationId: consultationId,
      rating: rating,
      comment: comment
    };

    const review = await reviewService.submitReview(patient.id, reviewData);

    res.status(201).json({ success: true, data: review });
  })
);

module.exports = router;
