const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Store = require('../models/Store');
const PosSession = require('../models/PosSession');
const { isValidSLPhone, formatSLPhone, isStrictSLE164Phone, isValidEmail } = require('../utils/validators');
const { sendSms, buildPosReceiptMessage } = require('../utils/smsService');
const { sendEmail, posReceiptEmail } = require('../utils/emailService');
const Quotation = require('../models/Quotation');
const Transaction = require('../models/Transaction');
const HirePurchase = require('../models/HirePurchase');


// Helper: resolve store ID for the current user (cashier, manager, or admin)
const resolveStoreId = async (user) => {
  // Cashier / stockEmployee — use assignedStore
  if (user.assignedStore) return user.assignedStore;

  // Manager — find store they manage
  if (user.role === 'manager') {
    const store = await Store.findOne({ managerId: user._id });
    return store?._id || null;
  }

  // Admin — use first store (they can access any)
  if (user.role === 'admin') {
    const store = await Store.findOne({ isActive: true });
    return store?._id || null;
  }

  // Cashier / stockEmployee fallback if assignedStore is not set
  if (user.role === 'cashier' || user.role === 'stockEmployee') {
    const store = await Store.findOne({ isActive: true });
    return store?._id || null;
  }

  return null;
};

const ALLOWED_DENOMS_LKR = [5000, 1000, 500, 100, 50, 20];
const calcDenomsTotal = (lines = []) =>
  (lines || []).reduce((s, l) => s + (Number(l.denom || 0) * Number(l.qty || 0)), 0);

// @desc    Get active POS session
// @route   GET /api/pos/session/active
// @access  Private/Cashier/Manager/Admin
const getActiveSession = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req.user);
    if (!storeId) { res.status(400); return next(new Error('No store found for your account')); }
    const session = await PosSession.findOne({ storeId, cashierId: req.user._id, status: 'open' }).sort({ startedAt: -1 });
    res.json(session || null);
  } catch (error) { next(error); }
};

// @desc    Start POS session (opening cash + denominations)
// @route   POST /api/pos/session/start
// @access  Private/Cashier/Manager/Admin
const startSession = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req.user);
    if (!storeId) { res.status(400); return next(new Error('No store found for your account')); }

    const existing = await PosSession.findOne({ storeId, cashierId: req.user._id, status: 'open' });
    if (existing) return res.status(200).json(existing);

    const openingDenoms = Array.isArray(req.body.openingDenoms) ? req.body.openingDenoms : [];
    for (const l of openingDenoms) {
      if (!ALLOWED_DENOMS_LKR.includes(Number(l.denom))) { res.status(400); return next(new Error('Invalid denomination')); }
      if (Number(l.qty) < 0) { res.status(400); return next(new Error('Invalid denomination qty')); }
    }
    const openingCashAmount = req.body.openingCashAmount !== undefined
      ? Number(req.body.openingCashAmount || 0)
      : calcDenomsTotal(openingDenoms);

    const session = await PosSession.create({
      storeId,
      cashierId: req.user._id,
      startedAt: new Date(),
      status: 'open',
      openingCashAmount,
      openingDenoms,
    });

    res.status(201).json(session);
  } catch (error) { next(error); }
};

// @desc    End POS session (closing cash count + reconciliation)
// @route   POST /api/pos/session/end
// @access  Private/Cashier/Manager/Admin
const endSession = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req.user);
    if (!storeId) { res.status(400); return next(new Error('No store found for your account')); }

    const session = await PosSession.findOne({ storeId, cashierId: req.user._id, status: 'open' });
    if (!session) { res.status(404); return next(new Error('No open POS session found')); }

    const closingDenoms = Array.isArray(req.body.closingDenoms) ? req.body.closingDenoms : [];
    for (const l of closingDenoms) {
      if (!ALLOWED_DENOMS_LKR.includes(Number(l.denom))) { res.status(400); return next(new Error('Invalid denomination')); }
      if (Number(l.qty) < 0) { res.status(400); return next(new Error('Invalid denomination qty')); }
    }

    const closingCashCountedAmount = req.body.closingCashCountedAmount !== undefined
      ? Number(req.body.closingCashCountedAmount || 0)
      : calcDenomsTotal(closingDenoms);

    const orders = await Order.find({ posSessionId: session._id, isPosOrder: true });
    let cashSales = 0;
    let nonCashSales = 0;
    orders.forEach((o) => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach((p) => {
          if (p.method === 'cash') cashSales += (p.amount || 0);
          else nonCashSales += (p.amount || 0);
        });
      } else {
        if (o.paymentMethod === 'cash') cashSales += (o.totalAmount || 0);
        else nonCashSales += (o.totalAmount || 0);
      }
    });

    const totalSales = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalItemsSold = orders.reduce((s, o) => s + (o.items || []).reduce((x, it) => x + (it.quantity || 0), 0), 0);

    const expectedCash = Number(session.openingCashAmount || 0) + Number(cashSales || 0);
    const variance = Number(closingCashCountedAmount || 0) - expectedCash;

    session.closingDenoms = closingDenoms;
    session.closingCashCountedAmount = closingCashCountedAmount;
    session.expectedCash = Number(expectedCash.toFixed(2));
    session.expectedNonCash = Number(nonCashSales.toFixed(2));
    session.totalSales = Number(totalSales.toFixed(2));
    session.totalItemsSold = totalItemsSold;
    session.variance = Number(variance.toFixed(2));
    session.varianceFlagged = Math.abs(session.variance) > 0.01;
    session.varianceNote = req.body.varianceNote || session.varianceNote;
    session.status = 'closed';
    session.endedAt = new Date();

    await session.save();
    res.json(session);
  } catch (error) { next(error); }
};

