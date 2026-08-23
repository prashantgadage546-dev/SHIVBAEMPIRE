// =============================================================
// SHIVBAEMPIRE — Collection Routes
// =============================================================
const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getCollections, getCollectionById, createCollection, updateCollection, deleteCollection
} = require('../controllers/collection.controller');

router.use(authenticate);
router.get('/', getCollections);
router.get('/:id', getCollectionById);
router.post('/', createCollection);
router.put('/:id', updateCollection);
router.delete('/:id', requireAdmin, deleteCollection);

module.exports = router;
