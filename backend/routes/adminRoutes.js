const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllStores,
  getStoreSummaries,
  toggleStore,
  getAllOrders,
  getAllProducts,
  approveOrder,
  cancelOrder,
  deleteOrder,
  getStats,
  updateOrderAdmin,
} = require('../controllers/adminController');
const { protect, authorize, requirePermission } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats); // General overview

// Employees / Users (requires 'employees' permission)
router.route('/users')
  .get(requirePermission('employees'), getUsers)
  .post(requirePermission('employees'), createUser);

router.route('/users/:id')
  .put(requirePermission('employees'), updateUser)
  .delete(requirePermission('employees'), deleteUser);

router.put('/users/:id/role', requirePermission('employees'), updateUserRole);
router.put('/users/:id/toggle-status', requirePermission('employees'), toggleUserStatus);

// Stores / Settings (requires 'settings' permission)
router.get('/stores/summaries', requirePermission('settings'), getStoreSummaries);
router.get('/stores', requirePermission('settings'), getAllStores);
router.put('/stores/:id/toggle', requirePermission('settings'), toggleStore);

// Orders / Sales (requires 'sales' permission)
router.get('/orders', requirePermission('sales'), getAllOrders);
router.put('/orders/:id', requirePermission('sales'), updateOrderAdmin);
router.put('/orders/:id/approve', requirePermission('sales'), approveOrder);
router.put('/orders/:id/cancel', requirePermission('sales'), cancelOrder);
router.delete('/orders/:id', requirePermission('sales'), deleteOrder);

// Products (requires 'products' or 'suppliers' permission for GRN)
router.get('/products', (req, res, next) => {
  if (req.user.email === 'admin@mobilehub.com' || req.user.isSuperAdmin) return next();
  if (req.user.permissions && (req.user.permissions.products || req.user.permissions.suppliers)) return next();
  res.status(403);
  return next(new Error('Access denied. You need products or suppliers permission.'));
}, getAllProducts);


module.exports = router;
