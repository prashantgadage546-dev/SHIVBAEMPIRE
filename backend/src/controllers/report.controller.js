// =============================================================
// SHIVBAEMPIRE — Reports Controller (Dashboard + All Reports)
// =============================================================
const { pool } = require('../config/database');

/**
 * GET /api/reports/dashboard
 * Main dashboard KPIs — all from MySQL
 */
const getDashboard = async (req, res, next) => {
  try {
    const { event_id } = req.query;

    let eventFilter = '';
    let params = [];

    if (event_id) {
      eventFilter = 'AND c.event_id = ?';
      params.push(parseInt(event_id));
    }

    // Total collections
    const [totalColl] = await pool.execute(
      `SELECT
        COALESCE(SUM(c.amount), 0) as total_collection,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'CASH' THEN c.amount ELSE 0 END), 0) as cash_collection,
        COALESCE(SUM(CASE WHEN c.payment_mode IN ('ONLINE', 'UPI') THEN c.amount ELSE 0 END), 0) as upi_collection,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'BANK_TRANSFER' THEN c.amount ELSE 0 END), 0) as bank_collection,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'OTHER' THEN c.amount ELSE 0 END), 0) as other_collection,
        COUNT(*) as total_collections
       FROM collections c WHERE c.is_cancelled = 0 ${eventFilter}`,
      params
    );

    // Today's collection
    const todayParams = event_id ? [parseInt(event_id)] : [];
    const eventTodayFilter = event_id ? 'AND c.event_id = ?' : '';
    const [todayColl] = await pool.execute(
      `SELECT COALESCE(SUM(c.amount), 0) as today_collection
       FROM collections c WHERE c.is_cancelled = 0 AND DATE(c.collection_date) = CURDATE() ${eventTodayFilter}`,
      todayParams
    );

    // This month
    const [monthColl] = await pool.execute(
      `SELECT COALESCE(SUM(c.amount), 0) as month_collection
       FROM collections c WHERE c.is_cancelled = 0
       AND MONTH(c.collection_date) = MONTH(NOW()) AND YEAR(c.collection_date) = YEAR(NOW()) ${eventTodayFilter}`,
      todayParams
    );

    // Total expenses
    const expParams = event_id ? [parseInt(event_id)] : [];
    const expEventFilter = event_id ? 'WHERE e.event_id = ?' : '';
    const [totalExp] = await pool.execute(
      `SELECT COALESCE(SUM(e.amount), 0) as total_expenses FROM expenses e ${expEventFilter}`,
      expParams
    );

    // Donor stats
    const donorParams = event_id ? [parseInt(event_id)] : [];
    const donorEventFilter = event_id ? 'WHERE d.event_id = ?' : '';
    const [donorStats] = await pool.execute(
      `SELECT
        COUNT(*) as total_donors,
        SUM(CASE WHEN d.status = 'PAID' THEN 1 ELSE 0 END) as paid_donors,
        SUM(CASE WHEN d.status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) as partial_donors,
        SUM(CASE WHEN d.status = 'PENDING' THEN 1 ELSE 0 END) as pending_donors,
        COALESCE(SUM(d.expected_donation), 0) as total_expected,
        COALESCE(SUM(d.pending_amount), 0) as total_pending
       FROM donors d ${donorEventFilter}`,
      donorParams
    );

    // Target
    const targetParams = event_id ? [parseInt(event_id)] : [];
    const targetFilter = event_id ? 'WHERE event_id = ?' : 'WHERE id = (SELECT MIN(id) FROM targets)';
    const [targets] = await pool.execute(
      `SELECT COALESCE(target_amount, 0) as target_amount FROM targets ${event_id ? 'WHERE event_id = ?' : ''} ORDER BY id DESC LIMIT 1`,
      targetParams
    );

    const totalCollection = parseFloat(totalColl[0].total_collection);
    const totalExpenses = parseFloat(totalExp[0].total_expenses);
    const targetAmount = targets.length > 0 ? parseFloat(targets[0].target_amount) : 0;

    res.json({
      success: true,
      data: {
        totalCollection,
        cashCollection: parseFloat(totalColl[0].cash_collection),
        upiCollection: parseFloat(totalColl[0].upi_collection),
        bankCollection: parseFloat(totalColl[0].bank_collection),
        otherCollection: parseFloat(totalColl[0].other_collection),
        totalCollections: parseInt(totalColl[0].total_collections),
        todayCollection: parseFloat(todayColl[0].today_collection),
        monthCollection: parseFloat(monthColl[0].month_collection),
        totalExpenses,
        remainingBalance: totalCollection - totalExpenses,
        totalDonors: parseInt(donorStats[0].total_donors),
        paidDonors: parseInt(donorStats[0].paid_donors),
        partialDonors: parseInt(donorStats[0].partial_donors),
        pendingDonors: parseInt(donorStats[0].pending_donors),
        totalExpected: parseFloat(donorStats[0].total_expected),
        totalPending: parseFloat(donorStats[0].total_pending),
        targetAmount,
        targetCollected: totalCollection,
        targetRemaining: Math.max(0, targetAmount - totalCollection),
        targetPercentage: targetAmount > 0 ? Math.min(100, Math.round((totalCollection / targetAmount) * 100)) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/collections
 */
const getCollectionReport = async (req, res, next) => {
  try {
    const { event_id, date_from, date_to, payment_mode, collector_id } = req.query;

    let conditions = ['c.is_cancelled = 0'];
    let params = [];

    if (event_id) { conditions.push('c.event_id = ?'); params.push(parseInt(event_id)); }
    if (date_from) { conditions.push('c.collection_date >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('c.collection_date <= ?'); params.push(date_to); }
    if (payment_mode) { conditions.push('c.payment_mode = ?'); params.push(payment_mode); }
    if (collector_id) { conditions.push('c.collector_id = ?'); params.push(parseInt(collector_id)); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [collections] = await pool.execute(
      `SELECT c.*, d.full_name as donor_name, d.mobile, d.village_name,
              r.receipt_number, u.full_name as collector_name, e.name as event_name
       FROM collections c
       LEFT JOIN donors d ON c.donor_id = d.id
       LEFT JOIN receipts r ON c.receipt_id = r.id
       LEFT JOIN users u ON c.collector_id = u.id
       LEFT JOIN events e ON c.event_id = e.id
       ${where}
       ORDER BY c.collection_date DESC`,
      params
    );

    const [summary] = await pool.execute(
      `SELECT COALESCE(SUM(c.amount), 0) as total, COUNT(*) as count FROM collections c ${where}`,
      params
    );

    res.json({ success: true, data: collections, summary: summary[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/village-wise
 */
const getVillageWiseReport = async (req, res, next) => {
  try {
    const { event_id } = req.query;
    const params = event_id ? [parseInt(event_id)] : [];
    const eventFilter = event_id ? 'AND d.event_id = ?' : '';

    const [rows] = await pool.execute(
      `SELECT
        COALESCE(d.village_name, 'Unknown') as village,
        COUNT(DISTINCT d.id) as donor_count,
        COALESCE(SUM(c.amount), 0) as total_collected,
        COALESCE(SUM(d.expected_donation), 0) as total_expected,
        COALESCE(SUM(d.pending_amount), 0) as total_pending
       FROM donors d
       LEFT JOIN collections c ON c.donor_id = d.id AND c.is_cancelled = 0
       WHERE 1=1 ${eventFilter}
       GROUP BY village
       ORDER BY total_collected DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/collector-wise
 */
const getCollectorWiseReport = async (req, res, next) => {
  try {
    const { event_id } = req.query;
    const params = event_id ? [parseInt(event_id)] : [];
    const eventFilter = event_id ? 'AND c.event_id = ?' : '';

    const [rows] = await pool.execute(
      `SELECT
        u.id as collector_id, u.full_name as collector_name, u.mobile,
        COUNT(DISTINCT c.id) as total_collections,
        COALESCE(SUM(c.amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'CASH' THEN c.amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'UPI' THEN c.amount ELSE 0 END), 0) as upi,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'BANK_TRANSFER' THEN c.amount ELSE 0 END), 0) as bank,
        COUNT(DISTINCT c.donor_id) as donors_collected_from
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN collections c ON c.collector_id = u.id AND c.is_cancelled = 0 ${eventFilter}
       WHERE r.name IN ('ADMIN', 'COLLECTOR')
       GROUP BY u.id, u.full_name, u.mobile
       ORDER BY total_amount DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/daily
 */
const getDailyReport = async (req, res, next) => {
  try {
    const { event_id, date_from, date_to } = req.query;
    let conditions = ['c.is_cancelled = 0'];
    let params = [];

    if (event_id) { conditions.push('c.event_id = ?'); params.push(parseInt(event_id)); }
    if (date_from) { conditions.push('c.collection_date >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('c.collection_date <= ?'); params.push(date_to); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT
        c.collection_date as date,
        COUNT(*) as collections,
        COALESCE(SUM(c.amount), 0) as total,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'CASH' THEN c.amount ELSE 0 END), 0) as cash,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'UPI' THEN c.amount ELSE 0 END), 0) as upi,
        COALESCE(SUM(CASE WHEN c.payment_mode = 'BANK_TRANSFER' THEN c.amount ELSE 0 END), 0) as bank
       FROM collections c
       ${where}
       GROUP BY c.collection_date
       ORDER BY c.collection_date DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/monthly
 */
const getMonthlyReport = async (req, res, next) => {
  try {
    const { event_id } = req.query;
    const params = event_id ? [parseInt(event_id)] : [];
    const eventFilter = event_id ? 'AND c.event_id = ?' : '';

    const [rows] = await pool.execute(
      `SELECT
        YEAR(c.collection_date) as year,
        MONTH(c.collection_date) as month,
        DATE_FORMAT(c.collection_date, '%b %Y') as month_label,
        COUNT(*) as collections,
        COALESCE(SUM(c.amount), 0) as total
       FROM collections c
       WHERE c.is_cancelled = 0 ${eventFilter}
       GROUP BY year, month
       ORDER BY year DESC, month DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/pending
 */
const getPendingDonationsReport = async (req, res, next) => {
  try {
    const { event_id, min_pending } = req.query;
    let conditions = ["d.status != 'PAID'"];
    let params = [];

    if (event_id) { conditions.push('d.event_id = ?'); params.push(parseInt(event_id)); }
    if (min_pending) { conditions.push('d.pending_amount >= ?'); params.push(parseFloat(min_pending)); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT d.id, d.donor_code, d.full_name, d.mobile, d.village_name,
              d.expected_donation, d.total_paid, d.pending_amount, d.status,
              MAX(c.collection_date) as last_payment_date, e.name as event_name
       FROM donors d
       LEFT JOIN collections c ON c.donor_id = d.id AND c.is_cancelled = 0
       LEFT JOIN events e ON d.event_id = e.id
       ${where}
       GROUP BY d.id
       ORDER BY d.pending_amount DESC`,
      params
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/expenses
 */
const getExpensesReport = async (req, res, next) => {
  try {
    const { event_id, date_from, date_to, category } = req.query;
    let conditions = [];
    let params = [];

    if (event_id) { conditions.push('e.event_id = ?'); params.push(parseInt(event_id)); }
    if (date_from) { conditions.push('e.expense_date >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('e.expense_date <= ?'); params.push(date_to); }
    if (category) { conditions.push('e.category = ?'); params.push(category); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [expenses] = await pool.execute(
      `SELECT e.*, ev.name as event_name, u.full_name as created_by_name
       FROM expenses e
       LEFT JOIN events ev ON e.event_id = ev.id
       LEFT JOIN users u ON e.created_by = u.id
       ${where}
       ORDER BY e.expense_date DESC`,
      params
    );

    const [byCategory] = await pool.execute(
      `SELECT e.category, COALESCE(SUM(e.amount), 0) as total, COUNT(*) as count
       FROM expenses e ${where}
       GROUP BY e.category
       ORDER BY total DESC`,
      params
    );

    const [summary] = await pool.execute(
      `SELECT COALESCE(SUM(e.amount), 0) as total FROM expenses e ${where}`,
      params
    );

    res.json({ success: true, data: expenses, byCategory, summary: summary[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/final
 * Complete Yatra financial report
 */
const getFinalReport = async (req, res, next) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      return res.status(400).json({ success: false, message: 'event_id is required.' });
    }

    const eid = parseInt(event_id);

    const [event] = await pool.execute('SELECT * FROM events WHERE id = ?', [eid]);
    if (event.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const [collections] = await pool.execute(
      `SELECT COALESCE(SUM(c.amount), 0) as total,
              COALESCE(SUM(CASE WHEN c.payment_mode = 'CASH' THEN c.amount ELSE 0 END), 0) as cash,
              COALESCE(SUM(CASE WHEN c.payment_mode = 'UPI' THEN c.amount ELSE 0 END), 0) as upi,
              COALESCE(SUM(CASE WHEN c.payment_mode = 'BANK_TRANSFER' THEN c.amount ELSE 0 END), 0) as bank,
              COUNT(*) as count
       FROM collections c WHERE c.event_id = ? AND c.is_cancelled = 0`,
      [eid]
    );

    const [expenses] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE event_id = ?`,
      [eid]
    );

    const [donors] = await pool.execute(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as paid,
              SUM(CASE WHEN status = 'PARTIALLY_PAID' THEN 1 ELSE 0 END) as partial,
              SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
              COALESCE(SUM(pending_amount), 0) as total_pending
       FROM donors WHERE event_id = ?`,
      [eid]
    );

    const [byCategory] = await pool.execute(
      `SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses WHERE event_id = ? GROUP BY category ORDER BY total DESC`,
      [eid]
    );

    const [collectorWise] = await pool.execute(
      `SELECT u.full_name as collector, COALESCE(SUM(c.amount), 0) as amount, COUNT(*) as collections
       FROM collections c LEFT JOIN users u ON c.collector_id = u.id
       WHERE c.event_id = ? AND c.is_cancelled = 0
       GROUP BY c.collector_id ORDER BY amount DESC`,
      [eid]
    );

    const [villageWise] = await pool.execute(
      `SELECT COALESCE(d.village_name, 'Unknown') as village,
              COUNT(DISTINCT d.id) as donors,
              COALESCE(SUM(c.amount), 0) as amount
       FROM donors d
       LEFT JOIN collections c ON c.donor_id = d.id AND c.is_cancelled = 0
       WHERE d.event_id = ?
       GROUP BY village ORDER BY amount DESC`,
      [eid]
    );

    const [target] = await pool.execute(
      'SELECT target_amount FROM targets WHERE event_id = ? ORDER BY id DESC LIMIT 1',
      [eid]
    );

    const totalIncome = parseFloat(collections[0].total);
    const totalExpenses = parseFloat(expenses[0].total);

    res.json({
      success: true,
      data: {
        event: event[0],
        summary: {
          totalDonors: parseInt(donors[0].total),
          paidDonors: parseInt(donors[0].paid),
          partialDonors: parseInt(donors[0].partial),
          pendingDonors: parseInt(donors[0].pending),
          totalPending: parseFloat(donors[0].total_pending),
          totalIncome,
          cashCollection: parseFloat(collections[0].cash),
          upiCollection: parseFloat(collections[0].upi),
          bankCollection: parseFloat(collections[0].bank),
          totalCollections: parseInt(collections[0].count),
          totalExpenses,
          remainingBalance: totalIncome - totalExpenses,
          targetAmount: target.length > 0 ? parseFloat(target[0].target_amount) : 0,
        },
        expensesByCategory: byCategory,
        collectorWise,
        villageWise,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard, getCollectionReport, getVillageWiseReport,
  getCollectorWiseReport, getDailyReport, getMonthlyReport,
  getPendingDonationsReport, getExpensesReport, getFinalReport,
};
