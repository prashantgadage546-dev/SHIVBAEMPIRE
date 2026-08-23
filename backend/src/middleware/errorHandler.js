// =============================================================
// SHIVBAEMPIRE — Centralized Error Handler
// =============================================================
const logger = require('../utils/logger');

/**
 * Centralized error handler — never exposes SQL or stack traces
 */
const errorHandler = (err, req, res, next) => {
  logger.error(`[${req.method}] ${req.url} — ${err.message}`, { stack: err.stack });

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json({ success: false, message: err.message, errors: err.errors });
  }

  // Duplicate entry (MySQL error 1062)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A record with this information already exists.' });
  }

  // Foreign key constraint
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Authentication token has expired.' });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Default 500 — never expose internal details
  res.status(500).json({ success: false, message: 'An internal server error occurred. Please try again.' });
};

module.exports = errorHandler;
