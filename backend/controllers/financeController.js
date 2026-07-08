const Transaction = require('../models/Transaction');
const Store = require('../models/Store');
const Order = require('../models/Order');
const PettyCash = require('../models/PettyCash');
const TaxPayment = require('../models/TaxPayment');
const Account = require('../models/Account');

// @desc    Get full ledger dashboard
// @route   GET /api/finance/dashboard
// @access  Private
const getFinancialDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, period } = req.query;
    
    // Store scoping for managers
    let storeFilter = {};
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) storeFilter = { storeId: store._id };
    } else if (storeId && storeId !== 'all') {
      storeFilter = { storeId };
    }

    // Date filtering
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) {
      storeFilter.date = dateFilter;
    }

    const transactions = await Transaction.find(storeFilter).sort({ date: 1 });

    // Orders for Revenue
    const orderFilter = { ...storeFilter, orderStatus: { $nin: ['cancelled'] } };
    if (Object.keys(dateFilter).length > 0) orderFilter.createdAt = dateFilter;
    const orders = await Order.find(orderFilter);

    // Aggregates
    const orderRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const posRevenue = orders.filter(o => o.isPosOrder).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const onlineRevenue = orderRevenue - posRevenue;
    const orderCount = orders.length;
    const totalItemsSold = orders.reduce((sum, o) => sum + (o.items || []).reduce((x, it) => x + (it.quantity || 0), 0), 0);

    const manualIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const totalIncome = orderRevenue + manualIncome;
    const balance = totalIncome - totalExpense;

    // Segment profits: Mobiles vs Accessories
    const productIds = [];
    orders.forEach(o => {
      (o.items || []).forEach(it => {
        if (it.productId) productIds.push(it.productId);
      });
    });

    const Product = require('../models/Product');
    const products = await Product.find({ _id: { $in: productIds } }).populate('categoryId').lean();
    const productCategoryMap = new Map();
    products.forEach(p => {
      const catName = p.categoryId?.name || '';
      const isMobile = /mobile|phone|tablet|smartphone/i.test(catName) || !!p.ram || !!p.storage || (p.imei && p.imei.length > 0);
      productCategoryMap.set(p._id.toString(), isMobile ? 'mobiles' : 'accessories');
    });

    const profitSegments = {
      mobiles: { revenue: 0, profit: 0 },
      accessories: { revenue: 0, profit: 0 }
    };

    orders.forEach(o => {
      (o.items || []).forEach(it => {
        const prodId = it.productId ? it.productId.toString() : '';
        const segment = productCategoryMap.get(prodId) || 'accessories';
        const itemRevenue = (it.price || 0) * (it.quantity || 0);
        const unitCost = it.unitCostAtSale !== undefined && it.unitCostAtSale !== null ? it.unitCostAtSale : 0;
        const itemProfit = itemRevenue - (unitCost * (it.quantity || 0));

        profitSegments[segment].revenue += itemRevenue;
        profitSegments[segment].profit += itemProfit;
      });
    });

    // Fetch Income Tax Payments in range
    const taxFilter = {};
    if (storeFilter.storeId) taxFilter.storeId = storeFilter.storeId;
    if (Object.keys(dateFilter).length > 0) {
      taxFilter.paymentDate = dateFilter;
    }
    const taxPayments = await TaxPayment.find(taxFilter);
    const totalTaxPaid = taxPayments.reduce((sum, tp) => sum + (tp.amount || 0), 0);

    // Charts generation
    const p = ['daily', 'monthly', 'yearly'].includes(String(period)) ? String(period) : 'monthly';
    const makeKey = (d) => {
      if (p === 'daily') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (p === 'yearly') return `${d.getFullYear()}`;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    
    const formatLabel = (key) => {
      if (p === 'daily') return key;
      if (p === 'yearly') return key;
      const [yy, mm] = key.split('-');
      const dt = new Date(Number(yy), Number(mm) - 1, 1);
      return dt.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    };

    const seriesMap = new Map();
    // Add transactions
    for (const t of transactions) {
      const key = makeKey(new Date(t.date));
      const cur = seriesMap.get(key) || { key, label: formatLabel(key), income: 0, expense: 0, profit: 0, revenue: 0 };
      if (t.type === 'income') cur.income += t.amount;
      if (t.type === 'expense') cur.expense += t.amount;
      seriesMap.set(key, cur);
    }
    // Add orders
    for (const o of orders) {
      const key = makeKey(new Date(o.createdAt));
      const cur = seriesMap.get(key) || { key, label: formatLabel(key), income: 0, expense: 0, profit: 0, revenue: 0 };
      cur.revenue += o.totalAmount;
      cur.income += o.totalAmount; // Orders count as income
      seriesMap.set(key, cur);
    }
    
    // Calculate profit
    for (const [key, cur] of seriesMap.entries()) {
      cur.profit = cur.income - cur.expense;
    }

    // Categories breakdown
    const expenseByCategory = {};
    const incomeByCategory = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      } else {
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
      }
    });

    const series = Array.from(seriesMap.values()).sort((a, b) => a.key.localeCompare(b.key));

    res.json({
      totalRevenue: orderRevenue,
      posRevenue,
      onlineRevenue,
      totalAdditionalIncome: manualIncome,
      totalIncome,
      totalExpense,
      totalExpenses: totalExpense + totalTaxPaid,
      totalTaxPaid,
      profitSegments,
      balance,
      netProfit: balance - totalTaxPaid,
      orderCount,
      totalItemsSold,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
      transactionCount: transactions.length,
      series,
      monthlyData: series, // For backward compatibility
      expenseByCategory,
      incomeByCategory,
    });
  } catch (error) { next(error); }
};

