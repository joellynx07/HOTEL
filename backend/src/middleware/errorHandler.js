/**
 * src/middleware/errorHandler.js
 * Catches anything thrown/rejected inside a route (when routes are
 * wrapped with `asyncHandler`) and turns it into a consistent JSON error
 * instead of an Express default HTML stack trace leaking to the client.
 */

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  res.status(500).json({
    error: "Something went wrong on our end. Please try again.",
  });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
