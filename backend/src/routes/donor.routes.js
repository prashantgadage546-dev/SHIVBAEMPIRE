// =============================================================
// SHIVBAEMPIRE — Donor Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getDonors, getDonorById, createDonor, updateDonor, deleteDonor
} = require('../controllers/donor.controller');

router.use(authenticate);
router.get('/', getDonors);
router.get('/:id', getDonorById);
router.post('/', createDonor);
router.put('/:id', updateDonor);
router.delete('/:id', requireAdmin, deleteDonor);

module.exports = router;