// @desc    Get products for POS
// @route   GET /api/pos/products
// @access  Private/Cashier/Manager/Admin
const getPosProducts = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req.user);

    const { search, category } = req.query;

    const storeMatch = storeId
      ? { $or: [{ storeId }, { storeId: null }, { storeId: { $exists: false } }] }
      : {};

    const filter = {
      ...storeMatch,
      status: 'active',
    };

    if (category) {
      filter.categoryId = category;
    }

    let products;
    if (search) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { barcode: search },
            { sku: { $regex: search, $options: 'i' } },
          ],
        },
      ];
      products = await Product.find(filter)
        .select('name price mrp minPrice stock images unit barcode sku variants discount allowKokoPos imei categoryId storeId')
        .populate('categoryId', 'name')
        .limit(50)
        .lean();
    } else {
      products = await Product.find(filter)
        .select('name price mrp minPrice stock images unit barcode sku variants discount allowKokoPos imei categoryId storeId')
        .populate('categoryId', 'name')
        .limit(100)
        .lean();
    }

    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Look up a product by barcode
// @route   GET /api/pos/products/barcode/:code
// @access  Private/Cashier/Manager/Admin
const getProductByBarcode = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req.user);

    const storeMatch = storeId
      ? { $or: [{ storeId }, { storeId: null }, { storeId: { $exists: false } }] }
      : {};

    const product = await Product.findOne({
      barcode: req.params.code,
      ...storeMatch,
      status: 'active',
    })
      .select('name price mrp minPrice stock images unit barcode sku variants discount allowKokoPos imei categoryId storeId')
      .populate('categoryId', 'name')
      .lean();

    if (!product) {
      res.status(404);
      return next(new Error('Product not found with this barcode'));
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a quotation
// @route   POST /api/pos/quotation
// @access  Private/Cashier/Manager/Admin
const createQuotation = async (req, res, next) => {
  try {
    const { items, customerName, customerPhone, discount, discountType, notes } = req.body;
    
    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('No items for quotation'));
    }

    const storeId = await resolveStoreId(req.user);
    
    let subtotal = 0;
    const quotItems = [];
    for (const item of items) {
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      quotItems.push({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: lineTotal
      });
    }

    let discountAmt = 0;
    if (discountType === 'percentage') {
      discountAmt = (subtotal * discount) / 100;
    } else {
      discountAmt = discount || 0;
    }

    const totalAmount = subtotal - discountAmt;
    
    // Generate quotation number (QUO-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Quotation.countDocuments({ createdAt: { $gte: new Date().setHours(0,0,0,0) } });
    const quotationNumber = `QUO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const quotation = await Quotation.create({
      quotationNumber,
      storeId,
      customerName: customerName || 'Walk-in',
      customerPhone,
      items: quotItems,
      subtotal,
      discount: discountAmt,
      totalAmount,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
      createdBy: req.user._id,
      notes
    });


    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
};


// @desc    Process POS checkout
// @route   POST /api/pos/checkout
// @access  Private/Cashier
const posCheckout = async (req, res, next) => {
  try {
    const {
      items,
      paymentMethod,
      tenderedAmount,
      discount,
      discountType,
      couponCode,
      customerName,
      customerPhone,
      customerNic,
      customerAddress,
      sendSmsReceipt = false,
      sendReceiptEmail = false,
      receiptEmail,
      printReceipt = true,
      isCredit = false,
      amountPaid = 0,
      creditNote = '',
      loyaltyPointsRedeemed,
      loyaltyDiscount,
      accountId,
      chequeDetails,
      hirePurchaseData,
      payments = [], // Split payment rows
      exchangeReturnId, // Return reference
      exchangeCredit = 0, // Return store credit
      taxRate: customTaxRate, // Custom tax rate override
    } = req.body;

    const finalAccountId = (accountId && accountId !== "") ? accountId : undefined;
    const exchangeCreditAmt = Number(exchangeCredit || 0);

    let normalizedCustomerPhone = customerPhone ? formatSLPhone(customerPhone) : undefined;
    if (customerPhone && !isValidSLPhone(customerPhone)) {
      res.status(400);
      return next(new Error('Customer phone must be a valid Sri Lankan mobile number.'));
    }
    if (sendSmsReceipt && !normalizedCustomerPhone) {
      res.status(400);
      return next(new Error('Customer phone is required when SMS receipt is enabled.'));
    }
    if (sendSmsReceipt && !isStrictSLE164Phone(normalizedCustomerPhone)) {
      res.status(400);
      return next(new Error('Customer phone must be in +947XXXXXXXX format for SMS receipts.'));
    }
    if (sendReceiptEmail && receiptEmail && !isValidEmail(receiptEmail)) {
      res.status(400);
      return next(new Error('Please enter a valid email address for receipt delivery.'));
    }

    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('No items in cart'));
    }

    const storeId = await resolveStoreId(req.user);
    if (!storeId) {
      res.status(400);
      return next(new Error('No store found for your account'));
    }

    const activeSession = await PosSession.findOne({ storeId, cashierId: req.user._id, status: 'open' });
    if (!activeSession) {
      res.status(400);
      return next(new Error('No open POS session. Please start the day (opening cash) before checkout.'));
    }

    const store = await Store.findById(storeId);
    if (!store) {
      res.status(404);
      return next(new Error('Store not found'));
    }

    // Determine if any item is a mobile device and validate stock
    let hasMobiles = false;
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).populate('categoryId');
      if (!product) {
        res.status(404);
        return next(new Error(`Product not found: ${item.name || item.productId}`));
      }

      const catName = product.categoryId?.name || '';
      const isMobile = /mobile|phone|tablet|smartphone/i.test(catName) || !!product.ram || !!product.storage || (product.imei && product.imei.length > 0);
      if (isMobile) hasMobiles = true;

      // Validate stock
      if (product.stock < item.quantity) {
        res.status(400);
        return next(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`));
      }

      // Validate Koko POS eligibility
      if (paymentMethod === 'koko' && product.allowKokoPos === false) {
        res.status(400);
        return next(new Error(`${product.name} is not eligible for Koko Pay in POS.`));
      }

      // Enforce IMEI list scan if mobile device
      if (isMobile) {
        if (!item.imei || item.imei.length !== item.quantity) {
          res.status(400);
          return next(new Error(`Please scan/select exactly ${item.quantity} IMEI number(s) for ${product.name}.`));
        }
        for (const im of item.imei) {
          if (product.imei && product.imei.length > 0 && !product.imei.includes(im)) {
            res.status(400);
            return next(new Error(`IMEI ${im} is not available in stock for ${product.name}.`));
          }
        }
      }

      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        quantity: item.quantity,
        price: item.price,
        unitCostAtSale: Number(product.avgCost || product.lastCost || 0),
        imei: item.imei || [],
      });
    }

    // Require Customer details for mobiles, credit sales, or Hire Purchase
    const isHP = paymentMethod === 'hire_purchase';
    if (hasMobiles || isCredit || isHP) {
      if (!customerName || !customerPhone) {
        res.status(400);
        return next(new Error('Customer name and phone number are required for credit sales, mobile device purchases, or Installment/HP sales.'));
      }
    }

    // Calculate manual discount
    let discountAmount = 0;
    if (discount && discount > 0) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discount) / 100;
      } else {
        discountAmount = discount;
      }
    }

    // Apply coupon/voucher discount
    let couponDiscount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      try {
        const Voucher = require('../models/Voucher');
        const voucher = await Voucher.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
        });
        if (voucher) {
          if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
            // Expired — skip
          } else if (voucher.usedCount >= voucher.maxUses) {
            // Max uses reached — skip
          } else if (voucher.minOrderAmount && subtotal < voucher.minOrderAmount) {
            // Min order not met — skip
          } else {
            if (voucher.type === 'percentage') {
              couponDiscount = (subtotal * voucher.value) / 100;
              if (voucher.maxDiscountAmount) {
                couponDiscount = Math.min(couponDiscount, voucher.maxDiscountAmount);
              }
            } else {
              couponDiscount = Math.min(voucher.value, subtotal);
            }
            voucher.usedCount = (voucher.usedCount || 0) + 1;
            await voucher.save();
            appliedCoupon = voucher.code;
          }
        }
      } catch (err) { /* ignore */ }
    }

    const totalDiscount = discountAmount + couponDiscount;

    // Minimum Price Safeguard Check
    const discountRatio = subtotal > 0 ? (totalDiscount / subtotal) : 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      const effectiveUnitPrice = item.price * (1 - discountRatio);
      if (effectiveUnitPrice < (product.minPrice || 0)) {
        res.status(400);
        return next(new Error(`Cannot sell for this price. ${product.name} minimum price is LKR ${product.minPrice}. (Meka me ganata denna ba)`));
      }
    }

    // Dynamic tax from settings or custom input override
    let taxRate = 0.05; // default 5%
    if (customTaxRate !== undefined) {
      taxRate = Number(customTaxRate) / 100;
    } else {
      try {
        const Settings = require('../models/Settings');
        const settings = await Settings.findOne();
        if (settings?.taxRate !== undefined) taxRate = settings.taxRate;
        
        // Apply Koko Interest
        if (paymentMethod === 'koko' && settings?.kokoInterestRate > 0) {
          const kokoInterest = (subtotal - totalDiscount) * (settings.kokoInterestRate / 100);
          subtotal += kokoInterest;
        }
      } catch (err) { /* use default */ }
    }

    const taxableAmount = Math.max(0, subtotal - totalDiscount);
    const tax = parseFloat((taxableAmount * taxRate).toFixed(2));
    let totalAmount = parseFloat((taxableAmount + tax).toFixed(2));

    // Deduct exchange return credit from grand total
    if (exchangeCreditAmt > 0) {
      totalAmount = parseFloat(Math.max(0, totalAmount - exchangeCreditAmt).toFixed(2));
    }

    // Determine payments made
    const actualPayments = payments.length > 0 ? payments : [{
      method: paymentMethod || 'cash',
      amount: isCredit ? Number(amountPaid || 0) : totalAmount,
      accountId: finalAccountId,
      chequeDetails
    }];

    const totalPaidFromPayments = actualPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate change given for cash split
    let changeGiven = 0;
    const cashPayment = actualPayments.find(p => p.method === 'cash');
    if (cashPayment && tenderedAmount && tenderedAmount > cashPayment.amount) {
      changeGiven = parseFloat((tenderedAmount - cashPayment.amount).toFixed(2));
    } else if (!payments.length && (paymentMethod || 'cash') === 'cash' && tenderedAmount && tenderedAmount > totalAmount && !isCredit) {
      changeGiven = parseFloat((tenderedAmount - totalAmount).toFixed(2));
    }

    // Generate invoice number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayPosCount = await Order.countDocuments({
      isPosOrder: true,
      createdAt: { $gte: todayStart },
    });
    const invoiceNumber = `INV-${dateStr}-${String(todayPosCount + 1).padStart(4, '0')}`;

    // Credit sale handling
    const isOrderCredit = isCredit || isHP;
    const creditBalance = isOrderCredit ? Math.max(0, totalAmount - (isHP ? (hirePurchaseData?.downPayment || 0) : totalPaidFromPayments)) : 0;

    // Create the POS order
    const order = await Order.create({
      userId: req.user._id,
      storeId,
      items: validatedItems,
      totalAmount,
      tax,
      deliveryFee: 0,
      paymentMethod: paymentMethod || (actualPayments[0]?.method) || 'cash',
      paymentStatus: isOrderCredit && creditBalance > 0 ? 'pending' : 'completed',
      orderStatus: 'completed',
      isPosOrder: true,
      invoiceNumber,
      cashierId: req.user._id,
      posSessionId: activeSession._id,
      tenderedAmount: isOrderCredit ? (isHP ? (hirePurchaseData?.downPayment || 0) : totalPaidFromPayments) : (tenderedAmount || totalAmount),
      changeGiven: isOrderCredit ? 0 : changeGiven,
      customerName: customerName || undefined,
      customerPhone: normalizedCustomerPhone || undefined,
      customerNic: customerNic || undefined,
      customerAddress: customerAddress || undefined,
      couponCode: appliedCoupon || undefined,
      sendReceiptEmail: !!sendReceiptEmail,
      receiptEmail: receiptEmail || undefined,
      sendSmsReceipt: !!sendSmsReceipt,
      printReceipt: !!printReceipt,
      isCredit: !!isOrderCredit,
      amountPaid: isOrderCredit ? (totalAmount - creditBalance) : totalAmount,
      creditBalance,
      creditNote: creditNote || undefined,
      loyaltyPointsRedeemed: loyaltyPointsRedeemed || 0,
      discountAmount: totalDiscount || 0,
      payments: actualPayments,
      exchangeReturnId: exchangeReturnId || undefined,
      exchangeCredit: exchangeCreditAmt,
    });

    // Deduct stock and remove sold IMEIs
    for (const item of validatedItems) {
      const updateData = {
        $inc: { stock: -item.quantity },
      };
      if (item.imei && item.imei.length > 0) {
        updateData.$pull = { imei: { $in: item.imei } };
      }
      await Product.findByIdAndUpdate(item.productId, updateData);
    }

    // Resolve CustomerReturn if exchangeReturnId was applied
    if (exchangeReturnId) {
      const CustomerReturn = require('../models/CustomerReturn');
      const ret = await CustomerReturn.findById(exchangeReturnId);
      if (ret && ret.status !== 'resolved') {
        // 1. Sync returned items back to stock (conditional on condition === 'good')
        for (const it of ret.items) {
          if (it.condition === 'good') {
            await Product.findByIdAndUpdate(it.productId, { $inc: { stock: it.qty } });
          }
        }

        // 2. Record remainder difference as ledger income
        const totalReturnValue = ret.items.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
        const remainder = totalReturnValue - exchangeCreditAmt;
        if (remainder > 0) {
          const { recordTransaction } = require('../services/ledgerService');
          const Account = require('../models/Account');
          const defaultAccount = await Account.findOne({ isDefault: true }).lean() || await Account.findOne().lean();

          await recordTransaction({
            storeId,
            accountId: defaultAccount?._id || undefined,
            type: 'income',
            category: 'Returns & Exchange',
            amount: remainder,
            paymentMethod: 'Cash',
            description: `Unpaid remainder from POS return/exchange ${ret.holdBillNo || ret._id.toString().slice(-8)}. Return Value: Rs. ${totalReturnValue.toFixed(2)}, Applied Credit: Rs. ${exchangeCreditAmt.toFixed(2)}`,
            createdBy: req.user._id,
          });
        }

        ret.status = 'resolved';
        ret.resolution = 'exchange';
        await ret.save();
      }
    }

    // Return full order with store info for invoice
    const populatedOrder = await Order.findById(order._id)
      .populate('storeId', 'name address phone email logo')
      .populate('cashierId', 'name')
      .lean();

    populatedOrder.subtotal = subtotal;
    populatedOrder.discountAmount = discountAmount;
    populatedOrder.discountType = discountType || null;
    populatedOrder.discountValue = discount || 0;
    populatedOrder.couponCode = appliedCoupon;
    populatedOrder.couponDiscount = couponDiscount;
    populatedOrder.sendReceiptEmail = !!sendReceiptEmail;
    populatedOrder.receiptEmail = receiptEmail || undefined;
    populatedOrder.sendSmsReceipt = !!sendSmsReceipt;
    populatedOrder.printReceipt = !!printReceipt;

    if (sendSmsReceipt && normalizedCustomerPhone) {
      try {
        await sendSms(normalizedCustomerPhone, await buildPosReceiptMessage(totalAmount, {
          invoiceNo: invoiceNumber,
          orderNo: order._id.toString().slice(-8).toUpperCase(),
        }));
      } catch (smsErr) {
        populatedOrder.smsReceiptError = smsErr.message;
      }
    }

    if (sendReceiptEmail) {
      try {
        const cashier = await User.findById(req.user._id).select('name email phone').lean();
        const targetEmail = receiptEmail || cashier?.email;
        if (targetEmail) {
          const template = posReceiptEmail(populatedOrder, {
            name: customerName || 'Walk-in Customer',
            email: targetEmail,
            phone: normalizedCustomerPhone || '',
          });
          const sent = await sendEmail(targetEmail, template.subject, template.html);
          if (sent) {
            await Order.findByIdAndUpdate(order._id, { receiptEmailSentAt: new Date(), receiptEmailError: undefined });
          } else {
            await Order.findByIdAndUpdate(order._id, { receiptEmailError: 'Email service failed to deliver receipt' });
            populatedOrder.receiptEmailError = 'Email service failed to deliver receipt';
          }
        }
      } catch (emailErr) {
        populatedOrder.receiptEmailError = emailErr.message;
      }
    }

    if (paymentMethod === 'hire_purchase') {
      populatedOrder.hirePurchaseData = hirePurchaseData;
    }

    // Record in Transaction Ledger via Ledger Service
    const { recordTransaction } = require('../services/ledgerService');

    for (const p of actualPayments) {
      if (p.amount > 0 && p.method !== 'hire_purchase') {
        await recordTransaction({
          storeId,
          accountId: p.accountId,
          type: 'income',
          category: isOrderCredit ? 'Sales (Partial Credit)' : 'Sales',
          amount: p.amount,
          paymentMethod: p.method,
          chequeDetails: p.chequeDetails,
          referenceNo: invoiceNumber,
          description: `POS Sale - ${invoiceNumber}`,
          createdBy: req.user._id,
        });
      }
    }

    // Hire Purchase Initialization
    if (paymentMethod === 'hire_purchase' && hirePurchaseData) {
      if (!hirePurchaseData.customer?.name || !hirePurchaseData.customer?.phone || !hirePurchaseData.customer?.nic) {
        res.status(400);
        return next(new Error('Customer name, phone, and NIC are required for Hire Purchase agreements.'));
      }
      const hpStartDate = hirePurchaseData.startDate ? new Date(hirePurchaseData.startDate) : new Date();
      const hpNextDueDate = new Date(hpStartDate);
      if (hirePurchaseData.installmentType === 'Weekly') {
        hpNextDueDate.setDate(hpNextDueDate.getDate() + 7);
      } else {
        hpNextDueDate.setMonth(hpNextDueDate.getMonth() + 1);
      }

      await HirePurchase.create({
        storeId,
        orderId: order._id,
        invoiceNumber: invoiceNumber,
        customer: hirePurchaseData.customer,
        totalAmount: totalAmount,
        interestRate: hirePurchaseData.interestRate || 0,
        interestAmount: hirePurchaseData.interestAmount || 0,
        netTotal: hirePurchaseData.netTotal || totalAmount,
        downPayment: hirePurchaseData.downPayment || 0,
        balanceAmount: (hirePurchaseData.netTotal || totalAmount) - (hirePurchaseData.downPayment || 0),
        installmentType: hirePurchaseData.installmentType || 'Monthly',
        numberOfInstallments: hirePurchaseData.numberOfInstallments !== undefined ? hirePurchaseData.numberOfInstallments : 1,
        installmentAmount: hirePurchaseData.installmentAmount || 0,
        totalPaid: hirePurchaseData.downPayment || 0,
        startDate: hpStartDate,
        nextDueDate: hpNextDueDate,
        createdBy: req.user._id,
        notes: hirePurchaseData.notes
      });
    }

    res.status(201).json(populatedOrder);

  } catch (error) {
    next(error);
  }
};


