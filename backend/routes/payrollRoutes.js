const express = require('express');
const router = express.Router();
const {
  calculateSalary,
  processSalaryPayment,
  getSalaryHistory,
  getPayrollReport,
  exportEmployeeSalaryReport,
  downloadPaysheet,
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/calculate', authorize('manager', 'admin'), calculateSalary);
router.post('/pay', authorize('admin'), processSalaryPayment);
router.get('/history/:employeeId', getSalaryHistory);
router.get('/history/:employeeId/export', exportEmployeeSalaryReport);
router.get('/paysheet/:id', downloadPaysheet);
router.get('/report', authorize('manager', 'admin'), getPayrollReport);

module.exports = router;
