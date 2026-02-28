/**
 * Redis Configuration (Upstash Serverless)
 * Used for caching, session management, rate limiting
 */
const config = require('./index');

let redisClient = null;
let isConnected = false;

const getConnectionState = () => isConnected;

const connectRedis = async () => {
  if (!config.redis.url || !config.redis.token) {
    console.warn('⚠️  Redis (Upstash) not configured. Caching will be unavailable.');
    return null;
  }

  try {
    // Use Upstash REST-based Redis client
    const { Redis } = require('@upstash/redis');
    redisClient = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    });

    // Test connection
    await redisClient.ping();
    isConnected = true;
    console.log('✅ Redis (Upstash) connected successfully');
    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection error:', error.message);
    console.warn('⚠️  Continuing without Redis. Caching will be unavailable.');
    return null;
  }
};

const getRedisClient = () => redisClient;

// Cache helpers
const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis GET error:', error.message);
    return null;
  }
};

const cacheSet = async (key, value, expirySeconds = 300) => {
  if (!redisClient) return false;
  try {
    // Upstash REST client auto-serializes; no need for JSON.stringify
    await redisClient.set(key, value, { ex: expirySeconds });
    return true;
  } catch (error) {
    console.error('Redis SET error:', error.message);
    return false;
  }
};

const cacheDel = async (key) => {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error.message);
    return false;
  }
};

/**
 * Atomic increment — fixes C12 race condition in chatbot rate limiting.
 * Uses Upstash REST INCR which is atomic server-side.
 * @param {string} key
 * @param {number} expirySeconds — sets TTL only on first creation
 * @returns {number|null} — new value after increment
 */
const cacheIncr = async (key, expirySeconds) => {
  if (!redisClient) return null;
  try {
    const newVal = await redisClient.incr(key);
    // Set TTL only when the key is first created (value becomes 1)
    if (newVal === 1 && expirySeconds) {
      await redisClient.expire(key, expirySeconds);
    }
    return newVal;
  } catch (error) {
    console.error('Redis INCR error:', error.message);
    return null;
  }
};

module.exports = { connectRedis, getRedisClient, getConnectionState, cacheGet, cacheSet, cacheDel, cacheIncr };
