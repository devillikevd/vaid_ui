const consentService = require('../services/consentService');

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
        return res.status(400).json({ success: false, message: 'Missing patient or entity ID for consent verification' });
      }

      const hasConsent = await consentService.verifyConsent(patientId, entityType, entityId);

      if (!hasConsent) {
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
