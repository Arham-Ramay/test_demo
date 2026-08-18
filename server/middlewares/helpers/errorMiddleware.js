const ErrorHandler = require('../../utils/errorHandler');

/** 404 for anything that did not match a route. */
function notFound(req, res, next) {
  next(new ErrorHandler(`Route ${req.originalUrl} not found.`, 404));
}

/**
 * Terminal error handler: one JSON shape for every failure, and stack traces
 * only outside production so a client never sees internals.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies this by arity.
function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }),
  });
}

module.exports = { notFound, errorMiddleware };