// @desc    Get POS orders for today's shift
// @route   GET /api/pos/orders
// @access  Private/Cashier
const getPosOrders = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      cashierId: req.user._id,
      isPosOrder: true,
      createdAt: { $gte: today },
    })
      .sort({ createdAt: -1 })
      .populate('storeId', 'name')
      .lean();

    const productIds = [
      ...new Set(
        orders
          .flatMap((o) => (o.items || [])
            .filter((it) => it.unitCostAtSale === undefined || it.unitCostAtSale === null)
            .map((it) => String(it.productId || ''))
            .filter(Boolean))
      ),
    ];
    const products = productIds.length > 0
      ? await Product.find({ _id: { $in: productIds } }).select('_id avgCost lastCost').lean()
      : [];
    const productCostMap = new Map(
      products.map((p) => [String(p._id), Number(p.avgCost || p.lastCost || 0)])
    );

    // Calculate shift summary
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    let cashSales = 0;
    let cardSales = 0;
    let kokoSales = 0;
    orders.forEach((o) => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach((p) => {
          if (p.method === 'cash') cashSales += (p.amount || 0);
          else if (p.method === 'card') cardSales += (p.amount || 0);
          else if (p.method === 'koko') kokoSales += (p.amount || 0);
        });
      } else {
        if (o.paymentMethod === 'cash') cashSales += (o.totalAmount || 0);
        else if (o.paymentMethod === 'card') cardSales += (o.totalAmount || 0);
        else if (o.paymentMethod === 'koko') kokoSales += (o.totalAmount || 0);
      }
    });
    const totalItemsSold = orders.reduce(
      (sum, o) => sum + (o.items || []).reduce((line, item) => line + Number(item.quantity || 0), 0),
      0
    );
    const enrichedOrders = orders.map((order) => {
      const itemDetails = (order.items || []).map((it) => {
        const qty = Number(it.quantity || 0);
        const unitPrice = Number(it.price || 0);
        const lineTotal = qty * unitPrice;
        const unitCost = it.unitCostAtSale !== undefined && it.unitCostAtSale !== null
          ? Number(it.unitCostAtSale || 0)
          : (productCostMap.get(String(it.productId || '')) || 0);
        const lineProfit = lineTotal - (unitCost * qty);
        return {
          name: it.name || 'Item',
          quantity: qty,
          unitPrice: Number(unitPrice.toFixed(2)),
          lineTotal: Number(lineTotal.toFixed(2)),
          estimatedUnitCost: Number(unitCost.toFixed(2)),
          estimatedProfit: Number(lineProfit.toFixed(2)),
        };
      });
      const estimatedProfit = itemDetails.reduce((sum, it) => sum + Number(it.estimatedProfit || 0), 0);
      return {
        ...order,
        itemDetails,
        estimatedProfit: Number(estimatedProfit.toFixed(2)),
      };
    });
    const profitOfDay = enrichedOrders.reduce((sum, o) => sum + Number(o.estimatedProfit || 0), 0);

    res.json({
      orders: enrichedOrders,
      summary: {
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalOrders,
        cashSales: parseFloat(cashSales.toFixed(2)),
        cardSales: parseFloat(cardSales.toFixed(2)),
        kokoSales: parseFloat(kokoSales.toFixed(2)),
        totalItemsSold,
        systemRevenue: parseFloat(totalSales.toFixed(2)),
        profitOfDay: parseFloat(profitOfDay.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single POS order (invoice)
// @route   GET /api/pos/orders/:id
// @access  Private/Cashier
const getPosOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('storeId', 'name address phone email logo')
      .populate('cashierId', 'name')
      .lean();

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (!order.isPosOrder) {
      res.status(400);
      return next(new Error('This is not a POS order'));
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Get cashier-wise sales report
// @route   GET /api/pos/cashier-report
// @access  Private/Admin/Manager
const getCashierSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { isPosOrder: true, orderStatus: { $ne: 'cancelled' } };

    if (req.user.role === 'manager') {
      const storeId = await resolveStoreId(req.user);
      if (storeId) filter.storeId = storeId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    } else {
      // Default: last 30 days
      const d = new Date();
      d.setDate(d.getDate() - 30);
      filter.createdAt = { $gte: d };
    }

    const report = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$cashierId',
          totalSales: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 },
          totalItems: { $sum: { $reduce: { input: '$items', initialValue: 0, in: { $add: ['$$value', '$$this.quantity'] } } } },
          avgTransaction: { $avg: '$totalAmount' },
          cashSales: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$totalAmount', 0] } },
          cardSales: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$totalAmount', 0] } },
          lastSale: { $max: '$createdAt' },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    // Populate cashier names
    const cashierIds = report.map((r) => r._id).filter(Boolean);
    const cashiers = await User.find({ _id: { $in: cashierIds } }).select('name email role').lean();
    const cashierMap = {};
    cashiers.forEach((c) => { cashierMap[String(c._id)] = c; });

    const enriched = report.map((r) => ({
      cashier: cashierMap[String(r._id)] || { name: 'Unknown', email: '' },
      totalSales: Math.round(r.totalSales * 100) / 100,
      transactionCount: r.transactionCount,
      totalItems: r.totalItems,
      avgTransaction: Math.round(r.avgTransaction * 100) / 100,
      cashSales: Math.round(r.cashSales * 100) / 100,
      cardSales: Math.round(r.cardSales * 100) / 100,
      lastSale: r.lastSale,
    }));

    const totals = {
      totalSales: enriched.reduce((s, r) => s + r.totalSales, 0),
      totalTransactions: enriched.reduce((s, r) => s + r.transactionCount, 0),
      totalItems: enriched.reduce((s, r) => s + r.totalItems, 0),
    };

    res.json({ cashiers: enriched, totals });
  } catch (error) { next(error); }
};

// @desc    Get credit orders (unpaid/partial)
// @route   GET /api/pos/credit-orders
// @access  Private/Cashier/Manager/Admin
const getCreditOrders = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req.user);
    const filter = { isPosOrder: true, isCredit: true, storeId };
    if (req.query.status === 'pending') {
      filter.creditBalance = { $gt: 0 };
    } else if (req.query.status === 'settled') {
      filter.creditBalance = 0;
    }
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('cashierId', 'name')
      .lean();
    res.json(orders);
  } catch (error) { next(error); }
};

