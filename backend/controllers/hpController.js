const HirePurchase = require('../models/HirePurchase');
const Order = require('../models/Order');
const Store = require('../models/Store');
const { recordTransaction } = require('../services/ledgerService');

// @desc    Get all HP agreements
// @route   GET /api/hp
// @access  Private/Admin/Manager
const getHPRecords = async (req, res, next) => {
  try {
    const { status, storeId, search } = req.query;
    const filter = {};
    
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) filter.storeId = store._id;
    } else if (storeId) {
      filter.storeId = storeId;
    }

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { 'customer.nic': { $regex: search, $options: 'i' } }
      ];
    }

    const records = await HirePurchase.find(filter)
      .populate('orderId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
      
    res.json(records);
  } catch (error) { next(error); }
};

// @desc    Get single HP record
// @route   GET /api/hp/:id
// @access  Private/Admin/Manager
const getHPById = async (req, res, next) => {
  try {
    const record = await HirePurchase.findById(req.params.id)
      .populate({
        path: 'orderId',
        populate: { path: 'items.productId', select: 'name images' }
      })
      .populate('createdBy', 'name')
      .populate('payments.receivedBy', 'name')
      .populate('payments.accountId', 'name');

    if (!record) { res.status(404); return next(new Error('Record not found')); }
    res.json(record);
  } catch (error) { next(error); }
};

// @desc    Record HP payment
// @route   POST /api/hp/:id/payments
// @access  Private/Admin/Manager
const recordHPPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod, accountId, referenceNo, notes } = req.body;
    if (!accountId) {
      res.status(400);
      return next(new Error('Target account is required for payment'));
    }
    const record = await HirePurchase.findById(req.params.id);
    
    if (!record) { res.status(404); return next(new Error('Record not found')); }
    if (record.status === 'Completed') { res.status(400); return next(new Error('Agreement already completed')); }

    const payment = {
      amount,
      paymentMethod,
      accountId,
      referenceNo,
      receivedBy: req.user._id,
      date: new Date(),
      receiptNo: `HP-REC-${Date.now()}`
    };

    record.payments.push(payment);
    record.totalPaid += Number(amount);
    record.balanceAmount = Math.max(0, record.netTotal - record.totalPaid);
    
    // Update installments count (rough estimate or based on amount)
    if (amount >= record.installmentAmount) {
       record.installmentsPaid += 1;
    }

    if (record.totalPaid >= record.netTotal) {
      record.status = 'Completed';
    }

    // Sync associated order payment status & credit balance
    if (record.orderId) {
      try {
        const order = await Order.findById(record.orderId);
        if (order) {
          // Down payment was already paid, so subsequent payments reduce the remaining credit balance
          order.amountPaid = Math.min(order.totalAmount, order.amountPaid + Number(amount));
          order.creditBalance = Math.max(0, order.totalAmount - order.amountPaid);
          if (order.creditBalance <= 0) {
            order.paymentStatus = 'completed';
          }
          await order.save();
        }
      } catch (err) {
        console.error('Failed to sync order payment status:', err);
      }
    }

    // Calculate next due date
    const nextDate = new Date(record.nextDueDate || record.startDate);
    if (record.installmentType === 'Monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + 7);
    }
    record.nextDueDate = nextDate;

    await record.save();

    // Record in ledger
    await recordTransaction({
      storeId: record.storeId,
      accountId,
      type: 'income',
      category: 'Hire Purchase Payment',
      amount,
      paymentMethod,
      referenceNo: payment.receiptNo,
      description: `HP Payment from ${record.customer.name} (ID: ${record._id})`,
      createdBy: req.user._id
    });

    res.json(record);
  } catch (error) { next(error); }
};

// @desc    Get customer purchase history
// @route   GET /api/hp/customer/:phone/history
// @access  Private/Admin/Manager
const getCustomerHistory = async (req, res, next) => {
  try {
    const { phone } = req.params;
    const { formatSLPhone } = require('../utils/validators');
    
    // Normalize to standard formats for search
    const cleanPhone = phone.replace(/[\s\-()+]/g, ''); // Remove all special chars
    const basePhone = cleanPhone.replace(/^94/, '').replace(/^0/, ''); // Get last 9 digits
    
    // Search for 07XXXXXXXX, 7XXXXXXXX, and +947XXXXXXXX
    const phoneRegex = new RegExp(`^(\\+94|0)?${basePhone}$`);

    const orders = await Order.find({ customerPhone: phoneRegex }).sort({ createdAt: -1 });
    const hpAgreements = await HirePurchase.find({ 'customer.phone': phoneRegex }).sort({ createdAt: -1 });
    
    res.json({ orders, hpAgreements });
  } catch (error) { next(error); }
};

// @desc    Get all unique customers
// @route   GET /api/hp/customers/all
// @access  Private/Admin/Manager
const getAllCustomers = async (req, res, next) => {
  try {
    const orderCustomers = await Order.aggregate([
      { $match: { customerPhone: { $exists: true, $ne: null } } },
      { $group: { _id: "$customerPhone", name: { $first: "$customerName" }, lastSale: { $max: "$createdAt" } } }
    ]);

    const hpCustomers = await HirePurchase.aggregate([
      { $match: { "customer.phone": { $exists: true, $ne: null } } },
      { $group: { _id: "$customer.phone", name: { $first: "$customer.name" }, lastSale: { $max: "$createdAt" } } }
    ]);

    const customerMap = new Map();

    orderCustomers.forEach(c => {
      customerMap.set(c._id, { phone: c._id, name: c.name || 'Walk-in', lastSale: c.lastSale });
    });

    hpCustomers.forEach(c => {
      const existing = customerMap.get(c._id);
      if (!existing || c.lastSale > existing.lastSale) {
        customerMap.set(c._id, { phone: c._id, name: c.name || 'Walk-in', lastSale: c.lastSale });
      }
    });

    const result = Array.from(customerMap.values()).sort((a, b) => new Date(b.lastSale) - new Date(a.lastSale));
    res.json(result);
  } catch (error) { next(error); }
};

// @desc    Delete HP record
// @route   DELETE /api/hp/:id
// @access  Private/Admin
const deleteHPRecord = async (req, res, next) => {
  try {
    const record = await HirePurchase.findById(req.params.id);
    if (!record) {
      res.status(404);
      return next(new Error('HP record not found'));
    }
    await record.deleteOne();
    res.json({ message: 'Hire Purchase record deleted' });
  } catch (error) { next(error); }
};

module.exports = {
  getHPRecords,
  getHPById,
  recordHPPayment,
  getCustomerHistory,
  getAllCustomers,
  deleteHPRecord
};
