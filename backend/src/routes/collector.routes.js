// =============================================================
// SHIVBAEMPIRE — Collector Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getCollectors, createCollector, updateCollector, deleteCollector } = require('../controllers/collector.controller');

router.use(authenticate, requireAdmin);
router.get('/', getCollectors);
router.post('/', createCollector);
router.put('/:id', updateCollector);
router.delete('/:id', deleteCollector);

module.exports = router;