// @desc    Settle credit order (mark remaining as paid)
// @route   PUT /api/pos/credit-orders/:id/settle
// @access  Private/Cashier/Manager/Admin
const settleCreditOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404); return next(new Error('Order not found')); }
    if (!order.isCredit) { res.status(400); return next(new Error('This is not a credit order')); }

    const payAmount = Number(req.body.amount || order.creditBalance);
    if (payAmount <= 0) { res.status(400); return next(new Error('Invalid payment amount')); }

    order.amountPaid = Number(order.amountPaid || 0) + payAmount;
    order.creditBalance = Math.max(0, Number(order.totalAmount) - Number(order.amountPaid));
    if (order.creditBalance <= 0) {
      order.creditBalance = 0;
      order.paymentStatus = 'completed';
      order.creditPaidAt = new Date();
    }
    if (req.body.note) order.creditNote = (order.creditNote || '') + ' | ' + req.body.note;
    await order.save();

    // Record in Transaction Ledger
    await Transaction.create({
      storeId: order.storeId,
      type: 'income',
      category: 'Credit Settle',
      amount: payAmount,
      paymentMethod: 'Cash', // Default to cash for credit settle in POS
      referenceNo: order.invoiceNumber,
      description: `Credit Settle for ${order.invoiceNumber}`,
      createdBy: req.user._id,
      date: new Date()
    });

    res.json(order);
  } catch (error) { next(error); }
};


