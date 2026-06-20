/**
 * HTML Sanitizer Middleware (INJ-02 & INJ-05)
 * Sanitizes all user-generated string inputs to prevent XSS.
 */
const DOMPurify = require('isomorphic-dompurify');

const isPlainObject = (obj) => {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj) && obj.constructor === Object;
};

const sanitizeHtmlRecursive = (obj) => {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'ol'],
      ALLOWED_ATTR: ['href']
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeHtmlRecursive(v));
  }

  if (isPlainObject(obj)) {
    const sanitizedObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeHtmlRecursive(obj[key]);
      }
    }
    return sanitizedObj;
  }

  return obj;
};

const htmlSanitizer = (req, res, next) => {
  // We only sanitize req.body strings to prevent XSS injection via text fields.
  if (req.body) {
    req.body = sanitizeHtmlRecursive(req.body);
  }
  next();
};

module.exports = htmlSanitizer;
