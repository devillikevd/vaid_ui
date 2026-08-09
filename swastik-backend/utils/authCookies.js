/**
 * Auth cookie helpers (M001/M014):
 * The refresh token is set as an HttpOnly, SameSite=Strict cookie so it is
 * never exposed to client-side JavaScript (no localStorage / document.cookie
 * access). The `Secure` attribute is applied in production so it is only
 * transmitted over HTTPS.
 */
const config = require('./index');

const REFRESH_COOKIE = 'swastik-refresh-token';

const isSecureRequest = (req) => {
  if (config.env === 'production') return true;
  const proto = req.headers['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http');
  return String(proto).split(',')[0].trim() === 'https';
};

const baseCookieOptions = (req, maxAgeSeconds) => {
  const opts = {
    httpOnly: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };
  if (isSecureRequest(req)) opts.secure = true;
  return opts;
};

const setRefreshTokenCookie = (res, req, refreshToken) => {
  res.cookie(REFRESH_COOKIE, refreshToken, baseCookieOptions(req, 30 * 24 * 60 * 60));
};

const clearRefreshTokenCookie = (res, req) => {
  const opts = { httpOnly: true, sameSite: 'Strict', path: '/' };
  if (isSecureRequest(req)) opts.secure = true;
  res.clearCookie(REFRESH_COOKIE, opts);
};

module.exports = {
  REFRESH_COOKIE,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  isSecureRequest,
};
