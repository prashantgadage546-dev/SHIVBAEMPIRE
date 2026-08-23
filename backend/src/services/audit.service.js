// =============================================================
// SHIVBAEMPIRE — Audit Log Service
// =============================================================
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Create an audit log entry
 */
const createAuditLog = async ({
  userId = null,
  userName = null,
  action,
  module,
  recordId = null,
  oldData = null,
  newData = null,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await pool.execute(
      `INSERT INTO activity_logs (user_id, user_name, action, module, record_id, old_data, new_data, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        userName,
        action,
        module,
        recordId ? String(recordId) : null,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress,
        userAgent ? userAgent.substring(0, 500) : null,
      ]
    );
  } catch (err) {
    // Audit log failure should not break the main operation
    logger.error('Failed to create audit log:', err.message);
  }
};

/**
 * Extract IP from request
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
};

module.exports = { createAuditLog, getClientIp };
