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
  PHARMACY_MANAGER: 'pharmacy_manager',
  PHARMACY_STAFF: 'pharmacy_staff',
  CLINIC_OWNER: 'clinic_owner',
  DIAGNOSTIC_CENTER_OWNER: 'diagnostic_center_owner',
  DIAGNOSTIC_MANAGER: 'diagnostic_manager',
  LAB_TECHNICIAN: 'lab_technician',
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
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
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
  ROLES.LAB_TECHNICIAN,
  ROLES.DIAGNOSTIC_MANAGER,
  ROLES.DIAGNOSTIC_CENTER_OWNER,
  ROLES.WELLNESS_COACH,
  ROLES.FITNESS_CENTER_OWNER,
  ROLES.PHARMACY_STAFF,
  ROLES.PHARMACY_MANAGER,
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
  [ROLES.PHARMACY_MANAGER]: 'pharmacies', // approval checked via linked pharmacy
  [ROLES.PHARMACY_STAFF]: 'pharmacies',   // approval checked via linked pharmacy
  [ROLES.CLINIC_OWNER]: 'clinics',
  [ROLES.DIAGNOSTIC_CENTER_OWNER]: 'diagnostic_centers',
  [ROLES.DIAGNOSTIC_MANAGER]: 'diagnostic_centers',
  [ROLES.LAB_TECHNICIAN]: 'diagnostic_centers',
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
    } else if (req.user.role === ROLES.PHARMACY_MANAGER || req.user.role === ROLES.PHARMACY_STAFF) {
      // Pharmacy members: resolve via pharmacy_members → pharmacies
      const { data: memberEntry } = await supabaseAdmin
        .from('pharmacy_members')
        .select('pharmacy_id, status')
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (memberEntry) {
        const { data: pharmacy } = await supabaseAdmin
          .from('pharmacies')
          .select('approval_status')
          .eq('id', memberEntry.pharmacy_id)
          .single();
        provider = pharmacy;
      } else {
        // No active membership found
        return res.status(403).json({
          success: false,
          message: 'Your pharmacy membership is not active. Contact your pharmacy owner.',
        });
      }
    } else if (req.user.role === ROLES.DIAGNOSTIC_MANAGER || req.user.role === ROLES.LAB_TECHNICIAN) {
      const { data: memberEntry } = await supabaseAdmin
        .from('diagnostic_members')
        .select('diagnostic_center_id, status')
        .eq('user_id', req.user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (memberEntry) {
        const { data: center } = await supabaseAdmin
          .from('diagnostic_centers')
          .select('approval_status')
          .eq('id', memberEntry.diagnostic_center_id)
          .single();
        provider = center;
      } else {
        return res.status(403).json({
          success: false,
          message: 'Your diagnostic center membership is not active. Contact your center owner.',
        });
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

/**
 * requirePharmacyMember — live membership check for pharmacy_manager and pharmacy_staff.
 *
 * For every protected Pharmacy API call, this middleware:
 * 1. Resolves the pharmacy context: owner → via pharmacies.owner_id; member → via pharmacy_members.
 * 2. Verifies the membership status is 'active' (not invited/suspended/removed).
 * 3. Attaches req.pharmacyId so downstream handlers never trust frontend-supplied pharmacyId.
 *
 * pharmacy_owner: uses pharmacies.owner_id (no pharmacy_members row required — backward compatible).
 * pharmacy_manager / pharmacy_staff: requires an 'active' row in pharmacy_members.
 *
 * Constraint enforcement:
 * - pharmacyId is NEVER read from req.body or req.params.
 * - Role escalation is impossible: only the role in req.user (from verified JWT) is used.
 */
const requirePharmacyMember = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user || {};

    if (role === ROLES.PHARMACY_OWNER) {
      // Owner path: resolve pharmacy directly from owner_id
      const { data: pharmacy, error } = await supabaseAdmin
        .from('pharmacies')
        .select('id, is_active, approval_status')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error || !pharmacy) {
        return res.status(404).json({ success: false, message: 'Pharmacy not found for this owner.' });
      }
      if (!pharmacy.is_active) {
        return res.status(403).json({ success: false, message: 'Pharmacy account is deactivated.' });
      }

      req.pharmacyId = pharmacy.id;
      req.pharmacyApprovalStatus = pharmacy.approval_status;
      return next();
    }

    if (role === ROLES.PHARMACY_MANAGER || role === ROLES.PHARMACY_STAFF) {
      // Member path: live status check — no caching to ensure revoked/suspended is caught immediately
      const { data: member, error: memberError } = await supabaseAdmin
        .from('pharmacy_members')
        .select('pharmacy_id, status, member_role')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError || !member) {
        return res.status(403).json({
          success: false,
          message: 'Pharmacy membership not found. Contact your pharmacy owner.',
        });
      }

      if (member.status !== 'active') {
        const statusMessages = {
          invited: 'Your invitation is pending acceptance.',
          suspended: 'Your pharmacy access has been suspended.',
          removed: 'Your pharmacy access has been removed.',
        };
        return res.status(403).json({
          success: false,
          message: statusMessages[member.status] || 'Pharmacy access denied.',
          code: 'PHARMACY_MEMBER_INACTIVE',
        });
      }

      // Verify the linked pharmacy is still active and approved
      const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
        .from('pharmacies')
        .select('id, is_active, approval_status')
        .eq('id', member.pharmacy_id)
        .maybeSingle();

      if (pharmacyError || !pharmacy) {
        return res.status(404).json({ success: false, message: 'Linked pharmacy not found.' });
      }
      if (!pharmacy.is_active) {
        return res.status(403).json({ success: false, message: 'Pharmacy account is deactivated.' });
      }

      req.pharmacyId = pharmacy.id;
      req.pharmacyMemberRole = member.member_role; // 'manager' or 'staff'
      req.pharmacyApprovalStatus = pharmacy.approval_status;
      return next();
    }

    // Role not permitted for pharmacy operations
    return res.status(403).json({
      success: false,
      message: 'Access denied. Pharmacy role required.',
    });
  } catch (err) {
    console.error('requirePharmacyMember error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify pharmacy access. Please try again.',
    });
  }
};

