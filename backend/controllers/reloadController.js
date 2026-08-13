const Reload = require('../models/Reload');
const CardStock = require('../models/CardStock');
const ReloadStock = require('../models/ReloadStock');
const Transaction = require('../models/Transaction');
const Store = require('../models/Store');

// Helper to determine target store ID
const resolveStoreId = async (user, storeIdParam) => {
  if (storeIdParam && storeIdParam !== 'all') return storeIdParam;
  if (user.role === 'manager') {
    const store = await Store.findOne({ managerId: user._id });
    if (store) return store._id;
  } else if (user.assignedStore) {
    return user.assignedStore;
  } else if (user.role === 'admin') {
    const store = await Store.findOne({ isActive: true });
    if (store) return store._id;
  }
  return null;
};

// @desc    Record a new reload or scratch card sale
// @route   POST /api/reloads
// @access  Private
const createReload = async (req, res, next) => {
  try {
    const { 
      mobileNumber, 
      operator, 
      amount, 
      type, 
      paymentMethod, 
      notes, 
      storeId,
      accountId,
      profitPercentage = 4,
      cardDenomination,
      isCard,
      quantity = 1
    } = req.body;

    const assignedStore = await resolveStoreId(req.user, storeId);

    if (!assignedStore) {
      res.status(400);
      return next(new Error('No store found for this transaction. Please ensure your account is linked to a store.'));
    }

    const totalAmount = Number(amount) * (Number(quantity) || 1);
    const pMargin = Number(profitPercentage) ?? 4;
    const profitAmt = (totalAmount * pMargin) / 100;

    // If card sale, check/update stock count
    if (isCard || type === 'Scratch Card') {
      const targetDenom = cardDenomination || Number(amount);
      const stock = await CardStock.findOne({
        storeId: assignedStore,
        operator,
        denomination: targetDenom
      });

      if (stock) {
        if (stock.quantity < (Number(quantity) || 1)) {
          res.status(400);
          return next(new Error(`Insufficient scratch card stock for ${operator} Rs. ${targetDenom}. Available: ${stock.quantity}`));
        }
        stock.quantity -= (Number(quantity) || 1);
        await stock.save();
      }
    } else {
      // If electronic reload, deduct from ReloadStock float balance if tracked
      const rStock = await ReloadStock.findOne({ storeId: assignedStore, operator });
      if (rStock && rStock.currentBalance > 0) {
        rStock.currentBalance = Math.max(0, rStock.currentBalance - totalAmount);
        await rStock.save();
      }
    }

    // 1. Create Transaction for the income
    const transaction = await Transaction.create({
      storeId: assignedStore || null,
      accountId: accountId || null,
      type: 'income',
      category: isCard || type === 'Scratch Card' ? 'Scratch Card Sale' : 'Reload & Bill Payment',
      amount: totalAmount,
      paymentMethod: paymentMethod || 'Cash',
      description: isCard || type === 'Scratch Card'
        ? `Scratch Card Sale: ${operator} Rs.${cardDenomination || amount} (Qty: ${quantity || 1})`
        : `${type || 'Prepaid'} Reload: ${operator} - ${mobileNumber}`,
      date: new Date(),
      createdBy: req.user._id,
    });

    // 2. Create Reload record
    const reload = await Reload.create({
      storeId: assignedStore || null,
      mobileNumber: mobileNumber || 'CARD-SALE',
      operator,
      amount: totalAmount,
      type: type || (isCard ? 'Scratch Card' : 'Prepaid'),
      profitPercentage: pMargin,
      profitAmount: profitAmt,
      quantity: Number(quantity) || 1,
      cardDenomination: cardDenomination || Number(amount),
      isCard: Boolean(isCard || type === 'Scratch Card'),
      paymentMethod: paymentMethod || 'Cash',
      notes,
      transactionId: transaction._id,
      createdBy: req.user._id,
      status: 'Completed'
    });

    res.status(201).json({
      success: true,
      data: reload,
      transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reloads
// @route   GET /api/reloads
// @access  Private
const getReloads = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, operator, type } = req.query;
    const filter = {};

    const assignedStore = await resolveStoreId(req.user, storeId);
    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }
    
    if (operator) filter.operator = operator;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const reloads = await Reload.find(filter)
      .populate('createdBy', 'name')
      .populate('storeId', 'name')
      .sort({ createdAt: -1 });

    res.json(reloads);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Card Stock
// @route   GET /api/reloads/card-stock
// @access  Private
const getCardStock = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const assignedStore = await resolveStoreId(req.user, storeId);

    const filter = {};
    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }

    const cardStocks = await CardStock.find(filter)
      .populate('storeId', 'name')
      .populate('updatedBy', 'name')
      .sort({ operator: 1, denomination: 1 });

    res.json(cardStocks);
  } catch (error) {
    next(error);
  }
};

