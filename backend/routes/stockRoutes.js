const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createStockReceipt,
  listStockReceipts,
  getReceiptByGRN,
  deleteStockReceipt,
  getNextGrn,
  searchGrnNumbers,
  createSupplierReturn,
  listSupplierReturns,
  createStockAdjustment,
  listStockAdjustments,
  createStockTransfer,
  updateStockTransferStatus,
  listStockTransfers
} = require('../controllers/stockController');

router.use(protect, authorize('admin', 'manager', 'stockEmployee', 'cashier'));

router.get('/next-grn', getNextGrn);
router.get('/grn-search', searchGrnNumbers);

router.route('/receipts')
  .get(listStockReceipts)
  .post(createStockReceipt);

router.delete('/receipts/:id', authorize('admin'), deleteStockReceipt);

router.get('/receipts/grn/:grnNumber', getReceiptByGRN);

router.route('/supplier-returns')
  .get(listSupplierReturns)
  .post(createSupplierReturn);

router.route('/adjustments')
  .get(listStockAdjustments)
  .post(createStockAdjustment);

router.route('/transfers')
  .get(listStockTransfers)
  .post(createStockTransfer);

router.put('/transfers/:id/status', updateStockTransferStatus);

module.exports = router;
