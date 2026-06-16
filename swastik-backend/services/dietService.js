/**
 * Diet Service — Freemium quota, AI proxy, meal logging
 * 
 * Features:
 *   - 3 free image analyses per day (resets at midnight IST)
 *   - Rate limit message for exhausted quota
 *   - Proxies vision + calculation to AI Service (FastAPI)
 *   - Saves meal logs to MongoDB
 */
const config = require('../config');
const { cacheGet, cacheSet, cacheIncr } = require('../config/redis');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const FREE_DAILY_LIMIT = 3;

// ==================== QUOTA MANAGEMENT ====================

/**
 * Check and increment daily diet scan quota.
 * Returns { allowed: boolean, remaining: number, message?: string }
 */
async function checkDietQuota(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `diet:quota:${userId}:${today}`;

  let count = await cacheIncr(key, 86400); // 24h TTL

  // Fallback if Redis is down
  if (count === null) {
    // Allow by default if Redis fails — don't block patients
    return { allowed: true, remaining: FREE_DAILY_LIMIT };
  }

  if (count > FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      message:
        'Limit exhausted (quota available next day). We are working to increase the upload limits...',
    };
  }

  return {
    allowed: true,
    remaining: FREE_DAILY_LIMIT - count,
  };
}

/**
 * Get current quota status without incrementing.
 */
async function getQuotaStatus(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `diet:quota:${userId}:${today}`;

  const countStr = await cacheGet(key);
  const count = countStr ? parseInt(countStr, 10) : 0;

  return {
    used: count,
    limit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - count),
    exhausted: count >= FREE_DAILY_LIMIT,
  };
}

// ==================== AI SERVICE PROXY ====================

/**
 * Send image to AI Service for vision analysis.
 * @param {string} base64Image - Base64 encoded image
 * @param {string} mimeType - Image MIME type
 * @param {string} authToken - JWT token for AI service auth
 */
async function analyzeFood(base64Image, mimeType, authToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/diet/vision`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mime_type: mimeType,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DietService] Vision API error ${response.status}:`, errorText.slice(0, 200));
      throw new Error(`AI Vision API error (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Food analysis timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Send verified items to AI Service for nutritional calculation.
 * @param {Array} items - Verified food items [{name, quantity, unit}]
 * @param {string} additionalNotes - User notes about missed items
 * @param {Array} medicalConditions - Patient's conditions
 * @param {string} language - 'en' or 'hi'
 * @param {string} authToken - JWT token
 */
async function calculateNutrition(items, additionalNotes, medicalConditions, language, authToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/diet/calculate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        additional_notes: additionalNotes || null,
        medical_conditions: medicalConditions || [],
        language: language || 'en',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DietService] Calculate API error ${response.status}:`, errorText.slice(0, 200));
      throw new Error(`AI Calculate API error (${response.status})`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Nutrition calculation timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ==================== MEAL HISTORY ====================

/**
 * Get meal history for a patient.
 */
async function getMealHistory(userId, limit = 10) {
  try {
    const { MealLog } = require('../database/models');
    if (!MealLog) return [];

    const logs = await MealLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs.map((log) => ({
      id: log._id,
      items: log.items,
      totals: log.totals,
      advice: log.advice,
      mealType: log.mealType,
      createdAt: log.createdAt,
    }));
  } catch (err) {
    console.error('[DietService] History fetch failed:', err.message);
    return [];
  }
}

module.exports = {
  checkDietQuota,
  getQuotaStatus,
  analyzeFood,
  calculateNutrition,
  getMealHistory,
  FREE_DAILY_LIMIT,
};
