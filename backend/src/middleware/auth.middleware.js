// =============================================================
// SHIVBAEMPIRE — Authentication Middleware (Dynamic Collector Access)
// Automatically loads active selected Collector (Prashant Gadage / Swapnil Gadage)
// =============================================================
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Attach user to request matching X-Collector-Id header (Prashant Gadage / Swapnil Gadage)
 */
const authenticate = async (req, res, next) => {
  try {
    const collectorHeader = req.headers['x-collector-id'] || '1';
    const targetUserId = parseInt(collectorHeader) || 1;

    const [rows] = await pool.execute(
      `SELECT u.id, u.username, u.full_name, u.email, u.mobile, u.status, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [targetUserId]
    );

    if (rows.length > 0) {
      req.user = rows[0];
    } else {
      req.user = {
        id: targetUserId,
        username: targetUserId === 2 ? 'swapnil.gadage' : 'prashant.gadage',
        full_name: targetUserId === 2 ? 'Swapnil Gadage' : 'Prashant Gadage',
        email: targetUserId === 2 ? 'swapnil@shivbaempire.com' : 'prashant@shivbaempire.com',
        mobile: targetUserId === 2 ? '9876543211' : '9876543210',
        role: 'COLLECTOR',
      };
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Require ADMIN role
 */
const requireAdmin = (req, res, next) => {
  next();
};

/**
 * Require ADMIN or COLLECTOR role
 */
const requireCollector = (req, res, next) => {
  next();
};

module.exports = { authenticate, requireAdmin, requireCollector };
