const { ROLES } = require('../middleware/rbac');

/**
 * sourceAttributionService.js
 * 
 * Determines the canonical source of a transaction based on trusted server context.
 * 
 * Canonical sources:
 * - vaididea_app
 * - vaididea_web
 * - clinic_referral
 * - hospital_referral
 * - doctor_referral
 * - affiliate
 * - direct_walk_in
 * - direct_phone
 * - unknown
 */

/**
 * Resolves the trusted acquisition source based on request context.
 * 
 * @param {Object} context - The trusted request context.
 * @param {string} [context.role] - The authenticated user's role.
 * @param {string} [context.clientApp] - Trusted client identifier (e.g., 'ios', 'android', 'web').
 * @param {string} [context.b2bOrigin] - Originating entity type if a B2B flow ('clinic', 'hospital', 'doctor', 'affiliate').
 * @param {string} [context.providerInput] - Explicit provider indication for manual flows ('phone', 'walk_in').
 * @returns {string} The resolved canonical source.
 */
function resolveAcquisitionSource(context = {}) {
  const { role, clientApp, b2bOrigin, providerInput } = context;

  // 1. B2B / Referrals (Explicit server-side B2B routing)
  if (b2bOrigin === 'clinic') return 'clinic_referral';
  if (b2bOrigin === 'hospital') return 'hospital_referral';
  if (b2bOrigin === 'doctor') return 'doctor_referral';
  if (b2bOrigin === 'affiliate') return 'affiliate';

  // 2. Patient Direct
  if (role === ROLES.PATIENT) {
    // If the clientApp is mobile apps, it's vaididea_app. Otherwise web.
    return (clientApp === 'ios' || clientApp === 'android') ? 'vaididea_app' : 'vaididea_web';
  }

  // 3. Provider Manual / POS
  const isProvider = role === ROLES.CLINIC_OWNER || 
                     role === ROLES.HOSPITAL_OWNER || 
                     role === ROLES.HOSPITAL_MANAGER ||
                     role === ROLES.PHARMACY_OWNER ||
                     role === ROLES.PHARMACY_MANAGER ||
                     role === ROLES.PHARMACY_STAFF ||
                     role === ROLES.DIAGNOSTIC_CENTER_OWNER ||
                     role === ROLES.DOCTOR;

  if (isProvider) {
    return providerInput === 'phone' ? 'direct_phone' : 'direct_walk_in';
  }

  // 4. Unknown
  return 'unknown';
}

/**
 * Temporarily maps the canonical source back to a legacy database value.
 * Used to avoid breaking constraints before Migration 093 is applied.
 * 
 * @param {string} canonicalSource - The resolved canonical source.
 * @param {string} portalType - The portal type ('pharmacy', 'diagnostic').
 * @returns {string|undefined} The database-compatible source.
 */
function getLegacyDatabaseSource(canonicalSource, portalType) {
  if (portalType === 'pharmacy') {
    if (['direct_walk_in', 'direct_phone'].includes(canonicalSource)) {
      return 'pos';
    }
    return 'online';
  }
  
  if (portalType === 'diagnostic') {
    if (['vaididea_app', 'vaididea_web', 'affiliate', 'unknown'].includes(canonicalSource)) {
      return 'online';
    }
    if (['direct_walk_in', 'direct_phone'].includes(canonicalSource)) {
      return 'walk_in';
    }
    // clinic_referral and hospital_referral are supported in diagnostic_bookings currently
    return canonicalSource; 
  }

  // Appointments have no source column yet
  return undefined;
}

/**
 * Prepares the canonical context object for future analytics and persistence.
 * 
 * @param {Object} params
 * @param {string} params.source
 * @param {string|null} params.sourceId
 * @param {string} params.mode
 * @param {string} params.portal
 * @param {string} params.transactionType
 * @returns {Object} The canonical context object
 */
function buildCanonicalContext({ source, sourceId = null, mode, portal, transactionType }) {
  return {
    source,
    source_id: sourceId,
    mode,
    portal,
    transactionType
  };
}

module.exports = {
  resolveAcquisitionSource,
  getLegacyDatabaseSource,
  buildCanonicalContext
};
