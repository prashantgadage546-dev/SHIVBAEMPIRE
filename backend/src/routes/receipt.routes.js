// =============================================================
// SHIVBAEMPIRE — Receipt Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getReceipts, getReceiptById, verifyReceipt, downloadReceiptPdf } = require('../controllers/receipt.controller');

// Public route — no auth required
router.get('/verify/:receiptNumber', verifyReceipt);

// Protected routes
router.use(authenticate);
router.get('/', getReceipts);
router.get('/:id/pdf', downloadReceiptPdf);
router.get('/:id', getReceiptById);

module.exports = router;
