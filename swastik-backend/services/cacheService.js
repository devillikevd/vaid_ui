/**
 * Cache Service
 * Higher-level Redis cache helpers that build on the low-level facades in
 * config/redis.js. Supports pattern-based invalidation (delPattern) across
 * both the ioredis and Upstash REST backends.
 */
const { getRedisClient } = require('../config/redis');

/**
 * Delete every key matching the given glob pattern.
 * Uses KEYS + DEL, which is safe here because it only ever runs in
 * write-path invalidation (e.g. "a consultation started/ended"), never on
 * hot request paths.
 * @param {string} pattern Redis glob pattern, e.g. "patient:dashboard:abc*"
 * @returns {Promise<number>} number of keys deleted (0 if Redis is off)
 */
const delPattern = async (pattern) => {
  if (!pattern) return 0;
  const client = getRedisClient();
  if (!client) return 0;
  try {
    if (typeof client.keys !== 'function') return 0;
    const keys = await client.keys(pattern);
    if (!Array.isArray(keys) || keys.length === 0) return 0;
    const deleted = await Promise.all(
      keys.map((key) => client.del(key).catch(() => null))
    );
    return deleted.filter((count) => count !== null && count !== 0).length;
  } catch (error) {
    console.error(`Redis delPattern error for "${pattern}":`, error.message);
    return 0;
  }
};

module.exports = {
  delPattern,
};
