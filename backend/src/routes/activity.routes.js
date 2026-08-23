// Activity Logs Route
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, module: mod = '', action = '', user_id = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];

    if (mod) { conditions.push('al.module = ?'); params.push(mod); }
    if (action) { conditions.push('al.action = ?'); params.push(action); }
    if (user_id) { conditions.push('al.user_id = ?'); params.push(parseInt(user_id)); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM activity_logs al ${where}`, params
    );

    const [logs] = await pool.execute(
      `SELECT al.* FROM activity_logs al ${where}
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const totalRecords = countRows?.[0]?.total ?? countRows?.[0]?.cnt ?? logs.length;
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / parseInt(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
