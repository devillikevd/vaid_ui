const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { requireRole, ROLES } = require('../../middleware/rbac');
const { validate } = require('../../middleware/validate');
const { asyncHandler } = require('../../middleware/errorHandler');
const wellnessService = require('../../services/wellnessService');

const router = express.Router();

const pagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
];

const pageOf = (req) => parseInt(req.query.page || '1', 10);
const limitOf = (req) => parseInt(req.query.limit || '20', 10);

// Smart Health Hub
router.get('/hub',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getHubSummary(req.user.id);
    res.json({ success: true, data });
  })
);

// Fitness onboarding and personalization
router.get('/profile',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getFitnessProfile(req.user.id);
    res.json({ success: true, data });
  })
);

router.put('/profile',
  authenticate,
  requireRole(ROLES.PATIENT),
  [
    body('availableMinutesPerDay').optional().isInt({ min: 5, max: 240 }),
    body('available_minutes_per_day').optional().isInt({ min: 5, max: 240 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.upsertFitnessProfile(req.user.id, req.body);
    res.json({ success: true, data });
  })
);

// Wearables and Health Connect summaries
router.get('/wearables/summaries',
  authenticate,
  requireRole(ROLES.PATIENT),
  [query('days').optional().isInt({ min: 1, max: 180 })],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getWearableSummaries(req.user.id, req.query.days || 30);
    res.json({ success: true, data });
  })
);

router.post('/wearables/summaries',
  authenticate,
  requireRole(ROLES.PATIENT),
  [body('summaryDate').optional().isISO8601(), body('summary_date').optional().isISO8601()],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.upsertWearableSummary(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

// Workout plans and logs
router.get('/plans',
  optionalAuth,
  pagination,
  validate,
  asyncHandler(async (req, res) => {
    const result = await wellnessService.listWorkoutPlans(req.query, pageOf(req), limitOf(req));
    res.json({ success: true, ...result });
  })
);

router.get('/plans/:id',
  optionalAuth,
  [param('id').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getWorkoutPlan(req.params.id);
    res.json({ success: true, data });
  })
);

router.get('/exercises',
  optionalAuth,
  pagination,
  validate,
  asyncHandler(async (req, res) => {
    const result = await wellnessService.listExercises(req.query, pageOf(req), limitOf(req));
    res.json({ success: true, ...result });
  })
);

router.get('/exercises/stats',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getExerciseStats();
    res.json({ success: true, data });
  })
);

router.get('/exercises/:id',
  optionalAuth,
  [param('id').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getExercise(req.params.id);
    res.json({ success: true, data });
  })
);

router.post('/plans/:id/assign',
  authenticate,
  requireRole(ROLES.PATIENT),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.assignWorkoutPlan(req.user.id, req.params.id, req.body.coachId || req.body.coach_id || null);
    res.status(201).json({ success: true, data });
  })
);

