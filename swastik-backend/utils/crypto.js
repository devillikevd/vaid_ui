const crypto = require('crypto');
const config = require('../config');

// Using AES-256-GCM requires a 32-byte (256-bit) key
// In production, PHI_ENCRYPTION_KEY must be set in the environment.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'ENC:v1:';

function getEncryptionKey() {
  const keyHex = process.env.PHI_ENCRYPTION_KEY;
  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL WARNING: PHI_ENCRYPTION_KEY environment variable is missing in production! Falling back to default key. This is a security risk.');
    }
    // Fallback key
    return crypto.createHash('sha256').update('development-fallback-phi-key-do-not-use-in-prod').digest();
  }
  
  if (keyHex.length !== 64) {
    console.error('CRITICAL WARNING: PHI_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Using fallback key.');
    return crypto.createHash('sha256').update('development-fallback-phi-key-do-not-use-in-prod').digest();
  }
  
  return Buffer.from(keyHex, 'hex');
}

let ENCRYPTION_KEY_CACHE = null;

function getKey() {
  if (!ENCRYPTION_KEY_CACHE) {
    ENCRYPTION_KEY_CACHE = getEncryptionKey();
  }
  return ENCRYPTION_KEY_CACHE;
}

/**
 * Encrypts a string or JSON object using AES-256-GCM
 * @param {string|object|array} data 
 * @returns {string} Encrypted data formatted as 'ENC:v1:{ivHex}:{authTagHex}:{encryptedHex}'
 */
function encryptPHI(data) {
  if (data === null || data === undefined || data === '') return data;

  // If data is not a string, stringify it
  let stringData = data;
  if (typeof data !== 'string') {
    stringData = JSON.stringify(data);
  }

  // If it's already encrypted, don't double encrypt
  if (typeof stringData === 'string' && stringData.startsWith(PREFIX)) {
    return stringData;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(stringData, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts data that was encrypted with encryptPHI
 * @param {string} encryptedData 
 * @returns {string|object|array} Decrypted data
 */
function decryptPHI(encryptedData) {
  if (typeof encryptedData !== 'string' || !encryptedData.startsWith(PREFIX)) {
    return encryptedData; // Not encrypted or not a string
  }

  try {
    const parts = encryptedData.substring(PREFIX.length).split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Attempt to parse JSON if it was an object/array
    try {
      if ((decrypted.startsWith('{') && decrypted.endsWith('}')) || 
          (decrypted.startsWith('[') && decrypted.endsWith(']'))) {
        return JSON.parse(decrypted);
      }
    } catch (e) {
      // It's a plain string
    }

    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt PHI:', err.message);
    // In strict mode, we might throw. But to prevent breaking the app on bad data, return a placeholder or throw.
    // Given the critical nature of PHI, throwing is safer so data corruption is caught.
    throw new Error('Failed to decrypt PHI data: ' + err.message);
  }
}

/**
 * Recursively scans an object/array and decrypts any fields starting with ENC:v1:
 */
function deepDecrypt(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    if (obj.startsWith(PREFIX)) {
      return decryptPHI(obj);
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepDecrypt(item));
  }
  
  if (typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = deepDecrypt(value);
    }
    return newObj;
  }
  
  return obj;
}

function getBlindIndexKey() {
  const keyHex = process.env.PHI_BLIND_INDEX_KEY;
  if (!keyHex) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL WARNING: PHI_BLIND_INDEX_KEY environment variable is missing in production! Falling back to default key.');
    }
    return 'development-fallback-blind-index-key';
  }
  return keyHex;
}

/**
 * Generates a consistent HMAC-SHA256 hash for blind indexing.
 * Normalizes text (lowercase, trimmed) to ensure consistent hashes for search.
 * @param {string} text 
 * @returns {string|null} The hex representation of the HMAC
 */
function generateBlindIndex(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  
  const normalized = text.toLowerCase().trim();
  const key = getBlindIndexKey();
  
  return crypto.createHmac('sha256', key)
    .update(normalized)
    .digest('hex');
}

/**
 * Helper to encrypt an array of strings
 * @param {string[]} arr
 * @returns {string[]}
 */
function encryptPHIArray(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => encryptPHI(item));
}

module.exports = {
  encryptPHI,
  decryptPHI,
  deepDecrypt,
  generateBlindIndex,
  encryptPHIArray,
  PREFIX
};
