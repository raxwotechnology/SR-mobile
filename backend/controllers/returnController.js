const CustomerReturn = require('../models/CustomerReturn');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const User = require('../models/User');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const Settings = require('../models/Settings');
const PDFDocument = require('pdfkit');
const path = require('path');
const { sendEmail, customerReturnUpdateEmail } = require('../utils/emailService');

const resolveStoreId = async (req) => {
  if (req.user.role === 'manager') {
    const store = await Store.findOne({ managerId: req.user._id }).select('_id').lean();
    return store?._id || null;
  }
  if (req.user.role === 'cashier' || req.user.role === 'stockEmployee') {
    if (req.user.assignedStore) return req.user.assignedStore;
    const store = await Store.findOne({ isActive: true }).select('_id').lean();
    return store?._id || null;
  }
  return req.body?.storeId || req.query?.storeId || null;
};

// @desc    Lookup order for returns (staff)
// @route   GET /api/returns/orders/:id
// @access  Private/Cashier/Manager/Admin
const getReturnOrder = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const idOrInvoice = req.params.id || '';
    
    let order;
    if (mongoose.Types.ObjectId.isValid(idOrInvoice)) {
      order = await Order.findById(idOrInvoice)
        .populate('storeId', 'name')
        .populate('userId', 'name email')
        .lean();
    } else {
      // Try searching by relaxed invoice pattern matching!
      let clean = idOrInvoice.toUpperCase().replace(/^INV-?/, '').replace(/\s+/g, '');
      clean = clean.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-');
      clean = clean.replace(/-/g, '');
      
      let pattern;
      if (/^\d{12}$/.test(clean)) {
        const datePart = clean.slice(0, 8);
        const seqPart = clean.slice(8);
        pattern = `^INV-?${datePart}-?${seqPart}$`;
      } else {
        pattern = `^INV-?${clean}$`;
      }
      
      order = await Order.findOne({ invoiceNumber: { $regex: new RegExp(pattern, 'i') } })
        .populate('storeId', 'name')
        .populate('userId', 'name email')
        .lean();
    }

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id }).select('_id').lean();
      if (!store || String(store._id) !== String(order.storeId?._id || order.storeId)) {
        res.status(403);
        return next(new Error('Not authorized'));
      }
    }

    if (req.user.role === 'cashier') {
      if (!req.user.assignedStore || String(req.user.assignedStore) !== String(order.storeId?._id || order.storeId)) {
        res.status(403);
        return next(new Error('Not authorized'));
      }
    }

    res.json(order);
  } catch (error) { next(error); }
};

// @desc    Create customer return request
// @route   POST /api/returns/customer
// @access  Private/Cashier/Manager/Admin
const createCustomerReturn = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const { orderId, items, notes } = req.body;
    if (!orderId) {
      res.status(400);
      return next(new Error('orderId is required'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('At least one item is required'));
    }

    const order = await Order.findById(orderId).populate('userId', 'name email').lean();
    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }
    if (storeId && String(order.storeId) !== String(storeId) && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized for this order'));
    }
    // Customer return policy: request must be within 7 days from delivery/completion.
    const deliveredAt = order.deliveredAt || (['delivered', 'completed'].includes(order.orderStatus) ? order.updatedAt : null);
    if (!deliveredAt) {
      res.status(400);
      return next(new Error('Return can only be requested for delivered orders'));
    }
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - new Date(deliveredAt).getTime() > sevenDaysMs) {
      res.status(400);
      return next(new Error('Return request window (7 days) has expired'));
    }

    const orderItemMap = new Map((order.items || []).map((i) => [String(i.productId), i]));

    const normalized = [];
    for (const it of items) {
      if (!it?.productId || !it?.qty || it.qty <= 0) {
        res.status(400);
        return next(new Error('Invalid return item'));
      }
      const oi = orderItemMap.get(String(it.productId));
      if (!oi) {
        res.status(400);
        return next(new Error('Return item not found in order'));
      }
      if (Number(it.qty) > Number(oi.quantity)) {
        res.status(400);
        return next(new Error(`Return qty exceeds sold qty for ${oi.name}`));
      }
      const condition = it.condition === 'damaged' ? 'damaged' : 'good';
      normalized.push({
        productId: it.productId,
        orderItemName: oi.name,
        qty: Number(it.qty),
        unitPrice: Number(oi.price || 0),
        condition,
        reason: it.reason || '',
      });
    }

    const ret = await CustomerReturn.create({
      storeId: order.storeId,
      orderId: order._id,
      customerId: order.userId?._id,
      status: 'requested',
      items: normalized,
      notes: notes || '',
      createdBy: req.user._id,
      holdStatus: 'open',
      holdBillNo: `RMA-${String(order._id).slice(-8).toUpperCase()}`,
    });

    await Order.findByIdAndUpdate(order._id, {
      returnStatus: 'requested',
      customerReturnId: ret._id,
    });

    res.status(201).json(ret);
  } catch (error) { next(error); }
};