router.post('/workouts/log',
  authenticate,
  requireRole(ROLES.PATIENT),
  [body('durationMinutes').optional().isInt({ min: 1, max: 600 })],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.logWorkout(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.get('/workouts/calendar',
  authenticate,
  requireRole(ROLES.PATIENT),
  [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('start').optional().isISO8601(),
    query('end').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getWorkoutCalendar(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get('/workouts/progress',
  authenticate,
  requireRole(ROLES.PATIENT),
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getWorkoutProgress(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.get('/badges',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listMyBadges(req.user.id);
    res.json({ success: true, data });
  })
);

router.get('/ai/insights',
  authenticate,
  requireRole(ROLES.PATIENT),
  [
    query('severity').optional().isIn(['info', 'warning', 'urgent']),
    query('unacknowledged').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listAiInsights(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post('/ai/insights/:id/acknowledge',
  authenticate,
  requireRole(ROLES.PATIENT),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.acknowledgeAiInsight(req.user.id, req.params.id);
    res.json({ success: true, data });
  })
);

router.get('/reports',
  authenticate,
  requireRole(ROLES.PATIENT),
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getWellnessReports(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

// Coaches and coaching sessions
router.get('/coaches',
  optionalAuth,
  pagination,
  validate,
  asyncHandler(async (req, res) => {
    const result = await wellnessService.listCoaches(req.query, pageOf(req), limitOf(req));
    res.json({ success: true, ...result });
  })
);

router.get('/coaches/me',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getMyCoachProfile(req.user.id);
    res.json({ success: true, data });
  })
);

router.put('/coaches/me',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    body('sessionFee').optional().isFloat({ min: 0 }),
    body('session_fee').optional().isFloat({ min: 0 }),
    body('videoSessionFee').optional().isFloat({ min: 0 }),
    body('video_session_fee').optional().isFloat({ min: 0 }),
    body('monthlyPlanFee').optional().isFloat({ min: 0 }),
    body('monthly_plan_fee').optional().isFloat({ min: 0 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.updateMyCoachProfile(req.user.id, req.body);
    res.json({ success: true, data });
  })
);

router.get('/coaches/:id',
  optionalAuth,
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getCoach(req.params.id);
    res.json({ success: true, data });
  })
);

router.get('/sessions',
  authenticate,
  requireRole(ROLES.PATIENT, ROLES.WELLNESS_COACH),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listMySessions(req.user.id, req.user.role, req.query.status);
    res.json({ success: true, data });
  })
);

router.get('/sessions/:id/messages',
  authenticate,
  requireRole(ROLES.PATIENT, ROLES.WELLNESS_COACH),
  [
    param('id').isUUID('loose'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100'),
    query('before').optional().isISO8601().withMessage('before must be an ISO timestamp'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getSessionMessages(req.user.id, req.user.role, req.params.id, {
      limit: parseInt(req.query.limit || '100', 10),
      before: req.query.before,
    });
    res.json({ success: true, ...data });
  })
);

router.post('/sessions',
  authenticate,
  requireRole(ROLES.PATIENT),
  [
    body().custom((_, { req }) => {
      if (!req.body.coachId && !req.body.coach_id) {
        throw new Error('coachId is required');
      }
      if (!req.body.scheduledAt && !req.body.scheduled_at) {
        throw new Error('scheduledAt is required');
      }
      return true;
    }),
    body('coachId').optional().isUUID('loose'),
    body('coach_id').optional().isUUID('loose'),
    body('scheduledAt').optional().isISO8601(),
    body('scheduled_at').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.bookCoachSession(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

// Gym, studio, and class marketplace
router.get('/facilities',
  optionalAuth,
  pagination,
  validate,
  asyncHandler(async (req, res) => {
    const result = await wellnessService.listFacilities(req.query, pageOf(req), limitOf(req));
    res.json({ success: true, ...result });
  })
);

router.get('/facilities/:id',
  optionalAuth,
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getFacility(req.params.id);
    res.json({ success: true, data });
  })
);

router.post('/facilities/bookings',
  authenticate,
  requireRole(ROLES.PATIENT),
  [
    body().custom((_, { req }) => {
      if (!req.body.centerId && !req.body.center_id) throw new Error('centerId is required');
      return true;
    }),
    body('centerId').optional().isUUID('loose'),
    body('center_id').optional().isUUID('loose'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.bookFacility(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.post('/facilities/checkins',
  authenticate,
  requireRole(ROLES.PATIENT),
  [
    body().custom((_, { req }) => {
      if (!req.body.centerId && !req.body.center_id) throw new Error('centerId is required');
      return true;
    }),
    body('centerId').optional().isUUID('loose'),
    body('center_id').optional().isUUID('loose'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.checkInFacility(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.post('/admin/badges/re-evaluate',
  authenticate,
  requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.runWellnessBadgeEvaluation();
    if (data.status === 'busy') {
      return res.status(409).json({ success: false, ...data });
    }
    res.json({ success: true, data });
  })
);

// Gym/studio owner portal and trainer invite links
router.get('/owner/center',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getOwnedFitnessCenterDashboard(req.user.id);
    res.json({ success: true, data });
  })
);

router.get('/owner/trainers',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listOwnerTrainers(req.user.id);
    res.json({ success: true, data });
  })
);

router.get('/owner/trainer-invites',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [query('status').optional().isIn(['pending', 'accepted', 'rejected', 'expired', 'cancelled'])],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listOwnerTrainerInvites(req.user.id, req.query.status);
    res.json({ success: true, data });
  })
);

router.post('/owner/trainer-invites',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [
    body('coachId').optional().isUUID('loose'),
    body('coach_id').optional().isUUID('loose'),
    body('email').optional().isEmail().normalizeEmail(),
    body('invitedEmail').optional().isEmail().normalizeEmail(),
    body('invited_email').optional().isEmail().normalizeEmail(),
    body('role').optional().isString().trim().isLength({ min: 2, max: 80 }),
    body().custom((_, { req }) => {
      if (!req.body.coachId && !req.body.coach_id && !req.body.email && !req.body.invitedEmail && !req.body.invited_email) {
        throw new Error('coachId or trainer email is required');
      }
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.createTrainerInvite(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.post('/owner/trainer-invites/:id/cancel',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.cancelTrainerInvite(req.user.id, req.params.id);
    res.json({ success: true, data });
  })
);

router.get('/trainer-invites/:token',
  optionalAuth,
  [param('token').isString().isLength({ min: 16, max: 128 })],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getTrainerInviteByToken(req.params.token);
    res.json({ success: true, data });
  })
);

router.get('/coaches/me/center-invites',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [query('status').optional().isIn(['pending', 'accepted', 'rejected', 'expired', 'cancelled'])],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listCoachCenterInvites(req.user.id, req.query.status);
    res.json({ success: true, data });
  })
);

router.post('/coaches/me/center-invites/:id/respond',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    param('id').notEmpty(),
    body('decision').isIn(['accept', 'reject']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.respondTrainerInvite(req.user.id, req.params.id, req.body.decision);
    res.json({ success: true, data });
  })
);

router.post('/trainer-invites/:token/respond',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    param('token').isString().isLength({ min: 16, max: 128 }),
    body('decision').isIn(['accept', 'reject']),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.respondTrainerInvite(req.user.id, req.params.token, req.body.decision);
    res.json({ success: true, data });
  })
);

