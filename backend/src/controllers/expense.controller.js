// =============================================================
// SHIVBAEMPIRE — Expense Controller
// =============================================================
const { pool } = require('../config/database');
const { createAuditLog, getClientIp } = require('../services/audit.service');

const VALID_CATEGORIES = [
  'DECORATION', 'SOUND_DJ', 'TENT', 'PRASAD', 'PUJA_MATERIAL',
  'TRANSPORTATION', 'ELECTRICITY', 'ADVERTISEMENT', 'PRINTING',
  'FOOD', 'SECURITY', 'MISCELLANEOUS'
];

/**
 * GET /api/expenses
 */
const getExpenses = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, search = '',
      category = '', event_id = '',
      date_from = '', date_to = '',
      sort = 'expense_date', order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = [];
    let params = [];

    if (search) {
      conditions.push('(e.description LIKE ? OR e.paid_to LIKE ? OR e.bill_number LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category) { conditions.push('e.category = ?'); params.push(category); }
    if (event_id) { conditions.push('e.event_id = ?'); params.push(parseInt(event_id)); }
    if (date_from) { conditions.push('e.expense_date >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('e.expense_date <= ?'); params.push(date_to); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const validSortCols = ['expense_date', 'amount', 'category', 'created_at'];
    const sortCol = validSortCols.includes(sort) ? sort : 'expense_date';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM expenses e ${where}`,
      params
    );

    const [expenses] = await pool.execute(
      `SELECT e.*, ev.name as event_name, u.full_name as created_by_name
       FROM expenses e
       LEFT JOIN events ev ON e.event_id = ev.id
       LEFT JOIN users u ON e.created_by = u.id
       ${where}
       ORDER BY e.${sortCol} ${order === 'ASC' ? 'ASC' : 'DESC'}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Total for filtered view
    const [totalRows] = await pool.execute(
      `SELECT COALESCE(SUM(e.amount), 0) as total_amount FROM expenses e ${where}`,
      params
    );

    const totalRecords = countRows?.[0]?.total ?? countRows?.[0]?.cnt ?? expenses.length;
    const totalAmt = totalRows?.[0]?.total_amount !== undefined ? parseFloat(totalRows[0].total_amount) : expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    res.json({
      success: true,
      data: expenses,
      totalAmount: totalAmt,
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
 * GET /api/expenses/:id
 */
const getExpenseById = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, ev.name as event_name, u.full_name as created_by_name
       FROM expenses e
       LEFT JOIN events ev ON e.event_id = ev.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/expenses
 */
const createExpense = async (req, res, next) => {
  try {
    const { event_id, category, description, amount, payment_mode, expense_date, paid_to, bill_number, notes } = req.body;

    if (!event_id || !category || !description || !amount || !payment_mode || !expense_date) {
      return res.status(400).json({ success: false, message: 'event_id, category, description, amount, payment_mode, and expense_date are required.' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Invalid category. Valid: ${VALID_CATEGORIES.join(', ')}` });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO expenses (event_id, category, description, amount, payment_mode, expense_date, paid_to, bill_number, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [parseInt(event_id), category, description.trim(), amt, payment_mode, expense_date,
       paid_to || null, bill_number || null, notes || null, req.user.id]
    );

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'EXPENSE_CREATED',
      module: 'EXPENSE',
      recordId: result.insertId,
      newData: { event_id, category, amount: amt, description },
      ipAddress: getClientIp(req),
    });

    const [newExpense] = await pool.execute('SELECT e.*, ev.name as event_name FROM expenses e LEFT JOIN events ev ON e.event_id = ev.id WHERE e.id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Expense recorded successfully.', data: newExpense[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/expenses/:id
 */
const updateExpense = async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const exp = existing[0];
    const { category, description, amount, payment_mode, expense_date, paid_to, bill_number, notes } = req.body;

    if (amount !== undefined) {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be positive.' });
      }
    }

    await pool.execute(
      `UPDATE expenses SET category = ?, description = ?, amount = ?, payment_mode = ?,
        expense_date = ?, paid_to = ?, bill_number = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        category || exp.category,
        description || exp.description,
        amount !== undefined ? parseFloat(amount) : exp.amount,
        payment_mode || exp.payment_mode,
        expense_date || exp.expense_date,
        paid_to !== undefined ? paid_to : exp.paid_to,
        bill_number !== undefined ? bill_number : exp.bill_number,
        notes !== undefined ? notes : exp.notes,
        req.params.id,
      ]
    );

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'EXPENSE_UPDATED',
      module: 'EXPENSE',
      recordId: req.params.id,
      oldData: exp,
      newData: req.body,
      ipAddress: getClientIp(req),
    });

    const [updated] = await pool.execute('SELECT e.*, ev.name as event_name FROM expenses e LEFT JOIN events ev ON e.event_id = ev.id WHERE e.id = ?', [req.params.id]);
    res.json({ success: true, message: 'Expense updated successfully.', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/expenses/:id — Admin only
 */
const deleteExpense = async (req, res, next) => {
  try {
    const [existing] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    await pool.execute('DELETE FROM expenses WHERE id = ?', [req.params.id]);

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'EXPENSE_DELETED',
      module: 'EXPENSE',
      recordId: req.params.id,
      oldData: existing[0],
      ipAddress: getClientIp(req),
    });

    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense };
