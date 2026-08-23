// =============================================================
// SHIVBAEMPIRE — Event Routes + Controller
// =============================================================
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { createAuditLog, getClientIp } = require('../services/audit.service');

// GET /api/events
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [events] = await pool.execute(
      `SELECT e.*, u.full_name as created_by_name,
              (SELECT COUNT(*) FROM donors d WHERE d.event_id = e.id) as donor_count,
              (SELECT COALESCE(SUM(c.amount),0) FROM collections c WHERE c.event_id = e.id AND c.is_cancelled = 0) as total_collected,
              (SELECT target_amount FROM targets t WHERE t.event_id = e.id ORDER BY t.id DESC LIMIT 1) as target_amount
       FROM events e
       LEFT JOIN users u ON e.created_by = u.id
       ORDER BY e.created_at DESC`
    );
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [events] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found.' });
    res.json({ success: true, data: events[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/events
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, event_date, end_date, location, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Event name is required.' });

    const [result] = await pool.execute(
      `INSERT INTO events (name, description, event_date, end_date, location, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || null, event_date || null, end_date || null,
       location || null, status || 'UPCOMING', req.user.id]
    );

    await createAuditLog({
      userId: req.user.id, userName: req.user.full_name,
      action: 'EVENT_CREATED', module: 'EVENT',
      recordId: result.insertId, newData: { name },
      ipAddress: getClientIp(req),
    });

    const [ev] = await pool.execute('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Event created.', data: ev[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/events/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Event not found.' });

    const ev = existing[0];
    const { name, description, event_date, end_date, location, status, is_active } = req.body;

    // If setting as active, deactivate others first
    if (is_active === 1 || is_active === true) {
      await pool.execute('UPDATE events SET is_active = 0');
    }

    await pool.execute(
      `UPDATE events SET name = ?, description = ?, event_date = ?, end_date = ?,
        location = ?, status = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [name || ev.name, description !== undefined ? description : ev.description,
       event_date || ev.event_date, end_date || ev.end_date, location || ev.location,
       status || ev.status, is_active !== undefined ? (is_active ? 1 : 0) : ev.is_active,
       req.params.id]
    );

    const [updated] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event updated.', data: updated[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Event not found.' });

    const [collections] = await pool.execute('SELECT COUNT(*) as cnt FROM collections WHERE event_id = ?', [req.params.id]);
    if (collections[0].cnt > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete event with existing collections.' });
    }

    await pool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
