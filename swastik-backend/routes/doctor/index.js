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
    const { page = 1, limit = 10, specialization, isAvailable, minRating, maxFee, search, city, latitude, longitude, global, consultationType, sortBy, hospitalId, clinicId } = req.query;
    const result = await doctorService.getAllDoctors(
      { specialization, isAvailable, minRating, maxFee, search, city, latitude, longitude, global: global === 'true', consultationType, sortBy, hospitalId, clinicId },
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
// Mount feedback routes
router.use('/feedback', require('./feedback'));

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

// Respond to review
router.post('/me/reviews/:id/respond',
  authenticate,
  authorize('doctor'),
  [
    param('id').isUUID().withMessage('Invalid review ID'),
    body('response').isString().notEmpty().withMessage('Response message is required')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const reviewService = require('../../services/reviewService');
    const updated = await reviewService.respondToReview(req.params.id, req.user.id, req.body.response);
    res.json({ success: true, data: updated, message: 'Response posted successfully' });
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
    body('registration_date').optional().isISO8601(),
    body('registration_valid_till').optional().isISO8601(),
    body('medical_council').optional().isString().trim(),
    body('government_id_type').optional().isString().trim(),
    body('government_id_url').optional().isString().trim(),
    body('live_selfie_url').optional().isString().trim(),
    body('qualification_details').optional().isArray(),
    body('experience_months').optional().isInt({ min: 0 }),
    body('home_visit_consultation_fee').optional().isInt({ min: 0 }),
    body('emergency_consultation_fee').optional().isInt({ min: 0 }),
    body('is_emergency_available').optional().isBoolean(),
    body('clinic_name').optional().isString().trim(),
    body('clinic_address').optional().isString().trim(),
    body('clinic_pincode').optional().isString().trim(),
    body('clinic_map_url').optional().isString().trim(),
    body('clinic_photo_url').optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const profile = await doctorService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data: profile });
  })
);

// Submit profile for approval
router.post('/me/submit-for-approval',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const result = await doctorService.submitForApproval(req.user.id);
    res.json({ success: true, ...result });
  })
);

// Update verification documents
router.put('/me/verification-documents',
  authenticate,
  authorize('doctor'),
  [
    body('degree_certificate_url').optional().isString().trim(),
    body('license_document_url').optional().isString().trim(),
    body('government_id_url').optional().isString().trim(),
    body('live_selfie_url').optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const profile = await doctorService.updateVerificationDocuments(req.user.id, req.body);
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
    body('decision').isIn(['accept', 'reject', 'changes_requested']).withMessage('Decision must be accept, reject, or changes_requested'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.respondHospitalInvite(req.user.id, req.params.inviteId, req.body.decision, req.body);
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
    body('decision').isIn(['accept', 'reject', 'changes_requested']).withMessage('Decision must be accept, reject, or changes_requested'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.respondClinicInvite(req.user.id, req.params.inviteId, req.body.decision, req.body);
    res.json({ success: true, ...result });
  })
);

// ── Organization Search & Join Requests (Doctor Initiated) ──

router.get('/search-organizations',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { query, type, lat, lng } = req.query;
    const result = await doctorService.searchOrganizations(query, type, lat, lng, req.user.id);
    res.json({ success: true, ...result });
  })
);

router.get('/organizations/:orgId',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const result = await doctorService.getOrganizationDetails(req.params.orgId, req.query.type, req.user.id);
    res.json({ success: true, data: result });
  })
);

router.post('/me/onboarding',
  authenticate,
  authorize('doctor'),
  [
    body('practiceSetupType').isIn(['own_clinic', 'join_organization', 'video_only']).withMessage('Invalid practice setup type'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.completeOnboarding(req.user.id, req.body.practiceSetupType);
    res.json({ success: true, ...result });
  })
);

router.get('/me/join-requests',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const requests = await doctorService.getMyJoinRequests(req.user.id);
    res.json({ success: true, data: requests });
  })
);