// @desc    List customer returns
// @route   GET /api/returns/customer
// @access  Private/Admin/Manager/Cashier
const listCustomerReturns = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const filter = {};

    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id }).select('_id').lean();
      if (store) filter.storeId = store._id;
    } else if (req.user.role === 'cashier' || req.user.role === 'stockEmployee' || req.user.role === 'deliveryGuy') {
      // Staff: restrict to their assigned store if present; otherwise only own created records
      if (req.user.assignedStore) filter.storeId = req.user.assignedStore;
      else filter.createdBy = req.user._id;
    } else if (req.query.storeId) {
      filter.storeId = req.query.storeId;
    }

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const returns = await CustomerReturn.find(filter)
      .populate('orderId', 'totalAmount createdAt orderStatus paymentStatus')
      .populate('customerId', 'name email')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(300);

    res.json(returns);
  } catch (error) { next(error); }
};

// @desc    Approve a customer return (apply stock + resolution + email)
// @route   PUT /api/returns/customer/:id/approve
// @access  Private/Admin
const approveCustomerReturn = async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); return next(new Error('Return not found')); }
    if (ret.status !== 'requested' && ret.status !== 'on_hold' && ret.status !== 'approved') {
      res.status(400);
      return next(new Error('Return cannot be approved in current status'));
    }

    const { resolution, storeCreditPoints, upgradeAdditionalAmount, upgradePaymentMethod, markResolved = false, notes } = req.body;
    if (!resolution || !['store_credit', 'exchange', 'upgrade'].includes(resolution)) {
      res.status(400);
      return next(new Error('resolution is required'));
    }

    // Stock adjustment
    for (const it of ret.items) {
      if (it.condition === 'good') {
        await Product.findByIdAndUpdate(it.productId, { $inc: { stock: it.qty } });
      }
    }

    // Store credit (points)
    if (resolution === 'store_credit') {
      const points = Number(storeCreditPoints || 0);
      if (points <= 0) {
        res.status(400);
        return next(new Error('storeCreditPoints must be > 0'));
      }
      const user = await User.findById(ret.customerId);
      if (user) {
        user.loyaltyPoints = (user.loyaltyPoints || 0) + points;
        await user.save();
        await LoyaltyTransaction.create({
          userId: user._id,
          type: 'bonus',
          points,
          description: `Store credit for return ${ret.holdBillNo || ret._id.toString().slice(-8)}`,
          balanceAfter: user.loyaltyPoints,
        });
      }
      ret.storeCreditPoints = points;
    }

    // Upgrade info
    if (resolution === 'upgrade') {
      ret.upgradeAdditionalAmount = Number(upgradeAdditionalAmount || 0);
      ret.upgradePaymentMethod = upgradePaymentMethod || ret.upgradePaymentMethod;
    }

    // Record ledger income for remainder difference
    const totalReturnValue = ret.items.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
    let creditedOrRefundedAmount = totalReturnValue;

    if (resolution === 'store_credit') {
      const settings = await Settings.findOne().lean();
      const pointValue = settings?.loyaltyPointValue || 1;
      creditedOrRefundedAmount = Number(storeCreditPoints || 0) * pointValue;
    } else if (req.body.refundAmount !== undefined) {
      creditedOrRefundedAmount = Number(req.body.refundAmount);
    }

    const remainder = totalReturnValue - creditedOrRefundedAmount;
    if (remainder > 0) {
      const { recordTransaction } = require('../services/ledgerService');
      const Account = require('../models/Account');
      const defaultAccount = await Account.findOne({ isDefault: true }).lean() || await Account.findOne().lean();

      await recordTransaction({
        storeId: ret.storeId || null,
        accountId: defaultAccount?._id || undefined,
        type: 'income',
        category: 'Returns & Exchange',
        amount: remainder,
        paymentMethod: 'Cash',
        description: `Unpaid remainder from return approval ${ret.holdBillNo || ret._id.toString().slice(-8)}. Return Value: Rs. ${totalReturnValue.toFixed(2)}, Refunded/Credited: Rs. ${creditedOrRefundedAmount.toFixed(2)}`,
        createdBy: req.user._id,
      });
    }

    ret.resolution = resolution;
    ret.status = markResolved ? 'resolved' : 'on_hold';
    ret.holdStatus = markResolved ? 'closed' : 'open';
    ret.approvedBy = req.user._id;
    if (notes) ret.notes = notes;

    await ret.save();

    // Email customer
    const order = await Order.findById(ret.orderId).populate('userId', 'name email').lean();
    const customer = order?.userId;
    if (customer?.email) {
      const template = customerReturnUpdateEmail({
        order,
        returnDoc: ret.toObject(),
      });
      await sendEmail(customer.email, template.subject, template.html);
    }

    await Order.findByIdAndUpdate(ret.orderId, {
      returnStatus: ret.status === 'resolved' ? 'resolved' : 'on_hold',
      customerReturnId: ret._id,
      returnedAt: new Date(),
    });

    const populated = await CustomerReturn.findById(ret._id)
      .populate('orderId', 'totalAmount createdAt orderStatus paymentStatus')
      .populate('customerId', 'name email')
      .populate('createdBy', 'name role')
      .populate('approvedBy', 'name role');

    res.json(populated);
  } catch (error) { next(error); }
};

