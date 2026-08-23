// =============================================================
// SHIVBAEMPIRE — Auth Controller
// =============================================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { createAuditLog, getClientIp } = require('../services/audit.service');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    // Find user by username or email
    const [users] = await pool.execute(
      `SELECT u.id, u.username, u.full_name, u.email, u.mobile, u.password_hash, u.status, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE (u.username = ? OR u.email = ?)`,
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'shivbaempire_dev_jwt_secret_key_minimum_32_chars_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Update last login
    await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Audit log
    await createAuditLog({
      userId: user.id,
      userName: user.full_name,
      action: 'USER_LOGIN',
      module: 'AUTH',
      recordId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    logger.info(`User ${user.username} logged in`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.full_name,
      action: 'USER_LOGOUT',
      module: 'AUTH',
      recordId: req.user?.id,
      ipAddress: getClientIp(req),
    });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.full_name,
      email: req.user.email,
      mobile: req.user.mobile,
      role: req.user.role,
    },
  });
};

module.exports = { login, logout, getMe };
