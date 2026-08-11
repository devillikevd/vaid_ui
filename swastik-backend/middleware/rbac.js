/**
 * Role-Based Access Control (RBAC) Middleware
 */

// Role definitions
const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  DOCTOR_PENDING: 'doctor_pending',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  HOSPITAL_OWNER: 'hospital_owner',
  HOSPITAL_MANAGER: 'hospital_manager',
  PHARMACY_OWNER: 'pharmacy_owner',
  CLINIC_OWNER: 'clinic_owner',
  DIAGNOSTIC_CENTER_OWNER: 'diagnostic_center_owner',
  WELLNESS_COACH: 'wellness_coach',
  FITNESS_CENTER_OWNER: 'fitness_center_owner',
  AMBULANCE_OPERATOR: 'ambulance_operator',
  AMBULANCE_DRIVER: 'ambulance_driver',
};

/**
 * Middleware to require specific roles
 * Usage: requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Middleware to require a minimum role level.
 * Backward-compatible helper used by some tests/routes.
 */
const ROLE_HIERARCHY = [
  ROLES.PATIENT,
  ROLES.AMBULANCE_DRIVER,
  ROLES.DOCTOR_PENDING,
  ROLES.DOCTOR,
  ROLES.HOSPITAL_MANAGER,
  ROLES.HOSPITAL_OWNER,
  ROLES.CLINIC_OWNER,
  ROLES.DIAGNOSTIC_CENTER_OWNER,
  ROLES.WELLNESS_COACH,
  ROLES.FITNESS_CENTER_OWNER,
  ROLES.PHARMACY_OWNER,
  ROLES.AMBULANCE_OPERATOR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

const requireMinRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userRank = ROLE_HIERARCHY.indexOf(req.user.role);
    const minRank = ROLE_HIERARCHY.indexOf(minimumRole);

    if (userRank === -1 || minRank === -1 || userRank < minRank) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Minimum role required: ${minimumRole}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Middleware to require approved status for providers
 * Resolves approval_status from the relevant provider table based on role
 */
const { supabaseAdmin } = require('../config/supabase');

const ROLE_TO_TABLE = {
  [ROLES.DOCTOR]: 'doctors',
  [ROLES.DOCTOR_PENDING]: 'doctors',
  [ROLES.HOSPITAL_OWNER]: 'hospitals',
  [ROLES.HOSPITAL_MANAGER]: 'hospitals',
  [ROLES.PHARMACY_OWNER]: 'pharmacies',
  [ROLES.CLINIC_OWNER]: 'clinics',
  [ROLES.DIAGNOSTIC_CENTER_OWNER]: 'diagnostic_centers',
  [ROLES.WELLNESS_COACH]: 'wellness_coaches',
  [ROLES.FITNESS_CENTER_OWNER]: 'fitness_centers',
  [ROLES.AMBULANCE_OPERATOR]: 'ambulance_operators',
};

const ROLE_TO_USER_FIELD = {
  [ROLES.DOCTOR]: 'user_id',
  [ROLES.DOCTOR_PENDING]: 'user_id',
  [ROLES.HOSPITAL_OWNER]: 'owner_id',
  [ROLES.PHARMACY_OWNER]: 'owner_id',
  [ROLES.CLINIC_OWNER]: 'owner_id',
  [ROLES.DIAGNOSTIC_CENTER_OWNER]: 'owner_id',
  [ROLES.WELLNESS_COACH]: 'user_id',
  [ROLES.FITNESS_CENTER_OWNER]: 'owner_user_id',
  [ROLES.AMBULANCE_OPERATOR]: 'user_id',
};

const requireApproval = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  // Admins and patients don't need approval
  const skipApproval = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PATIENT, ROLES.AMBULANCE_DRIVER];
  if (skipApproval.includes(req.user.role)) {
    return next();
  }

  try {
    const table = ROLE_TO_TABLE[req.user.role];
    if (!table) {
      // Unknown provider role — fail closed for safety
      return res.status(403).json({
        success: false,
        message: 'Access denied. Unrecognized provider role.',
      });
    }

    let provider;
    if (req.user.role === ROLES.HOSPITAL_MANAGER) {
      // Hospital managers are in the hospital_managers join table, not hospitals directly
      const { data: managerEntry } = await supabaseAdmin
        .from('hospital_managers')
        .select('hospital_id')
        .eq('user_id', req.user.id)
        .single();
      if (managerEntry) {
        const { data: hospital } = await supabaseAdmin
          .from('hospitals')
          .select('approval_status')
          .eq('id', managerEntry.hospital_id)
          .single();
        provider = hospital;
      }
    } else {
      const ownerField = ROLE_TO_USER_FIELD[req.user.role];
      const { data: p } = await supabaseAdmin
        .from(table)
        .select('approval_status')
        .eq(ownerField, req.user.id)
        .single();
      provider = p;
    }

    if (!provider || provider.approval_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please wait for admin approval.',
        approval_status: provider?.approval_status || 'pending',
      });
    }

    next();
  } catch (err) {
    // DB error — fail closed for security
    console.error('Approval check failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify account status. Please try again.',
    });
  }
};

/**
 * L015: require MFA for admin/super_admin access.
 * Enforcement is gated by the ADMIN_MFA_REQUIRED env flag (default off so the
 * current non-MFA deployment keeps working). When enabled, admin access tokens
 * must carry an `mfa` claim (issued after a TOTP challenge) or the request is
 * rejected. Audit-log the denial so enablement is observable.
 */
const { asyncLocalStorage } = require('../utils/asyncContext');

const isAdminRole = (role) => role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

const requireMfa = (req, res, next) => {
  if (!process.env.ADMIN_MFA_REQUIRED || process.env.ADMIN_MFA_REQUIRED !== 'true') {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!isAdminRole(req.user.role)) {
    return next(); // MFA requirement only applies to admin roles
  }

  if (req.user.mfa !== true && req.mfaVerified !== true) {
    try {
      const logAudit = require('../utils/auditLogger').logAudit;
      const token = asyncLocalStorage.getStore()?.token;
      logAudit({
        userId: req.user.id,
        userRole: req.user.role,
        action: 'admin.mfa_denied',
        entityType: 'user',
        entityId: req.user.id,
        metadata: { path: req.originalUrl, method: req.method },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        token,
      }).catch(() => {});
    } catch { /* audit failure must not break the security response */ }
    return res.status(403).json({
      success: false,
      message: 'Multi-factor authentication is required for admin access.',
      code: 'MFA_REQUIRED',
    });
  }

  next();
};

module.exports = { ROLES, requireRole, requireMinRole, requireApproval, requireMfa, isAdminRole };