// Coach production dashboard: clients, analytics, and plan builder
router.get('/coaches/me/patients',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listCoachPatients(req.user.id);
    res.json({ success: true, data });
  })
);

router.get('/coaches/me/patients/:id/analytics',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getPatientAnalytics(req.user.id, req.params.id);
    res.json({ success: true, data });
  })
);

router.get('/coaches/me/workout-plans',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listCoachWorkoutPlans(req.user.id);
    res.json({ success: true, data });
  })
);

router.post('/coaches/me/workout-plans',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    body('title').notEmpty().withMessage('Plan title is required'),
    body('patientId').optional().isUUID('loose'),
    body('patient_id').optional().isUUID('loose'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.createCoachWorkoutPlan(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.get('/coaches/me/diet-plans',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listCoachDietPlans(req.user.id);
    res.json({ success: true, data });
  })
);

router.post('/coaches/me/diet-plans',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    body('title').notEmpty().withMessage('Diet plan title is required'),
    body('patientId').optional().isUUID('loose'),
    body('patient_id').optional().isUUID('loose'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.createDietPlan(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.post('/coaches/me/diet-plans/:id/archive',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.archiveDietPlan(req.user.id, req.params.id);
    res.json({ success: true, data });
  })
);

router.put('/coaches/me/availability',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    body('isAvailable').optional().isBoolean(),
    body('is_available').optional().isBoolean(),
    body('isAcceptingClients').optional().isBoolean(),
    body('is_accepting_clients').optional().isBoolean(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.updateCoachAvailability(req.user.id, req.body);
    res.json({ success: true, data });
  })
);

router.get('/coaches/me/reels',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listCoachReels(req.user.id);
    res.json({ success: true, data });
  })
);