// @desc    Get POS order by invoice number
// @route   GET /api/pos/orders/invoice/:invoiceNumber
// @access  Private/Cashier/Manager/Admin
const getPosOrderByInvoice = async (req, res, next) => {
  try {
    const rawInvoice = req.params.invoiceNumber || '';
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '..', 'debug.log');
    
    const writeLog = (msg) => {
      const ts = new Date().toISOString();
      fs.appendFileSync(logPath, `[${ts}] ${msg}\n`);
    };

    writeLog(`Received search request for rawInvoice: "${rawInvoice}"`);
    
    // Normalize and build relaxed search pattern
    let clean = rawInvoice.toUpperCase().trim().replace(/^[#\s]+/, '').replace(/^INV-?/, '').replace(/\s+/g, '');
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

    writeLog(`Normalized to: "${clean}". Regex pattern: "${pattern}"`);

    const searchTerms = [
      { invoiceNumber: { $regex: new RegExp(pattern, 'i') } },
      { invoiceNumber: { $regex: new RegExp(rawInvoice.trim().replace(/^[#\s]+/, ''), 'i') } },
      { 'items.imei': rawInvoice.trim() },
      { customerPhone: rawInvoice.trim() },
      { customerNic: { $regex: rawInvoice.trim(), $options: 'i' } }
    ];

    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(rawInvoice.trim())) {
      searchTerms.push({ _id: rawInvoice.trim() });
    }

    const order = await Order.findOne({ $or: searchTerms })
      .populate('storeId', 'name address phone email logo')
      .populate('cashierId', 'name')
      .lean();

    if (!order) {
      writeLog(`Order not found for pattern "${pattern}"`);
      res.status(404);
      return next(new Error('Invoice not found'));
    }

    writeLog(`Order found! Invoice: ${order.invoiceNumber}, ID: ${order._id}`);
    res.json(order);
  } catch (error) {
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '..', 'debug.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Error: ${error.message}\n`);
    } catch (e) {}
    next(error);
  }
};

// @desc    Send receipt via SMS or Email manually
// @route   POST /api/pos/orders/:id/send-receipt
// @access  Private/Cashier/Manager/Admin
const sendReceipt = async (req, res, next) => {
  try {
    const { type, recipient } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('storeId', 'name address phone email logo')
      .populate('cashierId', 'name')
      .lean();

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    if (type === 'sms') {
      if (!recipient || !isValidSLPhone(recipient)) {
        res.status(400);
        return next(new Error('Valid Sri Lankan phone number (+947XXXXXXXX) is required'));
      }
      const message = await buildPosReceiptMessage(order.totalAmount, {
        invoiceNo: order.invoiceNumber || order._id.toString().slice(-8).toUpperCase(),
        orderNo: order._id.toString().slice(-8).toUpperCase(),
      });
      await sendSms(formatSLPhone(recipient), message);
      res.json({ success: true, message: 'SMS receipt sent' });
    } else if (type === 'email') {
      if (!recipient || !isValidEmail(recipient)) {
        res.status(400);
        return next(new Error('Valid email address is required'));
      }
      const template = posReceiptEmail(order, {
        name: order.customerName || 'Customer',
        email: recipient,
        phone: order.customerPhone || '',
      });
      await sendEmail(recipient, template.subject, template.html);
      res.json({ success: true, message: 'Email receipt sent' });
    } else {
      res.status(400);
      return next(new Error('Invalid type. Must be sms or email'));
    }
  } catch (error) { next(error); }
};

module.exports = {
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
};