router.post('/me/join-requests/clinic',
  authenticate,
  authorize('doctor'),
  [
    body('clinicId').isUUID().withMessage('Invalid clinic ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.requestToJoinClinic(req.user.id, req.body.clinicId, req.body);
    res.json({ success: true, data: result, message: 'Join request sent successfully' });
  })
);

router.post('/me/join-requests/hospital',
  authenticate,
  authorize('doctor'),
  [
    body('hospitalId').isUUID().withMessage('Invalid hospital ID'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.requestToJoinHospital(req.user.id, req.body.hospitalId, req.body);
    res.json({ success: true, data: result, message: 'Join request sent successfully' });
  })
);

router.post('/me/join-requests/:requestId/cancel',
  authenticate,
  authorize('doctor'),
  [
    param('requestId').isUUID().withMessage('Invalid request ID'),
    body('type').isIn(['clinic', 'hospital']).withMessage('Type must be clinic or hospital'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.cancelJoinRequest(req.user.id, req.params.requestId, req.body.type);
    res.json({ success: true, ...result });
  })
);

router.post('/me/join-requests/:requestId/respond',
  authenticate,
  authorize('doctor'),
  [
    param('requestId').isUUID().withMessage('Invalid request ID'),
    body('type').isIn(['clinic', 'hospital']).withMessage('Type must be clinic or hospital'),
    body('decision').isIn(['accept', 'reject', 'decline', 'suggest_changes']).withMessage('Invalid decision'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.respondJoinRequest(req.user.id, req.params.requestId, req.body.type, req.body.decision, req.body);
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

// Get doctor analytics (revenue trends, appointment breakdown, performance)
router.get('/me/analytics',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;
    const { supabaseAdmin } = require('../../config/supabase');

    // Resolve doctor ID
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, consultation_fee')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    // Calculate date range
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevStartDateStr = prevStartDate.toISOString().split('T')[0];

    // Fetch appointments in range
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_date, status, type, fee, patient_id')
      .eq('doctor_id', doctor.id)
      .gte('appointment_date', startDateStr)
      .order('appointment_date', { ascending: true });
      
    const { data: prevAppointments } = await supabaseAdmin
      .from('appointments')
      .select('id, status, type, fee')
      .eq('doctor_id', doctor.id)
      .gte('appointment_date', prevStartDateStr)
      .lt('appointment_date', startDateStr);

    const appts = appointments || [];

    // Build daily appointment counts
    const dailyMap = {};
    appts.forEach(a => {
      const d = a.appointment_date;
      if (!dailyMap[d]) dailyMap[d] = { date: d, appointments: 0, revenue: 0, video: 0, inPerson: 0, cancelled: 0, completed: 0 };
      dailyMap[d].appointments++;
      if (a.status === 'completed') {
        dailyMap[d].completed++;
        dailyMap[d].revenue += (a.fee || doctor.consultation_fee || 0);
      }
      if (a.status === 'cancelled') dailyMap[d].cancelled++;
      if (a.type === 'Video' || a.type === 'video') dailyMap[d].video++;
      else dailyMap[d].inPerson++;
    });
    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Summary stats
    const totalAppointments = appts.length;
    const completedAppts = appts.filter(a => a.status === 'completed').length;
    const cancelledAppts = appts.filter(a => a.status === 'cancelled').length;
    const videoAppts = appts.filter(a => a.type === 'Video' || a.type === 'video').length;
    const inPersonAppts = totalAppointments - videoAppts;
    const totalRevenue = appts.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.fee || doctor.consultation_fee || 0), 0);
    const cancellationRate = totalAppointments > 0 ? Math.round((cancelledAppts / totalAppointments) * 100) : 0;
    const completionRate = totalAppointments > 0 ? Math.round((completedAppts / totalAppointments) * 100) : 0;
    const avgRevenue = completedAppts > 0 ? Math.round(totalRevenue / completedAppts) : 0;
    const uniquePatients = new Set(appts.map(a => a.patient_id).filter(Boolean)).size;

    const prevAppts = prevAppointments || [];
    const prevTotalAppointments = prevAppts.length;
    const prevCompletedAppts = prevAppts.filter(a => a.status === 'completed').length;
    const prevCancelledAppts = prevAppts.filter(a => a.status === 'cancelled').length;
    const prevTotalRevenue = prevAppts.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.fee || doctor.consultation_fee || 0), 0);
    const prevCancellationRate = prevTotalAppointments > 0 ? Math.round((prevCancelledAppts / prevTotalAppointments) * 100) : 0;
    const prevCompletionRate = prevTotalAppointments > 0 ? Math.round((prevCompletedAppts / prevTotalAppointments) * 100) : 0;

    // Peak hours from appointment times — get from time_slot
    const { data: slotData } = await supabaseAdmin
      .from('appointments')
      .select('time_slot')
      .eq('doctor_id', doctor.id)
      .gte('appointment_date', startDateStr)
      .not('time_slot', 'is', null);

    const hourMap = {};
    (slotData || []).forEach(a => {
      if (!a.time_slot) return;
      const hour = parseInt(a.time_slot.split(':')[0], 10);
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    const peakHours = Object.entries(hourMap)
      .map(([hour, count]) => ({ hour: parseInt(hour), label: `${hour}:00`, count }))
      .sort((a, b) => a.hour - b.hour);

    res.json({
      success: true,
      data: {
        period,
        summary: {
          totalAppointments,
          completedAppointments: completedAppts,
          cancelledAppointments: cancelledAppts,
          totalRevenue,
          avgRevenuePerConsultation: avgRevenue,
          cancellationRate,
          completionRate,
          videoConsultations: videoAppts,
          inPersonConsultations: inPersonAppts,
          uniquePatients,
        },
        previousSummary: {
          totalAppointments: prevTotalAppointments,
          totalRevenue: prevTotalRevenue,
          cancellationRate: prevCancellationRate,
          completionRate: prevCompletionRate,
        },
        charts: {
          daily: dailyData,
          consultationType: [
            { name: 'Video', value: videoAppts, color: '#10b981' },
            { name: 'In-Person', value: inPersonAppts, color: '#3b82f6' },
          ],
          peakHours,
        },
      }
    });
  })
);

