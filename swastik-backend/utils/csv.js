/**
 * CSV Utilities
 * Provides protection against CSV Injection (Formula Injection)
 * and enforces row limits for CSV processing.
 */

const MAX_CSV_ROWS = 10000;

/**
 * Sanitizes a single cell value to prevent CSV formula injection.
 * Prepend a single quote (') if the value starts with =, +, -, or @.
 * 
 * @param {string|number|null} value 
 * @returns {string} sanitized value
 */
const sanitizeCsvCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
};

/**
 * Sanitizes an entire array of objects or arrays intended for CSV export.
 * 
 * @param {Array<Object|Array>} rows 
 * @returns {Array<Object|Array>} sanitized rows
 */
const sanitizeCsvData = (rows) => {
  if (!Array.isArray(rows)) return [];
  
  if (rows.length > MAX_CSV_ROWS) {
    throw new Error(`CSV data exceeds maximum row limit of ${MAX_CSV_ROWS}`);
  }

  return rows.map(row => {
    if (Array.isArray(row)) {
      return row.map(sanitizeCsvCell);
    }
    if (typeof row === 'object' && row !== null) {
      const sanitizedObj = {};
      for (const [key, val] of Object.entries(row)) {
        sanitizedObj[key] = sanitizeCsvCell(val);
      }
      return sanitizedObj;
    }
    return row;
  });
};

module.exports = {
  sanitizeCsvCell,
  sanitizeCsvData,
  MAX_CSV_ROWS
};
