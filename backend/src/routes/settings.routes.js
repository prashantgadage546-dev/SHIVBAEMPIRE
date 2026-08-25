// Settings Route
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const [settings] = await pool.execute('SELECT setting_key, setting_value, description FROM settings ORDER BY setting_key');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: settingsMap });
  } catch (err) {
    next(err);
  }
});

router.put('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await pool.execute(
        'INSERT INTO settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?',
        [key, String(value), req.user.id, String(value), req.user.id]
      );
    }
    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-all-data', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM collections');
    await pool.execute('DELETE FROM receipts');
    await pool.execute('DELETE FROM donors');
    await pool.execute('DELETE FROM expenses');
    await pool.execute('DELETE FROM activity_logs');
    try {
      await pool.execute('UPDATE receipt_sequences SET last_number = 0');
    } catch {}

    res.json({ success: true, message: 'All test collections, donors, receipts, and expenses have been completely cleared.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