// Get AI-powered doctor insights (rule-based, ready for OpenAI integration)
router.get('/me/insights',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');

    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id, consultation_fee, bio, profile_image_url, intro_video_url, qualification, specialization, registration_number, license_number')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    // Last 30 days appointments
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentAppts } = await supabaseAdmin
      .from('appointments')
      .select('appointment_date, status, type, fee, time_slot')
      .eq('doctor_id', doctor.id)
      .gte('appointment_date', thirtyDaysAgo.toISOString().split('T')[0]);

    const appts = recentAppts || [];
    const insights = [];

    // Rule 1: Weekend vs weekday bookings
    const weekendAppts = appts.filter(a => {
      const day = new Date(a.appointment_date).getDay();
      return day === 0 || day === 6;
    }).length;
    const weekdayAppts = appts.length - weekendAppts;
    if (weekendAppts > 0 && weekdayAppts > 0) {
      const weekendRate = ((weekendAppts / appts.length) * 100).toFixed(0);
      if (weekendAppts > weekdayAppts / 5) {
        insights.push({ id: 'weekend_bookings', category: 'Schedule', type: 'positive', icon: 'calendar', title: 'Weekend bookings are strong', description: `${weekendRate}% of your recent appointments are on weekends. Consider adding more Saturday/Sunday slots.`, action: 'Add Weekend Slots', actionHref: '/doctor/schedule' });
      }
    }

    // Rule 2: Evening slots
    const eveningAppts = appts.filter(a => {
      if (!a.time_slot) return false;
      const hour = parseInt(a.time_slot.split(':')[0], 10);
      return hour >= 17;
    }).length;
    if (eveningAppts > 0 && appts.length > 0) {
      const eveningRate = ((eveningAppts / appts.length) * 100).toFixed(0);
      if (eveningRate > 25) {
        insights.push({ id: 'evening_slots', category: 'Schedule', type: 'positive', icon: 'clock', title: 'Evening slots are popular', description: `${eveningRate}% of your bookings are for evening hours. Evening slots generate higher patient engagement.`, action: 'Optimize Schedule', actionHref: '/doctor/schedule' });
      }
    }

    // Rule 3: Video vs In-Person revenue comparison
    const videoAppts = appts.filter(a => a.type === 'Video' || a.type === 'video');
    const inPersonAppts = appts.filter(a => a.type !== 'Video' && a.type !== 'video');
    if (videoAppts.length > 0 && inPersonAppts.length > 0) {
      insights.push({ id: 'video_vs_inperson', category: 'Revenue', type: 'info', icon: 'video', title: 'Video consultations growing', description: `${videoAppts.length} video vs ${inPersonAppts.length} in-person consultations this month. Video cuts travel time and increases patient reach.`, action: 'View Earnings', actionHref: '/doctor/earnings' });
    }

    // Rule 4: Cancellation rate
    const cancelled = appts.filter(a => a.status === 'cancelled').length;
    if (appts.length > 5) {
      const cancelRate = ((cancelled / appts.length) * 100).toFixed(0);
      if (parseFloat(cancelRate) > 15) {
        insights.push({ id: 'high_cancellation', category: 'Engagement', type: 'warning', icon: 'alert', title: 'Cancellation rate is elevated', description: `Your cancellation rate is ${cancelRate}% this month. Consider sending appointment reminders to reduce no-shows.`, action: 'Review Appointments', actionHref: '/doctor/appointments' });
      }
    }

    // Rule 5: Profile completeness
    const profileFields = ['bio', 'profile_image_url', 'intro_video_url', 'qualification', 'specialization', 'registration_number'];
    const filledFields = profileFields.filter(f => doctor[f] && doctor[f] !== '');
    const completionPct = Math.round((filledFields.length / profileFields.length) * 100);
    if (completionPct < 85) {
      insights.push({ id: 'profile_completion', category: 'Engagement', type: 'warning', icon: 'user', title: 'Complete your profile for more bookings', description: `Your profile is ${completionPct}% complete. Doctors with complete profiles receive 3× more patient bookings.`, action: 'Complete Profile', actionHref: '/doctor/settings' });
    }

    // Rule 6: No intro video
    if (!doctor.intro_video_url) {
      insights.push({ id: 'intro_video', category: 'Engagement', type: 'tip', icon: 'video', title: 'Add an intro video to boost trust', description: 'Doctors with intro videos get significantly more bookings. Upload a 15-second reel to introduce yourself to patients.', action: 'Upload Video', actionHref: '/doctor/settings?tab=video' });
    }

    res.json({ success: true, data: insights });
  })
);



