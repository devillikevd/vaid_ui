const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const authService = require('../../services/authService');
const { asyncHandler } = require('../../middleware/errorHandler');
const { setRefreshTokenCookie, clearRefreshTokenCookie, REFRESH_COOKIE } = require('../../utils/authCookies');

const router = express.Router();

// Fix #19: Redis-backed atomic rate limiter for sensitive auth routes
const { cacheIncr, getConnectionState } = require('../../middleware/mongoSanitizer').mongoSanitizer ? require('../../config/redis') : require('../../config/redis'); // Just ensuring imports
const authRateLimit = (maxAttempts, windowSeconds, keyPrefix) => {
  return asyncHandler(async (req, res, next) => {
    // Fail-Open strategy: If Redis is disconnected, log warning but allow request
    // This prevents 503 errors from blocking users during local network issues
    if (!getConnectionState()) {
      console.warn(`[RateLimit] Redis unavailable, skipping limit check for ${keyPrefix}`);
      return next();
    }

    const identifier = req.body.email || req.ip;
    const key = `ratelimit:${keyPrefix}:${identifier}`;

    // MED-01 Fix: Use atomic increment (INCR + EXPIRE) to prevent race conditions
    try {
      const current = await cacheIncr(key, windowSeconds);

      if (current !== null && current > maxAttempts) {
        return res.status(429).json({
          success: false,
          message: `Too many attempts. Please try again in ${Math.max(1, Math.ceil(windowSeconds / 60))} minute${windowSeconds > 60 ? 's' : ''}.`,
        });
      }
      next();
    } catch (err) {
      console.error(`[RateLimit] Atomic check failed: ${err.message}. Proceeding...`);
      next();
    }
  });
};

// Register
router.post('/register',
  authRateLimit(8, 600, 'register'), // 8 attempts per 10 minutes
  [
    body('email').trim().isEmail().toLowerCase().withMessage('Valid email is required'),
    body('phone').optional({ values: 'falsy' }).trim().isMobilePhone().withMessage('Valid phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().escape().withMessage('Name is required'),
    body('role').optional().isIn([
      'patient',
      'doctor',
      'hospital_owner',
      'clinic_owner',
      'pharmacy_owner',
      'ambulance_operator',
      'wellness_coach',
      'fitness_center_owner',
      'diagnostic_center_owner'
    ]).withMessage('Invalid role'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // Prevent mass assignment of critical system fields
    delete req.body.id;
    delete req.body.user_id;
    delete req.body.is_verified;
    delete req.body.is_active;
    delete req.body.is_approved;
    delete req.body.approval_status;
    delete req.body.created_at;

    // Enforce "Dr. " prefix for doctors
    if (req.body.role === 'doctor' && req.body.name) {
      let trimmed = req.body.name.trim();
      let lower = trimmed.toLowerCase();
      if (!lower.startsWith('dr.') && !lower.startsWith('dr ')) {
        req.body.name = `Dr. ${trimmed}`;
      } else {
        req.body.name = trimmed;
      }
    }
    
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result,
    });
  })
);

// Login
router.post('/login',
  authRateLimit(15, 900, 'login'), // 15 attempts per 15 min
  [
    body('email').trim().isEmail().toLowerCase().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').optional().isIn([
      'patient',
      'doctor',
      'hospital_owner',
      'hospital_manager',
      'clinic_owner',
      'pharmacy_owner',
      'ambulance_operator',
      'ambulance_driver',
      'wellness_coach',
      'fitness_center_owner',
      'diagnostic_center_owner',
      'admin',
      'super_admin',
    ]).withMessage('Invalid role'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    const result = await authService.login(email, password, role);
    // M001/M014: Refresh token rides in an HttpOnly+Secure cookie so client JS
    // never reads or stores it (memory/localStorage/cookies are all JS-visible).
    setRefreshTokenCookie(res, req, result.refreshToken);
    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  })
);

// Verify email
router.get('/verify-email',
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }
    const result = await authService.verifyEmail(token);
    res.json({
      success: true,
      ...result,
    });
  })
);

