const { cacheGet, cacheSet } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Middleware to cache API responses in Redis.
 * @param {number} durationInSeconds - Cache TTL
 */
const cacheMiddleware = (durationInSeconds) => async (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  // Generate a unique cache key based on URL and query params
  const key = `api:cache:${req.originalUrl || req.url}`;

  try {
    const cachedResponse = await cacheGet(key);

    if (cachedResponse) {
      logger.info(`[Cache Hit] ${req.originalUrl}`);
      const parsedData = JSON.parse(cachedResponse);
      return res.status(200).json(parsedData);
    }

    logger.debug(`[Cache Miss] ${req.originalUrl}`);

    // Override res.json to intercept the response payload
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, JSON.stringify(body), durationInSeconds).catch(err => {
          logger.error(`[Cache Set Error] ${err.message}`);
        });
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    logger.error(`[Cache Middleware Error] ${err.message}`);
    // If Redis fails, continue to the route handler rather than dropping the request
    next();
  }
};

module.exports = { cacheMiddleware };