// Get patient health alerts
router.get('/me/patient-alerts',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const alerts = await doctorService.getPatientAlerts(req.user.id);
    res.json({ success: true, data: alerts });
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
    body('slots.*.slot_date').optional().isString(),
    body('slots.*.date').optional().isString(),
    body('slots.*.startTime').optional().isString(),
    body('slots.*.endTime').optional().isString(),
    body('slots.*.isHomeEnabled').optional().isBoolean(),
    body('slots.*.slotDuration').optional().isInt(),
    body('slots.*.bufferTime').optional().isInt(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const slots = await doctorService.updateSlots(req.user.id, req.body.slots);
    res.json({ success: true, data: slots });
  })
);

// ============ ORGANIZATION-SPECIFIC SCHEDULING ============

// Active affiliations for the In-Person schedule "Organization" dropdown
router.get('/me/organizations',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const organizations = await doctorService.getMyOrganizations(req.user.id);
    res.json({ success: true, data: organizations });
  })
);

// Create a single schedule (video OR organization-specific in-person)
router.post('/me/schedules',
  authenticate,
  authorize('doctor'),
  [
    body('consultation_mode').optional().isIn(['video', 'in_person']),
    body('slot_date').optional().isString(),
    body('date').optional().isString(),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('start_time').optional().isString(),
    body('end_time').optional().isString(),
    body('slotDuration').optional().isInt(),
    body('slot_duration').optional().isInt(),
    body('bufferTime').optional().isInt(),
    body('buffer_time').optional().isInt(),
    body('recurringWeeks').optional().isInt(),
    body('organization_type').optional().isIn(['clinic', 'hospital']),
    body('organization_id').optional().isString(),
    body('department_id').optional().isString(),
    body('department_name').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.createSchedule(req.user.id, req.body);
    res.json({ success: true, data: result });
  })
);