/**
 * requireDiagnosticMember — live membership check for diagnostic_manager and lab_technician.
 */
const requireDiagnosticMember = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user || {};

    if (role === ROLES.DIAGNOSTIC_CENTER_OWNER) {
      const { data: center, error } = await supabaseAdmin
        .from('diagnostic_centers')
        .select('id, is_active, approval_status')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error || !center) {
        return res.status(404).json({ success: false, message: 'Diagnostic Center not found for this owner.' });
      }
      if (!center.is_active) {
        return res.status(403).json({ success: false, message: 'Diagnostic Center account is deactivated.' });
      }

      req.diagnosticCenterId = center.id;
      req.diagnosticApprovalStatus = center.approval_status;
      return next();
    }

    if (role === ROLES.DIAGNOSTIC_MANAGER || role === ROLES.LAB_TECHNICIAN) {
      const { data: member, error: memberError } = await supabaseAdmin
        .from('diagnostic_members')
        .select('diagnostic_center_id, status, member_role')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError || !member) {
        return res.status(403).json({
          success: false,
          message: 'Diagnostic Center membership not found. Contact your center owner.',
        });
      }

      if (member.status !== 'active') {
        const statusMessages = {
          invited: 'Your invitation is pending acceptance.',
          suspended: 'Your diagnostic center access has been suspended.',
          removed: 'Your diagnostic center access has been removed.',
        };
        return res.status(403).json({
          success: false,
          message: statusMessages[member.status] || 'Diagnostic center access denied.',
          code: 'DIAGNOSTIC_MEMBER_INACTIVE',
        });
      }

      const { data: center, error: centerError } = await supabaseAdmin
        .from('diagnostic_centers')
        .select('id, is_active, approval_status')
        .eq('id', member.diagnostic_center_id)
        .maybeSingle();

      if (centerError || !center) {
        return res.status(404).json({ success: false, message: 'Linked diagnostic center not found.' });
      }
      if (!center.is_active) {
        return res.status(403).json({ success: false, message: 'Diagnostic Center account is deactivated.' });
      }

      req.diagnosticCenterId = center.id;
      req.diagnosticMemberRole = member.member_role; // 'manager' or 'lab_technician'
      req.diagnosticApprovalStatus = center.approval_status;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Diagnostic Center role required.',
    });
  } catch (err) {
    console.error('requireDiagnosticMember error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to verify diagnostic center access. Please try again.',
    });
  }
};

module.exports = { ROLES, requireRole, requireMinRole, requireApproval, requireMfa, isAdminRole, requirePharmacyMember, requireDiagnosticMember };
