// =============================================================
// SHIVBAEMPIRE — Expense Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getExpenses, getExpenseById, createExpense, updateExpense, deleteExpense } = require('../controllers/expense.controller');

router.use(authenticate);
router.get('/', getExpenses);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', requireAdmin, deleteExpense);

module.exports = router;
