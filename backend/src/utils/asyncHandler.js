/**
 * Wraps an async Express handler so that any rejected promise is forwarded
 * to the central error-handling middleware instead of being swallowed.
 * Removes the need for a try/catch in every controller method.
 *
 * @param {Function} fn async (req, res, next) => {...}
 * @returns {Function} Express handler
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
