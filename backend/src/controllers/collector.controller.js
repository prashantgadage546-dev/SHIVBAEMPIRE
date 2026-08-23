// =============================================================
// SHIVBAEMPIRE — Collector Controller (Admin manages collectors)
// =============================================================
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { createAuditLog, getClientIp } = require('../services/audit.service');

/**
 * GET /api/collectors
 */
const getCollectors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ["r.name = 'COLLECTOR'"];
    let params = [];

    if (search) {
      conditions.push('(u.full_name LIKE ? OR u.username LIKE ? OR u.mobile LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) { conditions.push('u.status = ?'); params.push(status); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM users u JOIN roles r ON u.role_id = r.id ${where}`,
      params
    );

    const [collectors] = await pool.execute(
      `SELECT u.id, u.full_name, u.username, u.email, u.mobile, u.status, u.last_login_at, u.created_at,
              (SELECT COUNT(*) FROM donors d WHERE d.created_by = u.id) as donors_added,
              (SELECT COUNT(*) FROM collections c WHERE c.collector_id = u.id AND c.is_cancelled = 0) as total_collections,
              (SELECT COALESCE(SUM(c.amount), 0) FROM collections c WHERE c.collector_id = u.id AND c.is_cancelled = 0) as total_amount_collected,
              (SELECT COALESCE(SUM(c.amount), 0) FROM collections c WHERE c.collector_id = u.id AND c.is_cancelled = 0 AND DATE(c.collection_date) = CURDATE()) as today_collection,
              (SELECT COALESCE(SUM(c.amount), 0) FROM collections c WHERE c.collector_id = u.id AND c.is_cancelled = 0 AND MONTH(c.collection_date) = MONTH(NOW()) AND YEAR(c.collection_date) = YEAR(NOW())) as monthly_collection
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const totalRecords = countRows?.[0]?.total ?? countRows?.[0]?.cnt ?? collectors.length;
    res.json({
      success: true,
      data: collectors,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / parseInt(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/collectors
 */
const createCollector = async (req, res, next) => {
  try {
    const { full_name, username, email, mobile, password } = req.body;

    if (!full_name || !username || !password) {
      return res.status(400).json({ success: false, message: 'Full name, username, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const [collectorRole] = await pool.execute("SELECT id FROM roles WHERE name = 'COLLECTOR'");
    const roleId = collectorRole[0].id;

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (role_id, full_name, username, email, mobile, password_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [roleId, full_name.trim(), username.trim(), email || null, mobile || null, passwordHash]
    );

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'COLLECTOR_CREATED',
      module: 'USER',
      recordId: result.insertId,
      newData: { full_name, username, email, mobile },
      ipAddress: getClientIp(req),
    });

    const [newCollector] = await pool.execute(
      'SELECT id, full_name, username, email, mobile, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, message: 'Collector created successfully.', data: newCollector[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/collectors/:id
 */
const updateCollector = async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Collector not found.' });
    }

    const { full_name, email, mobile, status, password } = req.body;
    const user = existing[0];

    let passwordHash = user.password_hash;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      }
      passwordHash = await bcrypt.hash(password, 12);
    }

    await pool.execute(
      `UPDATE users SET full_name = ?, email = ?, mobile = ?, status = ?, password_hash = ?, updated_at = NOW()
       WHERE id = ?`,
      [full_name || user.full_name, email !== undefined ? email : user.email,
       mobile !== undefined ? mobile : user.mobile, status || user.status, passwordHash, req.params.id]
    );

    await createAuditLog({
      userId: req.user.id, userName: req.user.full_name,
      action: 'COLLECTOR_UPDATED', module: 'USER',
      recordId: req.params.id,
      oldData: { full_name: user.full_name, status: user.status },
      newData: { full_name, status },
      ipAddress: getClientIp(req),
    });

    const [updated] = await pool.execute(
      'SELECT id, full_name, username, email, mobile, status, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({ success: true, message: 'Collector updated successfully.', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/collectors/:id — Admin only
 */
const deleteCollector = async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Collector not found.' });
    }

    // Soft delete: deactivate instead of hard delete to preserve audit trail
    await pool.execute("UPDATE users SET status = 'INACTIVE', updated_at = NOW() WHERE id = ?", [req.params.id]);

    await createAuditLog({
      userId: req.user.id, userName: req.user.full_name,
      action: 'COLLECTOR_DEACTIVATED', module: 'USER',
      recordId: req.params.id,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'Collector deactivated successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCollectors, createCollector, updateCollector, deleteCollector };
