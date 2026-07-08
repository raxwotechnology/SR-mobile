const express = require('express');
const router = express.Router();
const {
  getStores,
  getStoreById,
  getMyStore,
  createStore,
  updateStore,
  deleteStore,
} = require('../controllers/storeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/my', protect, authorize('manager'), getMyStore);

router.route('/')
  .get(getStores)
  .post(protect, authorize('manager', 'admin'), createStore);

router.route('/:id')
  .get(getStoreById)
  .put(protect, authorize('manager', 'admin'), updateStore)
  .delete(protect, authorize('admin'), deleteStore);

module.exports = router;
