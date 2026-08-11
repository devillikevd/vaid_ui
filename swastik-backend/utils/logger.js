const winston = require('winston');

const redactSensitiveInfo = winston.format((info) => {
  const sensitiveKeys = ['password', 'token', 'secret', 'aadhar', 'abha', 'otp', 'credit_card', 'refreshToken', 'accessToken'];
  
  const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const result = Array.isArray(obj) ? [] : {};
    
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        result[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = redact(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  };

  // If the message is an object (e.g. logger.info({ token: "..." })), redact it.
  if (info.message && typeof info.message === 'object') {
    info.message = redact(info.message);
  }
  
  // Redact metadata properties directly on the info object
  for (const key of Object.keys(info)) {
    if (key !== 'level' && key !== 'message' && key !== 'timestamp' && key !== Symbol.for('level') && key !== Symbol.for('message') && key !== Symbol.for('splat')) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        info[key] = '[REDACTED]';
      } else if (typeof info[key] === 'object' && info[key] !== null) {
        info[key] = redact(info[key]);
      }
    }
  }

  return info;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    redactSensitiveInfo(),
    process.env.NODE_ENV === 'production' 
      ? winston.format.json() 
      : winston.format.simple()
  ),
  defaultMeta: { service: 'swastik-backend' },
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