router.post('/coaches/me/reels',
  authenticate,
  requireRole(ROLES.WELLNESS_COACH),
  [
    body('videoUrl').optional().notEmpty(),
    body('video_url').optional().notEmpty(),
    body().custom((_, { req }) => {
      if (!req.body.videoUrl && !req.body.video_url) {
        throw new Error('videoUrl is required');
      }
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.createReel(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

// Fitness center owner: class CRUD and live feeds
router.get('/owner/classes',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [
    query('status').optional().isIn(['scheduled', 'cancelled', 'completed']),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listOwnerClasses(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

router.post('/owner/classes',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [
    body('title').notEmpty().withMessage('Class title is required'),
    body('coachId').optional().isUUID('loose'),
    body('coach_id').optional().isUUID('loose'),
    body().custom((_, { req }) => {
      if (!req.body.startsAt && !req.body.starts_at) {
        throw new Error('Class start time is required');
      }
      return true;
    }),
    body('startsAt').optional().isISO8601(),
    body('starts_at').optional().isISO8601(),
    body('endsAt').optional().isISO8601(),
    body('ends_at').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.createOwnerClass(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put('/owner/classes/:id',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.updateOwnerClass(req.user.id, req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.delete('/owner/classes/:id',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.cancelOwnerClass(req.user.id, req.params.id);
    res.json({ success: true, data });
  })
);

router.get('/owner/bookings',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [
    query('status').optional().isIn(['booked', 'waitlisted', 'cancelled', 'completed', 'no_show']),
    query('from').optional().isISO8601(),
    query('classId').optional().isUUID('loose'),
    query('class_id').optional().isUUID('loose'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listOwnerBookings(req.user.id, {
      ...req.query,
      classId: req.query.classId || req.query.class_id,
    });
    res.json({ success: true, data });
  })
);

router.get('/owner/checkins',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [query('from').optional().isISO8601()],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listOwnerCheckins(req.user.id, req.query);
    res.json({ success: true, data });
  })
);

// Gym/studio reels (owner upload/delete; patients view via GET /facilities/:id)
router.post('/owner/reels',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [
    body('video_url').isString().trim().notEmpty().withMessage('Video URL is required'),
    body('thumbnail_url').optional().isString().trim(),
    body('title').optional().isString().trim(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.addFitnessReel(req.user.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.delete('/owner/reels/:reelId',
  authenticate,
  requireRole(ROLES.FITNESS_CENTER_OWNER),
  [param('reelId').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.deleteFitnessReel(req.user.id, req.params.reelId);
    res.json({ success: true, data });
  })
);

// Workout streaks
router.get('/streaks',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getWorkoutStreaks(req.user.id);
    res.json({ success: true, data });
  })
);

// Patient diet plans (nutritionist-assigned)
router.get('/diet-plans',
  authenticate,
  requireRole(ROLES.PATIENT),
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listMyDietPlans(req.user.id);
    res.json({ success: true, data });
  })
);

// Community and challenges
router.get('/groups',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listGroups(req.query);
    res.json({ success: true, data });
  })
);

router.post('/groups/:id/join',
  authenticate,
  requireRole(ROLES.PATIENT),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.joinGroup(req.user.id, req.params.id);
    res.status(201).json({ success: true, data });
  })
);

router.get('/challenges',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.listChallenges(req.query);
    res.json({ success: true, data });
  })
);

router.post('/challenges/:id/join',
  authenticate,
  requireRole(ROLES.PATIENT),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.joinChallenge(req.user.id, req.params.id);
    res.status(201).json({ success: true, data });
  })
);

router.get('/challenges/:id/leaderboard',
  optionalAuth,
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.getChallengeLeaderboard(req.user?.id || null, req.params.id);
    res.json({ success: true, data });
  })
);

router.post('/challenges/:id/progress',
  authenticate,
  requireRole(ROLES.PATIENT),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.updateChallengeProgress(req.user.id, req.params.id, req.body);
    res.json({ success: true, data });
  })
);

// Wellness reels (short-form coach content)
router.get('/reels',
  optionalAuth,
  pagination,
  validate,
  asyncHandler(async (req, res) => {
    const result = await wellnessService.listReels(req.query, pageOf(req), limitOf(req));
    res.json({ success: true, ...result });
  })
);

router.post('/reels/:id/like',
  authenticate,
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.likeReel(req.params.id);
    res.json({ success: true, data });
  })
);

router.post('/reels/:id/view',
  optionalAuth,
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.incrementReelViews(req.params.id);
    res.json({ success: true, data });
  })
);

// Trusted supplements
router.get('/supplements',
  optionalAuth,
  pagination,
  validate,
  asyncHandler(async (req, res) => {
    const result = await wellnessService.listSupplements(req.query, pageOf(req), limitOf(req));
    res.json({ success: true, ...result });
  })
);

router.post('/supplements/:id/suitability',
  authenticate,
  requireRole(ROLES.PATIENT),
  [param('id').isUUID('loose')],
  validate,
  asyncHandler(async (req, res) => {
    const data = await wellnessService.checkSupplementSuitability(req.user.id, req.params.id);
    res.status(201).json({ success: true, data });
  })
);

module.exports = router;
