const { AsyncLocalStorage } = require('async_hooks');

const requestContext = new AsyncLocalStorage();

/**
 * Middleware to initialize request context.
 * Can store tokens, user IDs, etc. for deep backend access without prop-drilling.
 */
function requestContextMiddleware(req, res, next) {
  const token = req.cookies?.accessToken || (req.headers.authorization && req.headers.authorization.split(' ')[1]) || null;
  
  const store = {
    token,
    userId: req.user?.id || null, // Will be populated later by auth middleware if placed before auth
  };

  requestContext.run(store, () => {
    next();
  });
}

function getRequestContext() {
  return requestContext.getStore() || {};
}

module.exports = {
  requestContext,
  requestContextMiddleware,
  getRequestContext,
};
