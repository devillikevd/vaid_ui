/**
 * CVE-002: mint a short-lived token for the FastAPI AI service.
 *
 * When a dedicated JWT_AI_SERVICE_SECRET is configured, the token is signed
 * with that secret and bound to the AI audience (type:"ai") so a compromise of
 * the AI service can never forge backend access tokens. Legacy deployments
 * (no dedicated secret) fall back to the access secret + backend audience
 * (type:"access"), which the AI service still accepts.
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

const mintAiServiceToken = (userId, role) => {
  const useDedicatedSecret = Boolean(config.jwt.aiServiceSecret);
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      userId,
      id: userId,
      sub: String(userId),
      role,
      type: useDedicatedSecret ? 'ai' : 'access',
      aud: useDedicatedSecret ? config.jwt.aiServiceAudience : config.jwt.audience,
      iss: config.jwt.issuer,
      iat: now,
    },
    useDedicatedSecret ? config.jwt.aiServiceSecret : config.jwt.accessSecret,
    { expiresIn: '1m' }
  );
};

module.exports = { mintAiServiceToken };