// @desc    Create transaction (income/expense)
// @route   POST /api/finance/transactions
// @access  Private
const createTransaction = async (req, res, next) => {
  try {
    const { storeId, accountId, type, category, amount, paymentMethod, referenceNo, description, date, chequeDetails } = req.body;

    let assignedStore = storeId;
    if (!assignedStore && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    const { recordTransaction } = require('../services/ledgerService');
    const transaction = await recordTransaction({
      storeId: assignedStore || null,
      accountId,
      type,
      category,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'Cash',
      chequeDetails,
      referenceNo,
      description,
      createdBy: req.user._id,
      date: date || new Date()
    });

    res.status(201).json(transaction);
  } catch (error) { next(error); }
};

// @desc    Get all transactions
// @route   GET /api/finance/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, type } = req.query;
    const filter = {};

    let assignedStore = storeId;
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }
    
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter)
      .populate('createdBy', 'name')
      .populate('storeId', 'name')
      .sort({ date: -1 });

    res.json(transactions);
  } catch (error) { next(error); }
};

// @desc    Update transaction
// @route   PUT /api/finance/transactions/:id
// @access  Private
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) { res.status(404); return next(new Error('Transaction not found')); }

    const fields = ['type', 'category', 'amount', 'paymentMethod', 'referenceNo', 'description', 'date', 'attachments'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) transaction[f] = req.body[f];
    });

    await transaction.save();
    res.json(transaction);
  } catch (error) { next(error); }
};

// @desc    Delete transaction
// @route   DELETE /api/finance/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) { res.status(404); return next(new Error('Transaction not found')); }
    
    await transaction.deleteOne();
    res.json({ message: 'Transaction deleted' });
  } catch (error) { next(error); }
};

// @desc    Get all cheques from transactions
// @route   GET /api/finance/cheques
// @access  Private
const getCheques = async (req, res, next) => {
  try {
    const { storeId, status } = req.query;
    const filter = { paymentMethod: 'Cheque' };

    if (storeId && storeId !== 'all') filter.storeId = storeId;
    if (status) filter['chequeDetails.status'] = status;

    const transactions = await Transaction.find(filter)
      .populate('storeId', 'name')
      .populate('createdBy', 'name')
      .sort({ 'chequeDetails.dueDate': 1 });

    res.json(transactions);
  } catch (error) { next(error); }
};

