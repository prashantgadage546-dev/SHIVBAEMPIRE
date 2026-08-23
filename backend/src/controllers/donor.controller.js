// =============================================================
// SHIVBAEMPIRE — Donor Controller (Full CRUD)
// =============================================================
const { pool } = require('../config/database');
const { createAuditLog, getClientIp } = require('../services/audit.service');

/**
 * Generate next donor code
 */
async function generateDonorCode(connection) {
  const [rows] = await connection.execute(
    "SELECT donor_code FROM donors ORDER BY id DESC LIMIT 1"
  );
  if (rows.length === 0) return 'DON-0001';
  const last = rows[0].donor_code;
  const num = parseInt(last.split('-')[1]) + 1;
  return `DON-${String(num).padStart(4, '0')}`;
}

/**
 * GET /api/donors
 */
const getDonors = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      village = '',
      event_id = '',
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortColumns = ['id', 'full_name', 'mobile', 'village_name', 'expected_donation', 'total_paid', 'pending_amount', 'status', 'created_at'];
    const sortCol = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let conditions = [];
    let params = [];

    // Role-based filtering: collectors see only their own donors
    if (req.user.role === 'COLLECTOR') {
      conditions.push('d.created_by = ?');
      params.push(req.user.id);
    }

    if (search) {
      conditions.push('(d.full_name LIKE ? OR d.mobile LIKE ? OR d.donor_code LIKE ? OR d.village_name LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }
    if (village) {
      conditions.push('d.village_name LIKE ?');
      params.push(`%${village}%`);
    }
    if (event_id) {
      conditions.push('d.event_id = ?');
      params.push(parseInt(event_id));
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM donors d ${where}`,
      params
    );
    const [donors] = await pool.execute(
      `SELECT d.*, u.full_name as collector_name, e.name as event_name
       FROM donors d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN events e ON d.event_id = e.id
       ${where}
       ORDER BY d.${sortCol} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = countRows?.[0]?.total ?? countRows?.[0]?.cnt ?? donors.length;

    res.json({
      success: true,
      data: donors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/donors/:id
 */
const getDonorById = async (req, res, next) => {
  try {
    const [donors] = await pool.execute(
      `SELECT d.*, u.full_name as collector_name, e.name as event_name
       FROM donors d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN events e ON d.event_id = e.id
       WHERE d.id = ?`,
      [req.params.id]
    );

    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    // Get donor's collections
    const [collections] = await pool.execute(
      `SELECT c.*, r.receipt_number, u.full_name as collector_name
       FROM collections c
       LEFT JOIN receipts r ON c.receipt_id = r.id
       LEFT JOIN users u ON c.collector_id = u.id
       WHERE c.donor_id = ? AND c.is_cancelled = 0
       ORDER BY c.collection_date DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...donors[0], collections } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/donors
 */
const createDonor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      full_name, mobile, email, village_name, address,
      expected_donation, notes, event_id,
    } = req.body;

    // Validate required fields
    if (!full_name || !mobile) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Full name and mobile number are required.' });
    }

    if (!event_id) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Event is required.' });
    }

    // Validate mobile format
    if (!/^\d{10}$/.test(mobile)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits.' });
    }

    // Check for duplicate
    const [existing] = await connection.execute(
      'SELECT id, full_name, mobile, donor_code FROM donors WHERE mobile = ? AND event_id = ?',
      [mobile, event_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'A donor with this mobile number already exists for this event.',
        existingDonor: existing[0],
        isDuplicate: true,
      });
    }

    const donorCode = await generateDonorCode(connection);
    const expectedAmt = parseFloat(expected_donation) || 0;

    const [result] = await connection.execute(
      `INSERT INTO donors (donor_code, full_name, mobile, email, village_name, address,
        expected_donation, total_paid, status, notes, event_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'PENDING', ?, ?, ?)`,
      [donorCode, full_name.trim(), mobile.trim(), email || null, village_name || null,
       address || null, expectedAmt, notes || null, parseInt(event_id), req.user.id]
    );

    await connection.commit();

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DONOR_CREATED',
      module: 'DONOR',
      recordId: result.insertId,
      newData: { donor_code: donorCode, full_name, mobile, expected_donation: expectedAmt },
      ipAddress: getClientIp(req),
    });

    const [newDonor] = await pool.execute('SELECT * FROM donors WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, message: 'Donor created successfully.', data: newDonor[0] });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/donors/:id
 */
const updateDonor = async (req, res, next) => {
  try {
    const { full_name, email, village_name, address, expected_donation, notes } = req.body;

    const [existing] = await pool.execute('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    const donor = existing[0];

    await pool.execute(
      `UPDATE donors SET
        full_name = ?, email = ?, village_name = ?, address = ?,
        expected_donation = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        full_name || donor.full_name,
        email !== undefined ? email : donor.email,
        village_name !== undefined ? village_name : donor.village_name,
        address !== undefined ? address : donor.address,
        expected_donation !== undefined ? parseFloat(expected_donation) : donor.expected_donation,
        notes !== undefined ? notes : donor.notes,
        req.params.id,
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DONOR_UPDATED',
      module: 'DONOR',
      recordId: req.params.id,
      oldData: donor,
      newData: req.body,
      ipAddress: getClientIp(req),
    });

    const [updated] = await pool.execute('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Donor updated successfully.', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/donors/:id — Admin only
 */
const deleteDonor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [donors] = await connection.execute('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    if (donors.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    // Check if donor has collections
    const [collections] = await connection.execute(
      'SELECT COUNT(*) as cnt FROM collections WHERE donor_id = ? AND is_cancelled = 0',
      [req.params.id]
    );

    if (collections[0].cnt > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete donor with existing collections. Cancel collections first.',
      });
    }

    await connection.execute('DELETE FROM donors WHERE id = ?', [req.params.id]);
    await connection.commit();

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DONOR_DELETED',
      module: 'DONOR',
      recordId: req.params.id,
      oldData: donors[0],
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'Donor deleted successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { getDonors, getDonorById, createDonor, updateDonor, deleteDonor };