// Update an existing schedule (edit times, pause/resume)
router.put('/me/schedules/:scheduleId',
  authenticate,
  authorize('doctor'),
  [
    param('scheduleId').isUUID().withMessage('Valid schedule id is required'),
    body('is_active').optional().isBoolean(),
    body('slot_date').optional().isString(),
    body('startTime').optional().isString(),
    body('endTime').optional().isString(),
    body('slotDuration').optional().isInt(),
    body('bufferTime').optional().isInt(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.updateSchedule(req.user.id, req.params.scheduleId, req.body);
    res.json({ success: true, data: result });
  })
);

// Disable/end a schedule (never silently wipes appointments)
router.delete('/me/schedules/:scheduleId',
  authenticate,
  authorize('doctor'),
  [
    param('scheduleId').isUUID().withMessage('Valid schedule id is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.disableSchedule(req.user.id, req.params.scheduleId);
    res.json({ success: true, data: result });
  })
);

// ============ LEAVE MANAGEMENT (Phase 6) ============

router.get('/me/leaves',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const leaves = await doctorService.getLeaves(req.user.id);
    res.json({ success: true, data: leaves });
  })
);

router.post('/me/leaves/check-affected',
  authenticate,
  authorize('doctor'),
  [
    body('start_date').isDate().withMessage('Valid start date is required'),
    body('end_date').isDate().withMessage('Valid end date is required'),
    body('scope').optional().isIn(['global', 'organization']),
    body('organization_type').optional().isIn(['clinic', 'hospital']),
    body('organization_id').optional().isUUID(),
    body('leave_type').optional().isIn(['full_day', 'partial_day']),
    body('start_time').optional().isString(),
    body('end_time').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.checkAffectedAppointments(req.user.id, req.body);
    res.json({ success: true, data: result });
  })
);

router.post('/me/leaves',
  authenticate,
  authorize('doctor'),
  [
    body('start_date').isDate().withMessage('Valid start date is required'),
    body('end_date').isDate().withMessage('Valid end date is required'),
    body('reason').optional().isString(),
    body('scope').optional().isIn(['global', 'organization']),
    body('organization_type').optional().isIn(['clinic', 'hospital']),
    body('organization_id').optional().isUUID(),
    body('leave_type').optional().isIn(['full_day', 'partial_day']),
    body('start_time').optional().isString(),
    body('end_time').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const leave = await doctorService.addLeave(req.user.id, req.body);
    res.json({ success: true, data: leave });
  })
);

router.post('/me/leaves/:id/cancel',
  authenticate,
  authorize('doctor'),
  param('id').isUUID().withMessage('Valid leave ID is required'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.cancelLeave(req.user.id, req.params.id);
    res.json({ success: true, data: result, message: 'Leave cancelled successfully' });
  })
);

