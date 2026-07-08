const express = require('express');
const router = express.Router();
const {
  getPosProducts,
  getProductByBarcode,
  posCheckout,
  getPosOrders,
  getPosOrderById,
  getPosOrderByInvoice,
  getActiveSession,
  startSession,
  endSession,
  getCashierSalesReport,
  getCreditOrders,
  settleCreditOrder,
  createQuotation,
  sendReceipt,
} = require('../controllers/posController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All POS routes require cashier, manager or admin role
router.use(protect, authorize('cashier', 'manager', 'admin'));

router.get('/products', getPosProducts);
router.get('/products/barcode/:code', getProductByBarcode);
router.post('/checkout', posCheckout);
router.get('/orders', getPosOrders);
router.get('/orders/invoice/:invoiceNumber', getPosOrderByInvoice);
router.get('/orders/:id', getPosOrderById);
router.post('/orders/:id/send-receipt', sendReceipt);
router.get('/session/active', getActiveSession);
router.post('/session/start', startSession);
router.post('/session/end', endSession);
router.post('/quotation', createQuotation);
router.get('/cashier-report', getCashierSalesReport);

router.get('/credit-orders', getCreditOrders);
router.put('/credit-orders/:id/settle', settleCreditOrder);

module.exports = router;