// @desc    Reject a customer return (email)
// @route   PUT /api/returns/customer/:id/reject
// @access  Private/Admin
const rejectCustomerReturn = async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); return next(new Error('Return not found')); }
    if (ret.status !== 'requested' && ret.status !== 'on_hold' && ret.status !== 'approved') {
      res.status(400);
      return next(new Error('Return cannot be rejected in current status'));
    }
    ret.status = 'rejected';
    ret.holdStatus = 'closed';
    ret.rejectionReason = req.body.reason || 'Request rejected';
    ret.approvedBy = req.user._id;
    await ret.save();

    const order = await Order.findById(ret.orderId).populate('userId', 'name email').lean();
    const customer = order?.userId;
    if (customer?.email) {
      const template = customerReturnUpdateEmail({
        order,
        returnDoc: ret.toObject(),
      });
      await sendEmail(customer.email, template.subject, template.html);
    }

    await Order.findByIdAndUpdate(ret.orderId, {
      returnStatus: 'rejected',
      customerReturnId: ret._id,
      returnedAt: new Date(),
    });

    res.json(ret);
  } catch (error) { next(error); }
};

// @desc    Manager approve customer return request
// @route   PUT /api/returns/customer/:id/manager-approve
// @access  Private/Manager
const managerApproveCustomerReturn = async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); return next(new Error('Return not found')); }
    if (ret.status !== 'requested') {
      res.status(400);
      return next(new Error('Only requested returns can be approved'));
    }
    const store = await Store.findOne({ managerId: req.user._id }).select('_id').lean();
    if (!store || String(store._id) !== String(ret.storeId)) {
      res.status(403);
      return next(new Error('Not authorized for this return'));
    }

    ret.status = 'approved';
    ret.approvedBy = req.user._id;
    if (req.body?.notes) ret.notes = req.body.notes;
    await ret.save();

    await Order.findByIdAndUpdate(ret.orderId, {
      returnStatus: 'approved',
      customerReturnId: ret._id,
      returnedAt: new Date(),
    });

    res.json(ret);
  } catch (error) { next(error); }
};