router.post('/verify-email-otp',
  authRateLimit(10, 600, 'verify-otp'),
  [
    body('email').trim().isEmail().toLowerCase().withMessage('Valid email is required'),
    body('otp').trim().matches(/^\d{6}$/).withMessage('A valid 6-digit OTP is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.verifyEmailOtp(req.body.email, req.body.otp);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Resend verification email
router.post('/resend-verification',
  authRateLimit(5, 600, 'resend'), // 5 attempts per 10 min
  [
    body('email').trim().isEmail().toLowerCase().withMessage('Valid email is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.resendVerification(req.body.email);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Refresh token
router.post('/refresh-token',
  [
    body('refreshToken').optional().notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    // M001/M014: prefer the HttpOnly cookie; fall back to body for mobile/legacy.
    const token = req.body.refreshToken || req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }
    const result = await authService.refreshToken(token);
    // Rotate the HttpOnly cookie to the new refresh token on every refresh.
    setRefreshTokenCookie(res, req, result.refreshToken);
    res.json({
      success: true,
      data: result,
    });
  })
);

// Logout
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const cookieToken = req.cookies?.[REFRESH_COOKIE];
    const result = await authService.logout(req.user.id, refreshToken || cookieToken);
    clearRefreshTokenCookie(res, req);
    req.app.get('io')?.forceDisconnect?.(req.user.id);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Change password
router.post('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    req.app.get('io')?.forceDisconnect?.(req.user.id);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Forgot password
router.post('/forgot-password',
  authRateLimit(5, 900, 'forgot'), // 5 attempts per 15 minutes
  [
    body('email').trim().isEmail().toLowerCase().withMessage('Valid email is required'),
    body('role').optional().isIn([
      'patient',
      'doctor',
      'hospital_owner',
      'hospital_manager',
      'clinic_owner',
      'pharmacy_owner',
      'ambulance_operator',
      'ambulance_driver',
      'wellness_coach',
      'fitness_center_owner',
      'diagnostic_center_owner',
      'admin',
      'super_admin',
    ]).withMessage('Invalid role'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email, req.body.role);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Reset password
router.post('/reset-password',
  authRateLimit(8, 900, 'reset'), // 8 attempts per 15 minutes
  [
    body('token').optional().isString(),
    body('email').optional().trim().isEmail().toLowerCase().withMessage('Valid email is required'),
    body('otp').optional().trim().matches(/^\d{6}$/).withMessage('A valid 6-digit OTP is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn([
      'patient',
      'doctor',
      'hospital_owner',
      'hospital_manager',
      'clinic_owner',
      'pharmacy_owner',
      'ambulance_operator',
      'ambulance_driver',
      'wellness_coach',
      'fitness_center_owner',
      'diagnostic_center_owner',
      'admin',
      'super_admin',
    ]).withMessage('Invalid role'),
    body().custom((value) => {
      if (value?.token) return true;
      if (value?.email && value?.otp) return true;
      throw new Error('Either a reset token or email + OTP is required');
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Get current user
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: req.user,
    });
  })
);

// Update current user profile
router.put('/me',
  authenticate,
  [
    body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
    body('phone').optional({ values: 'falsy' }).isMobilePhone().withMessage('Valid phone number is required'),
    body('companyName').optional().isString().trim().isLength({ max: 150 }).withMessage('Company name must be 150 characters or less'),
    body('company_name').optional().isString().trim().isLength({ max: 150 }).withMessage('Company name must be 150 characters or less'),
    body('registrationNumber').optional().isString().trim().isLength({ max: 100 }).withMessage('Registration number must be 100 characters or less'),
    body('registration_number').optional().isString().trim().isLength({ max: 100 }).withMessage('Registration number must be 100 characters or less'),
    body('address').optional().isString().trim().isLength({ max: 255 }).withMessage('Address must be 255 characters or less'),
    body('city').optional().isString().trim().isLength({ max: 100 }).withMessage('City must be 100 characters or less'),
    body('state').optional().isString().trim().isLength({ max: 100 }).withMessage('State must be 100 characters or less'),
    body('alternatePhone').optional({ values: 'falsy' }).isMobilePhone().withMessage('Valid alternate phone number is required'),
    body('alternate_phone').optional({ values: 'falsy' }).isMobilePhone().withMessage('Valid alternate phone number is required'),
    body('licenseDocumentUrl').optional().isString().trim().isLength({ max: 1000 }).withMessage('License document URL is too long'),
    body('license_document_url').optional().isString().trim().isLength({ max: 1000 }).withMessage('License document URL is too long'),
    body('licenseExpiry').optional().isISO8601().withMessage('License expiry must be a valid date'),
    body('license_expiry').optional().isISO8601().withMessage('License expiry must be a valid date'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.updateProfile(req.user.id, req.user.role, req.body);
    res.json({ success: true, ...result });
  })
);

module.exports = router;
