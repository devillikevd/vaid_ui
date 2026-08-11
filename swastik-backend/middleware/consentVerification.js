const consentService = require('../services/consentService');
const { logAudit } = require('../utils/auditLogger');

/**
 * Middleware to verify if the logged in third-party entity has active consent 
 * from the patient to access their PHI.
 * 
 * @param {string} entityType - The type of entity (e.g. 'hospital', 'pharmacy', 'diagnostic_center')
 * @param {Function} getPatientId - A function that extracts the patientId from the request object
 * @param {Function} getEntityId - A function that extracts the entityId from the request object (usually req.user.id or mapped via DB)
 */
const requireConsent = (entityType, getPatientId, getEntityId) => {
  return async (req, res, next) => {
    try {
      const patientId = await getPatientId(req);
      const entityId = await getEntityId(req);

      if (!patientId || !entityId) {
        // M008: record the denied attempt for audit/forensics.
        logAudit({
          userId: req.user?.id,
          userRole: req.user?.role,
          action: 'consent.denied',
          entityType,
          entityId: patientId || null,
          metadata: {
            reason: 'missing_patient_or_entity_id',
            attemptedEntityId: entityId || null,
            path: req.originalUrl,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(400).json({ success: false, message: 'Missing patient or entity ID for consent verification' });
      }

      const hasConsent = await consentService.verifyConsent(patientId, entityType, entityId);

      if (!hasConsent) {
        // M008: denied consent attempts must be logged for security auditing.
        logAudit({
          userId: req.user?.id,
          userRole: req.user?.role,
          action: 'consent.denied',
          entityType,
          entityId: patientId,
          metadata: {
            reason: 'no_active_consent',
            requestingEntityId: entityId,
            path: req.originalUrl,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
        return res.status(403).json({ 
          success: false, 
          message: 'Access Denied: The patient has not granted or has revoked consent for this action.' 
        });
      }

      // Consent is active and verified
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  requireConsent
};