// @desc    Manager reject customer return request
// @route   PUT /api/returns/customer/:id/manager-reject
// @access  Private/Manager
const managerRejectCustomerReturn = async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) { res.status(404); return next(new Error('Return not found')); }
    if (ret.status !== 'requested') {
      res.status(400);
      return next(new Error('Only requested returns can be rejected'));
    }
    const store = await Store.findOne({ managerId: req.user._id }).select('_id').lean();
    if (!store || String(store._id) !== String(ret.storeId)) {
      res.status(403);
      return next(new Error('Not authorized for this return'));
    }

    ret.status = 'rejected';
    ret.rejectionReason = req.body?.reason || 'Rejected by manager';
    ret.approvedBy = req.user._id;
    await ret.save();

    await Order.findByIdAndUpdate(ret.orderId, {
      returnStatus: 'rejected',
      customerReturnId: ret._id,
      returnedAt: new Date(),
    });

    res.json(ret);
  } catch (error) { next(error); }
};

// @desc    Export customer returns report as branded PDF
// @route   GET /api/returns/customer/export
// @access  Private/Admin
const exportCustomerReturnsPdf = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const returns = await CustomerReturn.find(filter)
      .populate('customerId', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(500);
    const settings = await Settings.findOne().lean();

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="customer-returns-report.pdf"');
    doc.pipe(res);

    const companyName = settings?.shopName || 'Mobile Hub';
    const logoPath = settings?.logo ? path.join(__dirname, '..', settings.logo.replace(/^\//, '')) : null;
    if (logoPath) {
      try { doc.image(logoPath, 40, 34, { width: 50 }); } catch (err) { /* ignore missing logo */ }
    }
    doc.fontSize(16).text(companyName, 100, 40);
    doc.fontSize(9).fillColor('#555').text(settings?.address || '', 100, 62);
    doc.fillColor('#000');
    doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#CCCCCC').stroke();

    doc.fontSize(14).text('Customer Return Report', 40, 110, { align: 'center' });
    doc.fontSize(10).text(`Date range: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, { align: 'center' });
    doc.moveDown(1);

    returns.forEach((ret, index) => {
      if (doc.y > 740) doc.addPage();
      doc.fontSize(11).text(`${index + 1}. ${ret.holdBillNo || ret._id.toString().slice(-8)} | ${new Date(ret.createdAt).toLocaleDateString()} | ${ret.status}`);
      doc.fontSize(9).text(`Customer: ${ret.customerId?.name || 'N/A'} | Product(s): ${(ret.items || []).map((it) => it.orderItemName).join(', ') || 'N/A'}`);
      doc.fontSize(9).text(`Reason: ${(ret.items || []).map((it) => it.reason).filter(Boolean).join('; ') || ret.notes || 'N/A'}`);
      doc.fontSize(9).text(`Processed By: ${ret.approvedBy?.name || 'Pending'}`);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (error) { next(error); }
};

// @desc    Delete customer return request
// @route   DELETE /api/returns/customer/:id
// @access  Private/Admin
const deleteCustomerReturn = async (req, res, next) => {
  try {
    const ret = await CustomerReturn.findById(req.params.id);
    if (!ret) {
      res.status(404);
      return next(new Error('Return request not found'));
    }
    
    if (ret.orderId) {
      await Order.findByIdAndUpdate(ret.orderId, {
        $unset: { returnStatus: '', customerReturnId: '' }
      });
    }

    await ret.deleteOne();
    res.json({ success: true, message: 'Return request deleted' });
  } catch (error) { next(error); }
};

module.exports = {
  getReturnOrder,
  createCustomerReturn,
  listCustomerReturns,
  approveCustomerReturn,
  rejectCustomerReturn,
  managerApproveCustomerReturn,
  managerRejectCustomerReturn,
  exportCustomerReturnsPdf,
  deleteCustomerReturn,
};

