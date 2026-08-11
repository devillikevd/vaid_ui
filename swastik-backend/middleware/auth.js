/**
 * Authentication Middleware
 * JWT-based authentication for all API routes
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { supabaseAdmin } = require('../config/supabase');
const { cacheGet, cacheSet } = require('../config/redis');
const { enrichAuthUser, requiresAuthUserEnrichment } = require('../utils/authUserEnrichment');
const { asyncLocalStorage } = require('../utils/asyncContext');

/**
 * Authenticate middleware - verifies JWT token and attaches user to request
 *
 * CVE-002: verifies against the access secret OR the dedicated AI-service
 * secret. Tokens signed with the AI-service secret must carry type:"ai" and
 * are only accepted for authentication (they cannot forge backend-only flows
 * beyond their short TTL and audience).
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT — I12: use accessSecret for access tokens
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret, { algorithms: ['HS256'] });
    } catch (accessErr) {
      // Fall back to the dedicated AI-service secret (CVE-002) so the AI
      // service's ownership-check callbacks can authenticate with ai tokens.
      if (config.jwt.aiServiceSecret) {
        decoded = jwt.verify(token, config.jwt.aiServiceSecret, { algorithms: ['HS256'] });
        if (decoded.type && decoded.type !== 'ai') {
          return res.status(401).json({ success: false, message: 'Invalid token type.' });
        }
      } else {
        throw accessErr;
      }
    }

    // Reject non-access tokens (email_verification, password_reset, refresh)
    if (decoded.type && decoded.type !== 'access' && decoded.type !== 'ai') {
      return res.status(401).json({ success: false, message: 'Invalid token type.' });
    }

    // Try Redis cache first, then Supabase
    const cacheKey = `auth_user:${decoded.userId || decoded.id}`;
    let user = await cacheGet(cacheKey);

    if (!user) {
      console.log('Querying Supabase for user id:', decoded.userId || decoded.id);
      const { data: dbUser, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, phone, role, is_active, is_verified, profile_image_url, token_version')
        .eq('id', decoded.userId || decoded.id)
        .single();
      console.log('Supabase result - dbUser:', dbUser ? dbUser.id : null, 'error:', error);

      if (error || !dbUser) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.',
        });
      }
      user = dbUser;
    }

    const tokenVersion = Number(decoded.tokenVersion || 0);
    if (Number(user.token_version || 0) !== tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session has been revoked. Please log in again.',
        code: 'TOKEN_REVOKED',
      });
    }

    if (requiresAuthUserEnrichment(user.role) && user.approval_status === undefined) {
      user = await enrichAuthUser(user, supabaseAdmin);
    }

    // Cache for 60 seconds (reduced from 5 minutes to limit stale data after deactivation)
    await cacheSet(cacheKey, user, 60);

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact support.',
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      profile_image_url: user.profile_image_url,
      approval_status: user.approval_status,
      approval_notes: user.approval_notes,
      provider_id: user.provider_id,
      // L015: MFA state rides the JWT (set after a TOTP challenge) so admin
      // gating in requireMfa can enforce it without a DB round-trip.
      mfa: decoded.mfa === true,
      company_name: user.company_name,
      registration_number: user.registration_number,
      address: user.address,
      city: user.city,
      state: user.state,
      alternate_phone: user.alternate_phone,
      provider_email: user.provider_email,
      license_document_url: user.license_document_url,
      license_expiry: user.license_expiry,
      token_version: Number(user.token_version || 0),
    };

    asyncLocalStorage.run({ user: req.user, token }, () => {
      next();
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

/**
 * Optional authentication - attaches user if token exists, continues otherwise
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return asyncLocalStorage.run({ user: null, token: null }, () => {
        next();
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret, { algorithms: ['HS256'] });
    } catch (accessErr) {
      if (config.jwt.aiServiceSecret) {
        decoded = jwt.verify(token, config.jwt.aiServiceSecret, { algorithms: ['HS256'] });
        if (decoded.type && decoded.type !== 'ai') {
          req.user = null;
          return asyncLocalStorage.run({ user: null, token: null }, () => next());
        }
      } else {
        throw accessErr;
      }
    }
    if (decoded.type && decoded.type !== 'access' && decoded.type !== 'ai') {
      req.user = null;
      return asyncLocalStorage.run({ user: null, token: null }, () => next());
    }

    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, name, phone, role, is_active, is_verified, token_version')
      .eq('id', decoded.userId || decoded.id)
      .single();

    if (user && requiresAuthUserEnrichment(user.role)) {
      user = await enrichAuthUser(user, supabaseAdmin);
    }

    // Don't attach deactivated users even in optional auth
    const versionMatches = user && Number(user.token_version || 0) === Number(decoded.tokenVersion || 0);
    req.user = (user && user.is_active && user.is_verified && versionMatches) ? user : null;
    asyncLocalStorage.run({ user: req.user, token }, () => {
      next();
    });
  } catch {
    req.user = null;
    asyncLocalStorage.run({ user: null, token: null }, () => {
      next();
    });
  }
};

/**
 * Authorize by role - simple role check, use after authenticate
 */
const authorize = (...roles) => {
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
        message: 'You do not have permission to access this resource.',
      });
    }
    next();
  };
};

module.exports = { authenticate, optionalAuth, authorize };
