const { signStorageUrlsInPayload } = require('../config/minio');

const shouldSkipSigning = (req) => {
  if (req.path === '/health' || req.path === '/api' || req.originalUrl === '/api') return true;

  // Upload creation endpoints return both a stable storage reference and a resolved URL.
  // We intentionally avoid touching those payloads so clients can persist `storageUrl`
  // without the risk of saving an expiring signed URL.
  if (req.originalUrl.startsWith('/api/uploads') && req.method === 'POST') return true;

  return false;
};

const signStorageUrlsMiddleware = (req, res, next) => {
  if (shouldSkipSigning(req)) return next();

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    Promise.resolve(signStorageUrlsInPayload(body))
      .then((signedBody) => {
        originalJson(signedBody);
      })
      .catch((error) => {
        console.warn('[Storage] Response URL signing failed, falling back to raw payload:', error.message);
        originalJson(body);
      });

    return res;
  };

  next();
};

module.exports = { signStorageUrlsMiddleware };
