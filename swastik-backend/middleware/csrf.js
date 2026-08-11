/**
 * CSRF / Cross-Site Request Forgery protection.
 *
 * The API authenticates via `Authorization: Bearer <token>` (never cookies),
 * so classic cookie-based CSRF is not exploitable. This middleware is
 * defense-in-depth (H001): for every state-changing request that carries an
 * Origin header, the origin must match the configured frontend allowlist.
 * Requests with no Origin (curl, mobile apps, server-to-server, same-origin
 * GET navigation) are allowed — there is nothing to cross-check.
 */
const config = require('../config');

const withApexAndWww = (value) => {
  if (!value || !/^https?:\/\//i.test(value)) return [value].filter(Boolean);
  try {
    const url = new URL(value);
    const variants = [url.toString().replace(/\/$/, '')];
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      variants.push(url.toString().replace(/\/$/, ''));
    } else {
      url.hostname = `www.${url.hostname}`;
      variants.push(url.toString().replace(/\/$/, ''));
    }
    return variants;
  } catch {
    return [value];
  }
};

const ALLOWED_ORIGINS = new Set([
  ...withApexAndWww(config.frontendWebUrl),
  ...withApexAndWww(config.frontendDoctorWebUrl),
  config.frontendAppUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://10.0.2.2:3000',
  'http://10.0.2.2:5001',
].filter(Boolean));

const isTrustedOrigin = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (config.env === 'development' && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (
    config.env === 'development' &&
    /^http:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/.test(origin)
  ) {
    return true;
  }
  return false;
};

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const csrfProtection = (req, res, next) => {
  if (!STATE_CHANGING_METHODS.has(req.method)) return next();
  const origin = req.headers.origin || req.headers['x-forwarded-origin'];
  if (!origin) return next();

  if (!isTrustedOrigin(origin)) {
    return res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked.',
      code: 'CSRF_BLOCKED',
    });
  }
  return next();
};

module.exports = { csrfProtection, isTrustedOrigin };