// @desc    Add or increase Card Stock
// @route   POST /api/reloads/card-stock
// @access  Private
const addOrUpdateCardStock = async (req, res, next) => {
  try {
    const { storeId, operator, denomination, quantity, profitPercentage = 4, notes } = req.body;
    const assignedStore = await resolveStoreId(req.user, storeId);

    if (!assignedStore) {
      res.status(400);
      return next(new Error('Store required to add card stock'));
    }

    const denomNum = Number(denomination);
    const qtyNum = Number(quantity);
    const pMargin = Number(profitPercentage) ?? 4;
    const cost = denomNum * (1 - pMargin / 100);

    let stock = await CardStock.findOne({
      storeId: assignedStore,
      operator,
      denomination: denomNum
    });

    if (stock) {
      stock.quantity += qtyNum;
      stock.profitPercentage = pMargin;
      stock.costPrice = cost;
      stock.sellingPrice = denomNum;
      stock.notes = notes || stock.notes;
      stock.updatedBy = req.user._id;
      await stock.save();
    } else {
      stock = await CardStock.create({
        storeId: assignedStore,
        operator,
        denomination: denomNum,
        cardName: `${operator} Rs. ${denomNum} Card`,
        quantity: qtyNum,
        costPrice: cost,
        sellingPrice: denomNum,
        profitPercentage: pMargin,
        notes,
        updatedBy: req.user._id
      });
    }

    res.status(201).json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Card Stock Item
// @route   PUT /api/reloads/card-stock/:id
// @access  Private
const updateCardStock = async (req, res, next) => {
  try {
    const { quantity, profitPercentage, notes } = req.body;
    const stock = await CardStock.findById(req.params.id);

    if (!stock) {
      res.status(404);
      return next(new Error('Card stock item not found'));
    }

    if (quantity !== undefined) stock.quantity = Number(quantity);
    if (profitPercentage !== undefined) {
      stock.profitPercentage = Number(profitPercentage);
      stock.costPrice = stock.sellingPrice * (1 - stock.profitPercentage / 100);
    }
    if (notes !== undefined) stock.notes = notes;
    stock.updatedBy = req.user._id;

    await stock.save();
    res.json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Card Stock Item
// @route   DELETE /api/reloads/card-stock/:id
// @access  Private
const deleteCardStock = async (req, res, next) => {
  try {
    const stock = await CardStock.findById(req.params.id);
    if (!stock) {
      res.status(404);
      return next(new Error('Card stock item not found'));
    }
    await stock.deleteOne();
    res.json({ success: true, message: 'Card stock removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Reload Float Stock
// @route   GET /api/reloads/reload-stock
// @access  Private
const getReloadStock = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const assignedStore = await resolveStoreId(req.user, storeId);

    const filter = {};
    if (assignedStore && assignedStore !== 'all') {
      filter.storeId = assignedStore;
    }

    const defaultOperators = ['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT'];
    let stocks = await ReloadStock.find(filter).sort({ operator: 1 });

    // Initialize missing operators if store assigned
    if (assignedStore && assignedStore !== 'all') {
      const existingOps = stocks.map(s => s.operator);
      for (const op of defaultOperators) {
        if (!existingOps.includes(op)) {
          const newStock = await ReloadStock.create({
            storeId: assignedStore,
            operator: op,
            currentBalance: 0,
            profitPercentage: 4
          });
          stocks.push(newStock);
        }
      }
      stocks.sort((a, b) => a.operator.localeCompare(b.operator));
    }

    res.json(stocks);
  } catch (error) {
    next(error);
  }
};

// @desc    Add / Top-Up Reload Float Stock
// @route   POST /api/reloads/reload-stock
// @access  Private
const addOrUpdateReloadStock = async (req, res, next) => {
  try {
    const { storeId, operator, amount, profitPercentage = 4, notes } = req.body;
    const assignedStore = await resolveStoreId(req.user, storeId);

    if (!assignedStore) {
      res.status(400);
      return next(new Error('Store required to top up reload float stock'));
    }

    const topUpAmt = Number(amount);
    if (!topUpAmt || topUpAmt <= 0) {
      res.status(400);
      return next(new Error('Please enter a valid positive top-up amount'));
    }

    let stock = await ReloadStock.findOne({ storeId: assignedStore, operator });

    if (stock) {
      stock.currentBalance += topUpAmt;
      stock.lastTopUpAmount = topUpAmt;
      stock.profitPercentage = Number(profitPercentage) || 4;
      if (notes) stock.notes = notes;
      stock.updatedBy = req.user._id;
      await stock.save();
    } else {
      stock = await ReloadStock.create({
        storeId: assignedStore,
        operator,
        currentBalance: topUpAmt,
        lastTopUpAmount: topUpAmt,
        profitPercentage: Number(profitPercentage) || 4,
        notes,
        updatedBy: req.user._id
      });
    }

    res.status(201).json({ success: true, data: stock });
  } catch (error) {
    next(error);
  }
};

// @desc    Record Daily End-of-Day Card & Reload Sales Entry
// @route   POST /api/reloads/daily-sales
// @access  Private
const recordDailyCardSales = async (req, res, next) => {
  try {
    const { storeId, sales, accountId, notes } = req.body;
    const assignedStore = await resolveStoreId(req.user, storeId);

    if (!assignedStore) {
      res.status(400);
      return next(new Error('Store required for daily sales entry'));
    }

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      res.status(400);
      return next(new Error('Please provide at least one card sale entry'));
    }

    let totalDailyRevenue = 0;
    let totalDailyProfit = 0;
    const processedItems = [];

    for (const item of sales) {
      const { operator, denomination, quantitySold, profitPercentage = 4 } = item;
      const qSold = Number(quantitySold) || 0;
      if (qSold <= 0) continue;

      const denom = Number(denomination);
      const pMargin = Number(profitPercentage) ?? 4;
      const itemRevenue = denom * qSold;
      const itemProfit = (itemRevenue * pMargin) / 100;

      totalDailyRevenue += itemRevenue;
      totalDailyProfit += itemProfit;

      // 1. Deduct card stock count
      const stock = await CardStock.findOne({
        storeId: assignedStore,
        operator,
        denomination: denom
      });

      if (stock) {
        stock.quantity = Math.max(0, stock.quantity - qSold);
        await stock.save();
      }

      // 2. Create Reload record for daily log
      const reloadRecord = await Reload.create({
        storeId: assignedStore,
        mobileNumber: 'DAILY-EOD-CARD-SALE',
        operator,
        amount: itemRevenue,
        type: 'Scratch Card',
        profitPercentage: pMargin,
        profitAmount: itemProfit,
        quantity: qSold,
        cardDenomination: denom,
        isCard: true,
        paymentMethod: 'Cash',
        notes: notes || `End of Day Sales: ${operator} Rs.${denom} x ${qSold}`,
        createdBy: req.user._id,
        status: 'Completed'
      });

      processedItems.push(reloadRecord);
    }

    if (processedItems.length === 0) {
      res.status(400);
      return next(new Error('No valid card quantities sold were entered'));
    }

    // 3. Create income transaction for financial balancing
    const transaction = await Transaction.create({
      storeId: assignedStore,
      accountId: accountId || null,
      type: 'income',
      category: 'Scratch Card & Reload Sales',
      amount: totalDailyRevenue,
      paymentMethod: 'Cash',
      description: `Daily Card Sales Entry (${processedItems.length} items logged)`,
      date: new Date(),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Daily card sales recorded and stock updated successfully',
      totalRevenue: totalDailyRevenue,
      totalProfit: totalDailyProfit,
      itemsCount: processedItems.length,
      transaction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reload transaction
// @route   DELETE /api/reloads/:id
// @access  Private
const deleteReload = async (req, res, next) => {
  try {
    const reload = await Reload.findById(req.params.id);
    if (!reload) {
      res.status(404);
      return next(new Error('Reload transaction not found'));
    }

    if (reload.transactionId) {
      await Transaction.findByIdAndDelete(reload.transactionId);
    }

    await reload.deleteOne();

    res.json({ success: true, message: 'Reload transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Reload Float Stock
// @route   DELETE /api/reloads/reload-stock/:id
// @access  Private
const deleteReloadStock = async (req, res, next) => {
  try {
    const stock = await ReloadStock.findById(req.params.id);
    if (!stock) {
      res.status(404);
      return next(new Error('Reload float stock item not found'));
    }
    await stock.deleteOne();
    res.json({ success: true, message: 'Reload float stock deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
