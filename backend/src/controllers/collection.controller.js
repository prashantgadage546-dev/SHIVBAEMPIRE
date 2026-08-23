// =============================================================
// SHIVBAEMPIRE — Collection Controller (with MySQL Transactions)
// =============================================================
const { pool } = require('../config/database');
const { amountToWords } = require('../utils/amountToWords');
const { createAuditLog, getClientIp } = require('../services/audit.service');
const QRCode = require('qrcode');

/**
 * Generate next receipt number using sequence table (atomic & globally unique)
 */
async function generateReceiptNumber(connection, eventId) {
  const currentYear = new Date().getFullYear();

  // Find highest last_number across ALL sequences for this year
  const [maxSeqRows] = await connection.execute(
    'SELECT MAX(last_number) as max_num FROM receipt_sequences WHERE year = ?',
    [currentYear]
  );

  // Find highest receipt number sequence from existing receipts table
  const [maxReceiptRows] = await connection.execute(
    'SELECT receipt_number FROM receipts ORDER BY id DESC LIMIT 1'
  );

  let highestNum = 0;
  if (maxSeqRows.length > 0 && maxSeqRows[0]?.max_num) {
    highestNum = Math.max(highestNum, parseInt(maxSeqRows[0].max_num) || 0);
  }
  if (maxReceiptRows.length > 0 && maxReceiptRows[0]?.receipt_number) {
    const parts = maxReceiptRows[0].receipt_number.split('-');
    const lastPart = parts[parts.length - 1];
    highestNum = Math.max(highestNum, parseInt(lastPart) || 0);
  }

  const nextNumber = highestNum + 1;

  // Update or insert sequence row for this event and year
  const [rows] = await connection.execute(
    'SELECT id FROM receipt_sequences WHERE event_id = ? AND year = ?',
    [eventId, currentYear]
  );

  if (rows.length === 0) {
    await connection.execute(
      'INSERT INTO receipt_sequences (event_id, year, last_number) VALUES (?, ?, ?)',
      [eventId, currentYear, nextNumber]
    );
  } else {
    await connection.execute(
      'UPDATE receipt_sequences SET last_number = ? WHERE id = ?',
      [nextNumber, rows[0].id]
    );
  }

  return `YAT-${currentYear}-${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Update donor status based on payments
 */
async function updateDonorStatus(connection, donorId) {
  const [donors] = await connection.execute(
    'SELECT expected_donation FROM donors WHERE id = ? FOR UPDATE',
    [donorId]
  );

  if (donors.length === 0) return;

  const [totals] = await connection.execute(
    'SELECT COALESCE(SUM(amount), 0) as total_paid FROM collections WHERE donor_id = ? AND is_cancelled = 0',
    [donorId]
  );

  const totalPaid = parseFloat(totals[0].total_paid);
  const expected = parseFloat(donors[0].expected_donation);

  let status = 'PENDING';
  if (totalPaid >= expected && expected > 0) status = 'PAID';
  else if (totalPaid > 0) status = 'PARTIALLY_PAID';

  await connection.execute(
    'UPDATE donors SET total_paid = ?, status = ? WHERE id = ?',
    [totalPaid, status, donorId]
  );
}

/**
 * GET /api/collections
 */
const getCollections = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20,
      search = '', payment_mode = '', event_id = '',
      collector_id = '', date_from = '', date_to = '',
      donor_id = '', sort = 'c.collection_date', order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = ['c.is_cancelled = 0'];
    let params = [];

    if (req.user.role === 'COLLECTOR') {
      conditions.push('c.collector_id = ?');
      params.push(req.user.id);
    }
    if (search) {
      conditions.push('(d.full_name LIKE ? OR d.mobile LIKE ? OR r.receipt_number LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (payment_mode) { conditions.push('c.payment_mode = ?'); params.push(payment_mode); }
    if (event_id) { conditions.push('c.event_id = ?'); params.push(parseInt(event_id)); }
    if (collector_id && req.user.role === 'ADMIN') { conditions.push('c.collector_id = ?'); params.push(parseInt(collector_id)); }
    if (donor_id) { conditions.push('c.donor_id = ?'); params.push(parseInt(donor_id)); }
    if (date_from) { conditions.push('c.collection_date >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('c.collection_date <= ?'); params.push(date_to); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM collections c
       LEFT JOIN donors d ON c.donor_id = d.id
       LEFT JOIN receipts r ON c.receipt_id = r.id
       ${where}`,
      params
    );

    const [collections] = await pool.execute(
      `SELECT c.*, d.full_name as donor_name, d.mobile as donor_mobile,
              d.village_name, r.receipt_number,
              u.full_name as collector_name, e.name as event_name
       FROM collections c
       LEFT JOIN donors d ON c.donor_id = d.id
       LEFT JOIN receipts r ON c.receipt_id = r.id
       LEFT JOIN users u ON c.collector_id = u.id
       LEFT JOIN events e ON c.event_id = e.id
       ${where}
       ORDER BY ${sort} ${order === 'ASC' ? 'ASC' : 'DESC'}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const totalRecords = countRows?.[0]?.total ?? countRows?.[0]?.cnt ?? collections.length;
    res.json({
      success: true,
      data: collections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / parseInt(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/collections/:id
 */
const getCollectionById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*, d.full_name as donor_name, d.mobile as donor_mobile,
              d.village_name, d.address, r.receipt_number, r.amount_in_words, r.qr_code_data,
              u.full_name as collector_name, e.name as event_name
       FROM collections c
       LEFT JOIN donors d ON c.donor_id = d.id
       LEFT JOIN receipts r ON c.receipt_id = r.id
       LEFT JOIN users u ON c.collector_id = u.id
       LEFT JOIN events e ON c.event_id = e.id
       WHERE c.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/collections — Full transaction
 */
const createCollection = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { donor_id, event_id, amount, payment_mode, transaction_id, collection_date, notes } = req.body;

    // --- Validation ---
    if (!donor_id || !event_id || !amount || !payment_mode || !collection_date) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'donor_id, event_id, amount, payment_mode, and collection_date are required.' });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    // Validate donor
    const [donors] = await connection.execute('SELECT * FROM donors WHERE id = ? FOR UPDATE', [donor_id]);
    if (donors.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    // Validate event
    const [events] = await connection.execute('SELECT * FROM events WHERE id = ?', [event_id]);
    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Generate receipt number (atomic)
    const receiptNumber = await generateReceiptNumber(connection, parseInt(event_id));
    const amtWords = amountToWords(amt);

    // Generate QR code
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const verifyUrl = `${appUrl}/verify-receipt/${receiptNumber}`;
    const qrData = await QRCode.toDataURL(verifyUrl);

    // Insert receipt
    const [receiptResult] = await connection.execute(
      `INSERT INTO receipts (receipt_number, event_id, donor_id, amount, amount_in_words,
        payment_mode, transaction_id, collection_date, collector_id, qr_code_data, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptNumber, parseInt(event_id), parseInt(donor_id), amt, amtWords,
       payment_mode, transaction_id || null, collection_date, req.user.id, qrData, notes || null]
    );

    const receiptId = receiptResult.insertId;

    // Insert collection
    const [collectionResult] = await connection.execute(
      `INSERT INTO collections (receipt_id, donor_id, event_id, amount, payment_mode,
        transaction_id, collection_date, collector_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptId, parseInt(donor_id), parseInt(event_id), amt, payment_mode,
       transaction_id || null, collection_date, req.user.id, notes || null]
    );

    // Update donor totals and status
    await updateDonorStatus(connection, parseInt(donor_id));

    await connection.commit();

    // Audit log
    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'COLLECTION_CREATED',
      module: 'COLLECTION',
      recordId: collectionResult.insertId,
      newData: { receipt_number: receiptNumber, donor_id, amount: amt, payment_mode },
      ipAddress: getClientIp(req),
    });

    const [newCollection] = await pool.execute(
      `SELECT c.*, r.receipt_number, r.qr_code_data, d.full_name as donor_name,
              u.full_name as collector_name
       FROM collections c
       LEFT JOIN receipts r ON c.receipt_id = r.id
       LEFT JOIN donors d ON c.donor_id = d.id
       LEFT JOIN users u ON c.collector_id = u.id
       WHERE c.id = ?`,
      [collectionResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Collection recorded and receipt generated successfully.',
      data: newCollection[0],
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

/**
 * PUT /api/collections/:id — Admin only for financial edits
 */
const updateCollection = async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const { notes, collection_date } = req.body;
    const collection = existing[0];

    await pool.execute(
      `UPDATE collections SET notes = ?, collection_date = ?, updated_at = NOW() WHERE id = ?`,
      [notes !== undefined ? notes : collection.notes, collection_date || collection.collection_date, req.params.id]
    );

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'COLLECTION_UPDATED',
      module: 'COLLECTION',
      recordId: req.params.id,
      oldData: collection,
      newData: req.body,
      ipAddress: getClientIp(req),
    });

    const [updated] = await pool.execute('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Collection updated.', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/collections/:id — Admin only
 */
const deleteCollection = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const collection = existing[0];

    // Cancel collection and receipt
    await connection.execute('UPDATE collections SET is_cancelled = 1 WHERE id = ?', [req.params.id]);
    await connection.execute('UPDATE receipts SET is_cancelled = 1, cancelled_at = NOW(), cancelled_by = ? WHERE id = ?',
      [req.user.id, collection.receipt_id]);

    // Recalculate donor status
    await updateDonorStatus(connection, collection.donor_id);

    await connection.commit();

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'COLLECTION_DELETED',
      module: 'COLLECTION',
      recordId: req.params.id,
      oldData: collection,
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'Collection cancelled successfully.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

module.exports = { getCollections, getCollectionById, createCollection, updateCollection, deleteCollection };
