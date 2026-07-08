const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getHPRecords,
  getHPById,
  recordHPPayment,
  getCustomerHistory,
  getAllCustomers,
  deleteHPRecord
} = require('../controllers/hpController');

router.use(protect);

router.route('/')
  .get(getHPRecords);

router.get('/customers/all', getAllCustomers);
router.get('/customer/:phone/history', getCustomerHistory);

router.route('/:id')
  .get(getHPById)
  .delete(authorize('admin'), deleteHPRecord);

router.post('/:id/payments', recordHPPayment);

module.exports = router;
