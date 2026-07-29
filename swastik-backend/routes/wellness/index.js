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
