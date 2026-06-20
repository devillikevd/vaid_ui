const crypto = require('crypto');
const axios = require('axios');

/**
 * Validates a password against complexity rules and HaveIBeenPwned API.
 * @param {string} password 
 * @throws {Error} if password fails validation. The error will have a statusCode of 400.
 */
async function validatePassword(password) {
  if (!password || password.length < 12) {
    const error = new Error('Password must be at least 12 characters');
    error.statusCode = 400;
    throw error;
  }

  // Enforce password complexity: uppercase, lowercase, number, special character
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    const error = new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    error.statusCode = 400;
    throw error;
  }

  // HaveIBeenPwned k-anonymity check
  const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
    const hashes = response.data.split('\n');
    for (const line of hashes) {
      const [h, count] = line.split(':');
      if (h.trim() === suffix) {
        const error = new Error(`This password has appeared in a data breach ${count.trim()} times. Please choose a safer password.`);
        error.statusCode = 400;
        throw error;
      }
    }
  } catch (error) {
    // Re-throw our validation errors
    if (error.statusCode === 400) throw error;
    // If the HIBP API fails, we log it but don't block registration/password change
    console.warn('[PwnedCheck] Failed to check password against HaveIBeenPwned:', error.message);
  }
}

module.exports = { validatePassword };
