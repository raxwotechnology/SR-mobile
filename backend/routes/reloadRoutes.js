const express = require('express');
const router = express.Router();
const {
  createReload,
  getReloads,
  getCardStock,
  addOrUpdateCardStock,
  updateCardStock,
  deleteCardStock,
  getReloadStock,
  addOrUpdateReloadStock,
  deleteReloadStock,
  recordDailyCardSales,
  deleteReload
} = require('../controllers/reloadController');

const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getReloads)
  .post(createReload);

router.route('/card-stock')
  .get(getCardStock)
  .post(addOrUpdateCardStock);

router.route('/card-stock/:id')
  .put(updateCardStock)
  .delete(deleteCardStock);

router.route('/reload-stock')
  .get(getReloadStock)
  .post(addOrUpdateReloadStock);

router.route('/reload-stock/:id')
  .delete(deleteReloadStock);

router.route('/daily-sales')
  .post(recordDailyCardSales);

router.route('/:id')
  .delete(deleteReload);

module.exports = router;
