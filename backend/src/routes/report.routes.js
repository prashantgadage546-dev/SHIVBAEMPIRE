// =============================================================
// SHIVBAEMPIRE — Report Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getDashboard, getCollectionReport, getVillageWiseReport,
  getCollectorWiseReport, getDailyReport, getMonthlyReport,
  getPendingDonationsReport, getExpensesReport, getFinalReport,
} = require('../controllers/report.controller');

router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/collections', getCollectionReport);
router.get('/expenses', getExpensesReport);
router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/collector-wise', requireAdmin, getCollectorWiseReport);
router.get('/village-wise', getVillageWiseReport);
router.get('/pending', getPendingDonationsReport);
router.get('/final', requireAdmin, getFinalReport);

module.exports = router;
