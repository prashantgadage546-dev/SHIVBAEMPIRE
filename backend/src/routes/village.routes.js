// Villages Route
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const [villages] = await pool.execute(
      `SELECT * FROM villages ${search ? 'WHERE name LIKE ?' : ''} ORDER BY name ASC`,
      search ? [`%${search}%`] : []
    );
    res.json({ success: true, data: villages });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, taluka, district } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Village name required.' });
    const [result] = await pool.execute(
      'INSERT IGNORE INTO villages (name, taluka, district) VALUES (?, ?, ?)',
      [name.trim(), taluka || null, district || null]
    );
    const [village] = await pool.execute('SELECT * FROM villages WHERE id = ?', [result.insertId || 1]);
    res.status(201).json({ success: true, data: village[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