router.delete('/me/leaves/:id',
  authenticate,
  authorize('doctor'),
  param('id').isUUID().withMessage('Valid leave ID is required'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await doctorService.deleteLeave(req.user.id, req.params.id);
    res.json({ success: true, data: result, message: 'Leave cancelled successfully' });
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

// Update patient medical history
router.put('/me/patients/:patientId/medical-history',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const result = await doctorService.updatePatientMedicalHistory(req.user.id, req.params.patientId, req.body);
    res.json({ success: true, data: result });
  })
);

// Update patient internal notes
router.put('/me/patients/:patientId/internal-notes',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const result = await doctorService.updatePatientInternalNotes(req.user.id, req.params.patientId, req.body.notes);
    res.json({ success: true, data: result });
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
      patientId: rx.patient_id,
      patientPhone: '',
      date: rx.created_at,
      created_at: rx.created_at,
      diagnosis: rx.diagnosis,
      notes: rx.notes,
      dietaryAdvice: rx.dietary_advice,
      lifestyleAdvice: rx.lifestyle_advice,
      followUpDate: rx.follow_up_date,
      fileUrl: rx.file_url,
      pdfUrl: rx.pdf_url,
      prescriptionNumber: rx.prescription_number,
      medications: (rx.prescription_medicines || []).map(m => ({
        medicineName: m.medicine_name,
        name: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        quantity: m.quantity,
        beforeFood: m.before_food,
        isCritical: m.is_critical,
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

// Get single prescription by ID (doctor only)
router.get('/me/prescriptions/:id',
  authenticate,
  authorize('doctor'),
  [
    param('id').isUUID().withMessage('Invalid prescription ID'),
  ],
  validate,
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

    const { data: rx, error } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        *,
        prescription_medicines (*),
        patients!prescriptions_patient_id_fkey (id, name, gender, date_of_birth, blood_group, profile_image_url),
        consultations!prescriptions_consultation_id_fkey (id, appointment_id, status, started_at, ended_at, type)
      `)
      .eq('id', req.params.id)
      .eq('doctor_id', doctor.id)
      .single();

    if (error || !rx) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const formattedRx = {
      id: rx.id,
      patientName: rx.patients?.name || 'Unknown',
      patientId: rx.patient_id,
      patient: rx.patients,
      patientPhone: '',
      date: rx.created_at,
      created_at: rx.created_at,
      diagnosis: rx.diagnosis,
      notes: rx.notes,
      dietaryAdvice: rx.dietary_advice,
      lifestyleAdvice: rx.lifestyle_advice,
      followUpDate: rx.follow_up_date,
      fileUrl: rx.file_url,
      pdfUrl: rx.pdf_url,
      prescriptionNumber: rx.prescription_number,
      medications: (rx.prescription_medicines || []).map(m => ({
        medicineName: m.medicine_name,
        name: m.medicine_name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
        quantity: m.quantity,
        beforeFood: m.before_food,
        isCritical: m.is_critical,
      })),
      consultationId: rx.consultation_id,
      appointmentId: rx.consultations?.appointment_id || null,
      consultation: rx.consultations,
      status: rx.status || 'active',
    };

    res.json({
      success: true,
      data: formattedRx,
    });
  })
);

// Get active pharmacy partners for a prescription's organization (clinic or hospital)
router.get('/prescriptions/:id/pharmacy-partners',
  authenticate,
  authorize('doctor'),
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const organizationPartnershipService = require('../../services/organizationPartnershipService');
    
    // Validate doctor
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Find prescription and its org context
    const { data: prescription, error } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        id, doctor_id,
        consultations (
          appointments ( clinic_id, hospital_id )
        )
      `)
      .eq('id', req.params.id)
      .single();
    if (error || !prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (prescription.doctor_id !== doctor.id) return res.status(403).json({ success: false, message: 'Prescription does not belong to you' });

    const clinicId = prescription.consultations?.appointments?.clinic_id;
    const hospitalId = prescription.consultations?.appointments?.hospital_id;

    let orgType, orgId;
    if (clinicId) { orgType = 'clinic'; orgId = clinicId; }
    else if (hospitalId) { orgType = 'hospital'; orgId = hospitalId; }
    else return res.status(400).json({ success: false, message: 'Prescription has no clinic or hospital context' });

    const partnerships = await organizationPartnershipService.getPartnerships({
      orgType, orgId, status: 'active'
    });
    
    // Filter only pharmacy partners
    const pharmacyPartners = (partnerships || []).filter(p => p.partner?.type === 'pharmacy');
    res.json({ success: true, data: pharmacyPartners });
  })
);

// Route a prescription to a partner pharmacy
router.post('/prescriptions/:id/route-to-pharmacy',
  authenticate,
  authorize('doctor'),
  [
    require('express-validator').body('pharmacyId').isUUID(),
    require('express-validator').body('items').isArray(),
    require('../../middleware/validate').validate
  ],
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const pharmacyService = require('../../services/pharmacyService');
    
    // Validate doctor
    const { data: doctor } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('user_id', req.user.id)
      .single();
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    // Find prescription and its org context
    const { data: prescription, error } = await supabaseAdmin
      .from('prescriptions')
      .select(`
        id, doctor_id, patient_id,
        consultations (
          appointments ( clinic_id, hospital_id )
        )
      `)
      .eq('id', req.params.id)
      .single();
      
    if (error || !prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (prescription.doctor_id !== doctor.id) return res.status(403).json({ success: false, message: 'Prescription does not belong to you' });

    const clinicId = prescription.consultations?.appointments?.clinic_id;
    const hospitalId = prescription.consultations?.appointments?.hospital_id;

    const orderData = {
      prescriptionId: req.params.id,
      pharmacyId: req.body.pharmacyId,
      items: req.body.items,
      deliveryType: req.body.deliveryType || 'pickup'
    };

    let order;
    if (hospitalId) {
      order = await pharmacyService.createHospitalPharmacyOrder(hospitalId, doctor.id, orderData);
    } else if (clinicId) {
      order = await pharmacyService.createClinicPharmacyOrder(clinicId, doctor.id, orderData);
    } else {
      return res.status(400).json({ success: false, message: 'Prescription has no clinic or hospital context' });
    }

    res.status(201).json({ success: true, data: order });
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

    // Get all completed appointments to calculate timeseries, earnings, and unique patients
    const { data: consultations, error: consError } = await supabaseAdmin
      .from('appointments')
      .select('id, fee, patient_id, created_at, updated_at, appointment_date')
      .eq('doctor_id', doctor.id)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: true });

    if (consError) {
      return res.status(500).json({ success: false, message: 'Failed to fetch journey stats' });
    }

    // Get recent reviews
    const { data: recentReviews } = await supabaseAdmin
      .from('reviews')
      .select('id, rating, review_text, created_at, patient:patients(user:users(name))')
      .eq('doctor_id', doctor.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get Goals gracefully (handle MongoDB timeouts)
    const { DoctorGoal } = require('../../database/models');
    let doctorGoal = {
        monthlyConsultations: 50,
        monthlyRevenue: 25000,
        profileCompletion: 100
    };
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            const foundGoal = await DoctorGoal.findOne({ doctorId: doctor.id }).maxTimeMS(2000).exec();
            if (foundGoal) doctorGoal = foundGoal;
        } else {
            console.warn('MongoDB not connected, using default DoctorGoal.');
        }
    } catch (err) {
        console.warn('MongoDB error for DoctorGoal, using defaults:', err.message);
    }

    // Calculate stats & timeseries
    let lifetimeEarnings = 0;
    const uniquePatients = new Set();
    const patientsByMonth = {};
    const revenueByMonth = {};
    const consultationsByMonth = {};
    const milestones = [];

    milestones.push({
        title: 'Joined Vaididea',
        date: doctor.user?.created_at,
        icon: 'UserPlus'
    });

    if (consultations && consultations.length > 0) {
        milestones.push({
            title: 'First Consultation',
            date: consultations[0].appointment_date || consultations[0].updated_at,
            icon: 'Stethoscope'
        });
        
        if (consultations.length >= 10) {
            milestones.push({ title: '10 Consultations', date: consultations[9].appointment_date || consultations[9].updated_at, icon: 'Award' });
        }
        if (consultations.length >= 50) {
            milestones.push({ title: '50 Consultations', date: consultations[49].appointment_date || consultations[49].updated_at, icon: 'Award' });
        }
        if (consultations.length >= 100) {
            milestones.push({ title: '100 Consultations', date: consultations[99].appointment_date || consultations[99].updated_at, icon: 'Trophy' });
        }
    }

    if (recentReviews && recentReviews.length > 0) {
        milestones.push({
            title: 'First Patient Review',
            date: recentReviews[recentReviews.length - 1].created_at,
            icon: 'Star'
        });
    }

    // Sort milestones chronologically
    milestones.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Process analytics
    (consultations || []).forEach(cons => {
      lifetimeEarnings += (cons.fee || 0);
      if (cons.patient_id) uniquePatients.add(cons.patient_id);
      
      const d = new Date(cons.appointment_date || cons.updated_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (!consultationsByMonth[monthKey]) consultationsByMonth[monthKey] = 0;
      if (!revenueByMonth[monthKey]) revenueByMonth[monthKey] = 0;
      if (!patientsByMonth[monthKey]) patientsByMonth[monthKey] = new Set();
      
      consultationsByMonth[monthKey]++;
      revenueByMonth[monthKey] += (cons.fee || 0);
      if (cons.patient_id) patientsByMonth[monthKey].add(cons.patient_id);
    });

    // Format timeseries for charts
    const chartData = Object.keys(consultationsByMonth).sort().map(monthKey => ({
        month: monthKey,
        consultations: consultationsByMonth[monthKey],
        revenue: revenueByMonth[monthKey],
        patients: patientsByMonth[monthKey].size
    }));

    res.json({
      success: true,
      data: {
        joinedDate: doctor.user?.created_at,
        totalPatients: uniquePatients.size,
        totalConsultations: (consultations || []).length,
        lifetimeEarnings,
        averageRating: doctor.rating || 0,
        totalReviews: doctor.total_reviews || 0,
        chartData,
        milestones,
        recentReviews: (recentReviews || []).map(r => ({
            id: r.id,
            rating: r.rating,
            text: r.review_text,
            date: r.created_at,
            patientName: r.patient?.user?.name || 'Anonymous'
        })),
        goals: {
            monthlyConsultations: doctorGoal.monthlyConsultations,
            monthlyRevenue: doctorGoal.monthlyRevenue,
            profileCompletion: doctorGoal.profileCompletion
        }
      }
    });
  })
);

// Save/Update Goals
router.post('/me/goals',
  authenticate,
  authorize('doctor'),
  requireApproval,
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { DoctorGoal } = require('../../database/models');
    
    const { data: doctor } = await supabaseAdmin.from('doctors').select('id').eq('user_id', req.user.id).single();
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const { monthlyConsultations, monthlyRevenue } = req.body;
    
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Goals storage temporarily unavailable' });
        }
        await DoctorGoal.findOneAndUpdate(
            { doctorId: doctor.id },
            { monthlyConsultations, monthlyRevenue, updatedAt: new Date() },
            { upsert: true, new: true, maxTimeMS: 3000 }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to save goals:', err.message);
        res.status(503).json({ success: false, message: 'Goals storage temporarily unavailable' });
    }
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
    const slots = await doctorService.getAvailableSlots(req.params.id, req.query.date, req.query.type || 'all');
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

// Get doctor details (PUBLIC PROFILE)
router.get('/:id',
  asyncHandler(async (req, res) => {
    // IMPORTANT: This is a public route, no authentication needed.
    const doctorDetails = await doctorService.getDoctorById(req.params.id);
    const { signStorageUrlsInPayload } = require('../../config/minio');
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

module.exports = router;
