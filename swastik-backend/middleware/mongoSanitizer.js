/**
 * MongoDB Operator Sanitizer Middleware (INJ-01)
 * Strips all keys starting with `$` or containing `.` from req.body, req.query, and req.params
 * to prevent NoSQL Operator Injection.
 */

const isPlainObject = (obj) => {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && obj.constructor === Object;
};

const sanitizeObj = (obj) => {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      if (isPlainObject(v) || Array.isArray(v)) {
        sanitizeObj(v);
      }
    });
    return obj;
  }

  if (isPlainObject(obj)) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith('$') || key.includes('.')) {
          // Remove the malicious key
          delete obj[key];
        } else {
          // Recursively sanitize
          if (isPlainObject(obj[key]) || Array.isArray(obj[key])) {
            sanitizeObj(obj[key]);
          }
        }
      }
    }
  }

  return obj;
};

const mongoSanitizer = (req, res, next) => {
  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) req.query = sanitizeObj(req.query);
  if (req.params) req.params = sanitizeObj(req.params);
  next();
};

module.exports = mongoSanitizer;