// @desc    Update cheque status
// @route   PUT /api/finance/cheques/:id/status
// @access  Private
const updateChequeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) { res.status(404); return next(new Error('Transaction not found')); }

    if (transaction.paymentMethod !== 'Cheque') {
      res.status(400);
      return next(new Error('This transaction does not have a cheque'));
    }

    const oldStatus = transaction.chequeDetails.status;
    transaction.chequeDetails.status = status;
    await transaction.save();

    // Update account balance if status changed to/from 'Cleared'
    if (transaction.accountId && oldStatus !== status) {
      const Account = require('../models/Account');
      const account = await Account.findById(transaction.accountId);
      
      if (account) {
        if (status === 'Cleared') {
          // Add to balance if it's income, subtract if it's expense
          if (transaction.type === 'income') account.balance += transaction.amount;
          else if (transaction.type === 'expense') account.balance -= transaction.amount;
        } else if (oldStatus === 'Cleared') {
          // Reverse the balance update if moving away from 'Cleared'
          if (transaction.type === 'income') account.balance -= transaction.amount;
          else if (transaction.type === 'expense') account.balance += transaction.amount;
        }
        await account.save();
      }
    }

    res.json(transaction);
  } catch (error) { next(error); }
};

// Petty Cash Controllers
// @desc    Get Petty Cash Log
// @route   GET /api/finance/petty-cash
// @access  Private
const getPettyCashLog = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, type } = req.query;
    const filter = {};

    let assignedStore = storeId;
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }

    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const logs = await PettyCash.find(filter)
      .populate('accountId', 'name type')
      .populate('loggedBy', 'name')
      .populate('storeId', 'name')
      .sort({ date: -1 });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};

// @desc    Create Petty Cash Entry
// @route   POST /api/finance/petty-cash
// @access  Private
const createPettyCashEntry = async (req, res, next) => {
  try {
    const { storeId, type, amount, description, referenceNo, accountId, date } = req.body;

    let assignedStore = storeId;
    if (!assignedStore && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }
    if (!assignedStore) {
      res.status(400);
      return next(new Error('Store ID is required'));
    }

    const { recordTransaction, recordTransfer } = require('../services/ledgerService');

    // 1. If type is 'out' (spending cash)
    if (type === 'out') {
      let targetAccountId = accountId;
      if (!targetAccountId) {
        let cashAccount = await Account.findOne({ storeId: assignedStore, type: 'Cash', isDefault: true });
        if (!cashAccount) {
          cashAccount = await Account.findOne({ storeId: assignedStore, type: 'Cash' });
        }
        if (!cashAccount) {
          res.status(400);
          return next(new Error('No Cash account found for this store to deduct petty cash from.'));
        }
        targetAccountId = cashAccount._id;
      }

      await recordTransaction({
        storeId: assignedStore,
        accountId: targetAccountId,
        type: 'expense',
        category: 'Petty Cash',
        amount,
        paymentMethod: 'Cash',
        referenceNo,
        description: description || 'Petty Cash Out',
        createdBy: req.user._id,
        date: date || new Date()
      });

      const pettyCash = await PettyCash.create({
        storeId: assignedStore,
        type,
        amount,
        description,
        referenceNo,
        accountId: targetAccountId,
        loggedBy: req.user._id,
        date: date || new Date()
      });

      res.status(201).json(pettyCash);
    } 
    // 2. If type is 'in' (depositing cash from bank account)
    else if (type === 'in') {
      if (!accountId) {
        res.status(400);
        return next(new Error('Account ID (Bank/Wallet) is required for Petty Cash deposit (Cash In)'));
      }

      let cashAccount = await Account.findOne({ storeId: assignedStore, type: 'Cash', isDefault: true });
      if (!cashAccount) {
        cashAccount = await Account.findOne({ storeId: assignedStore, type: 'Cash' });
      }
      if (!cashAccount) {
        res.status(400);
        return next(new Error('No Cash account found for this store to deposit petty cash into.'));
      }

      await recordTransfer({
        storeId: assignedStore,
        fromAccountId: accountId,
        toAccountId: cashAccount._id,
        amount,
        referenceNo,
        description: description || 'Petty Cash In from Bank',
        createdBy: req.user._id
      });

      const pettyCash = await PettyCash.create({
        storeId: assignedStore,
        type,
        amount,
        description,
        referenceNo,
        accountId,
        loggedBy: req.user._id,
        date: date || new Date()
      });

      res.status(201).json(pettyCash);
    } else {
      res.status(400);
      return next(new Error('Invalid petty cash type'));
    }
  } catch (error) {
    next(error);
  }
};

