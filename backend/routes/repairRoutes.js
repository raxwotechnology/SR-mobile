const express = require('express');
const router = express.Router();
const {
  getRepairs,
  getRepairById,
  createRepair,
  updateRepair,
  deliverRepair,
  deleteRepair
} = require('../controllers/repairController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getRepairs)
  .post(createRepair);

router.route('/:id')
  .get(getRepairById)
  .put(updateRepair)
  .delete(authorize('admin', 'manager'), deleteRepair);

router.put('/:id/deliver', deliverRepair);

module.exports = router;
