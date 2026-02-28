const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const authService = require('../../services/authService');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// Register
router.post('/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn([
      'patient',
      'doctor',
      'hospital_owner',
      'clinic_owner',
      'pharmacy_owner',
      'ambulance_operator',
      'diagnostic_center_owner'
    ]).withMessage('Invalid role'),
  ],
  validate,
  asyncHandler(async (req, res) => {
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
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
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

// Resend verification email
router.post('/resend-verification',
  [
    body('email').isEmail().withMessage('Valid email is required'),
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
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);
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
    const result = await authService.logout(req.user.id, refreshToken);
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
    res.json({
      success: true,
      ...result,
    });
  })
);

// Forgot password
router.post('/forgot-password',
  [
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body.email);
    res.json({
      success: true,
      ...result,
    });
  })
);

// Reset password
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
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
  asyncHandler(async (req, res) => {
    const { supabaseAdmin } = require('../../config/supabase');
    const { name, phone } = req.body;

    if (!name && !phone) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    // Update phone on users table if provided
    if (phone) {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ phone })
        .eq('id', req.user.id);
      if (error) throw error;
    }

    // Update name in role-specific table if provided
    if (name) {
      const roleTableMap = {
        patient: { table: 'patients', col: 'user_id' },
        doctor: { table: 'doctors', col: 'user_id' },
        hospital_owner: { table: 'users', col: 'id' },
        hospital_manager: { table: 'hospital_managers', col: 'user_id' },
        pharmacy_owner: { table: 'users', col: 'id' },
        clinic_owner: { table: 'users', col: 'id' },
        diagnostic_center_owner: { table: 'users', col: 'id' },
        ambulance_operator: { table: 'ambulance_operators', col: 'user_id' },
        ambulance_driver: { table: 'users', col: 'id' },
        admin: { table: 'admins', col: 'user_id' },
        super_admin: { table: 'admins', col: 'user_id' },
      };
      const mapping = roleTableMap[req.user.role];
      if (mapping) {
        await supabaseAdmin.from(mapping.table).update({ name }).eq(mapping.col, req.user.id);
      }
    }

    res.json({ success: true, message: 'Profile updated' });
  })
);

module.exports = router;