// Tax Payment Controllers
// @desc    Get Tax Payments
// @route   GET /api/finance/tax-payments
// @access  Private
const getTaxPayments = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, year } = req.query;
    const filter = {};

    let assignedStore = storeId;
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }

    if (year) filter.year = Number(year);

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const payments = await TaxPayment.find(filter)
      .populate('createdBy', 'name')
      .populate('storeId', 'name')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create Tax Payment
// @route   POST /api/finance/tax-payments
// @access  Private
const createTaxPayment = async (req, res, next) => {
  try {
    const { storeId, year, period, amount, paymentDate, referenceNo, notes, accountId } = req.body;

    let assignedStore = storeId;
    if (!assignedStore && req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }
    if (!assignedStore) {
      res.status(400);
      return next(new Error('Store ID is required'));
    }

    if (accountId) {
      const { recordTransaction } = require('../services/ledgerService');
      await recordTransaction({
        storeId: assignedStore,
        accountId,
        type: 'expense',
        category: 'Tax Payment',
        amount,
        paymentMethod: 'Bank Transfer',
        referenceNo,
        description: notes || `Tax Payment - Period: ${period}, Year: ${year}`,
        createdBy: req.user._id,
        date: paymentDate || new Date()
      });
    }

    const taxPayment = await TaxPayment.create({
      storeId: assignedStore,
      year,
      period,
      amount,
      paymentDate: paymentDate || new Date(),
      referenceNo,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json(taxPayment);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Profit Report
// @route   GET /api/finance/profit-report
// @access  Private
const getProfitReport = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, category, brand } = req.query;
    const filter = { orderStatus: { $in: ['delivered', 'completed'] } };

    let assignedStore = storeId;
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) assignedStore = store._id;
    }

    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(filter)
      .populate({
        path: 'items.productId',
        populate: { path: 'categoryId', select: 'name' }
      })
      .lean();

    const items = [];
    const categoryAgg = {};
    const brandAgg = {};

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const product = item.productId;
        if (!product) return;

        const categoryName = product.categoryId?.name || 'Uncategorized';
        const productBrand = product.brand || 'Unbranded';

        if (category && category !== 'all') {
          if (category === 'mobiles') {
            const isMobile = /mobile|phone|tablet|smartphone/i.test(categoryName) || !!product.ram || !!product.storage;
            if (!isMobile) return;
          } else if (category === 'accessories') {
            const isMobile = /mobile|phone|tablet|smartphone/i.test(categoryName) || !!product.ram || !!product.storage;
            if (isMobile) return;
          } else if (String(product.categoryId?._id) !== String(category)) {
            return;
          }
        }

        if (brand && brand !== 'all' && productBrand.toLowerCase() !== brand.toLowerCase()) {
          return;
        }

        const qty = item.quantity || 0;
        const revenue = (item.price || 0) * qty;
        const unitCost = item.unitCostAtSale !== undefined ? item.unitCostAtSale : (product.buyingPrice || 0);
        const cost = unitCost * qty;
        const profit = revenue - cost;

        totalRevenue += revenue;
        totalCost += cost;
        totalProfit += profit;

        items.push({
          date: order.createdAt,
          invoiceNumber: order.invoiceNumber || order._id.toString().slice(-8).toUpperCase(),
          name: item.name,
          category: categoryName,
          brand: productBrand,
          costPrice: unitCost,
          sellingPrice: item.price,
          quantity: qty,
          totalCost: cost,
          totalRevenue: revenue,
          profit,
          margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0
        });

        if (!categoryAgg[categoryName]) {
          categoryAgg[categoryName] = { name: categoryName, revenue: 0, cost: 0, profit: 0 };
        }
        categoryAgg[categoryName].revenue += revenue;
        categoryAgg[categoryName].cost += cost;
        categoryAgg[categoryName].profit += profit;

        if (!brandAgg[productBrand]) {
          brandAgg[productBrand] = { name: productBrand, revenue: 0, cost: 0, profit: 0 };
        }
        brandAgg[productBrand].revenue += revenue;
        brandAgg[productBrand].cost += cost;
        brandAgg[productBrand].profit += profit;
      });
    });

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0
      },
      items,
      byCategory: Object.values(categoryAgg),
      byBrand: Object.values(brandAgg)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFinancialDashboard,
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  getCheques,
  updateChequeStatus,
  getPettyCashLog,
  createPettyCashEntry,
  getTaxPayments,
  createTaxPayment,
  getProfitReport,
};

