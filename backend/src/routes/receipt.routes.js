// =============================================================
// SHIVBAEMPIRE — Receipt Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getReceipts, getReceiptById, verifyReceipt, downloadReceiptPdf, downloadReceiptPdfByNumber } = require('../controllers/receipt.controller');

// Public routes — no auth required
router.get('/verify/:receiptNumber', verifyReceipt);
router.get('/verify/:receiptNumber/pdf', downloadReceiptPdfByNumber);  // Public PDF download for WhatsApp link

// Protected routes
router.use(authenticate);
router.get('/', getReceipts);
router.get('/:id/pdf', downloadReceiptPdf);
router.get('/:id', getReceiptById);

module.exports = router;
