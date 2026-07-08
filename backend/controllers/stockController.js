const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockReceipt = require('../models/StockReceipt');
const SupplierReturn = require('../models/SupplierReturn');
const Store = require('../models/Store');
const SupplierPayment = require('../models/SupplierPayment');
const StockTransfer = require('../models/StockTransfer');
const StockAdjustment = require('../models/StockAdjustment');

const resolveStoreId = async (req, { bodyKey = 'storeId', queryKey = 'storeId' } = {}) => {
  const user = req.user;
  // Manager — find the store they manage
  if (user.role === 'manager') {
    const store = await Store.findOne({ managerId: user._id }).select('_id').lean();
    return store?._id || null;
  }
  // Cashier / stockEmployee — use their assignedStore
  if (user.role === 'cashier' || user.role === 'stockEmployee') {
    if (user.assignedStore) return user.assignedStore;
    const store = await Store.findOne({ isActive: true }).select('_id').lean();
    return store?._id || null;
  }
  // Admin — use body/query storeId
  return req.body?.[bodyKey] || req.query?.[queryKey] || null;
};

const applyReceivingToProduct = async ({ productId, qty, unitCost, storeId }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');
  if (String(product.storeId) !== String(storeId)) throw new Error('Product does not belong to this store');

  const oldStock = Number(product.stock || 0);
  const addQty = Number(qty || 0);
  const cost = Number(unitCost || 0);

  // --- Price Row Logic ---
  if (!product.priceRows) product.priceRows = [];

  // Find existing row with the same cost price (tolerance 0.01)
  const existingRow = product.priceRows.find(
    (r) => Math.abs(Number(r.costPrice) - cost) < 0.01
  );

  if (existingRow) {
    // Same price → add qty to existing row
    existingRow.qty = Number(existingRow.qty || 0) + addQty;
    existingRow.receivedAt = new Date();
  } else {
    // Different price → create new row
    product.priceRows.push({ costPrice: cost, qty: addQty, receivedAt: new Date() });
  }

  // Update overall stock & averages
  const oldAvg = Number(product.avgCost || 0);
  const newStock = oldStock + addQty;
  const newAvg = newStock > 0 ? ((oldAvg * oldStock) + (cost * addQty)) / newStock : 0;

  product.stock = newStock;
  product.lastCost = cost;
  product.avgCost = Number.isFinite(newAvg) ? Number(newAvg.toFixed(4)) : product.avgCost;
  product.markModified('priceRows');
  await product.save();

  return product;
};

const applySupplierReturnToProduct = async ({ productId, qty, unitCostAtReturn, storeId }) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');
  if (String(product.storeId) !== String(storeId)) throw new Error('Product does not belong to this store');

  const currentStock = Number(product.stock || 0);
  const returnQty = Number(qty || 0);
  if (returnQty > currentStock) throw new Error(`Insufficient stock for ${product.name}`);

  product.stock = currentStock - returnQty;
  if (unitCostAtReturn !== undefined && unitCostAtReturn !== null && unitCostAtReturn !== '') {
    const cost = Number(unitCostAtReturn || 0);
    product.lastCost = cost;
  }
  await product.save();
  return product;
};

// @desc    Create stock receipt (GRN)
// @route   POST /api/stock/receipts
// @access  Private/Admin/Manager
const createStockReceipt = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    console.log('[GRN] role:', req.user?.role, '| body.storeId:', req.body?.storeId, '| resolved storeId:', storeId);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }

    const { supplierId, receivedAt, invoiceNo, items, notes, grnNumber } = req.body;
    console.log('[GRN] supplierId:', supplierId, '| items count:', items?.length);
    if (!supplierId) {
      res.status(400);
      return next(new Error('supplierId is required'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('At least one item is required'));
    }

    const supplier = await Supplier.findById(supplierId).select('_id storeId status').lean();
    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }
    if (supplier.status !== 'active') {
      res.status(400);
      return next(new Error('Supplier is inactive'));
    }

    for (const it of items) {
      if (!it?.productId || !it?.qty || it.qty <= 0) {
        res.status(400);
        return next(new Error('Invalid receipt item'));
      }
      if (it.unitCost === undefined || it.unitCost === null || Number(it.unitCost) < 0) {
        res.status(400);
        return next(new Error('unitCost is required for each item'));
      }
    }

    // Always use the supplier's own storeId — this is the single source of truth
    const targetStoreId = supplier.storeId;

    const receiptData = {
      storeId: targetStoreId,
      supplierId,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      invoiceNo: invoiceNo || '',
      items: items.map((i) => ({ productId: i.productId, qty: Number(i.qty), unitCost: Number(i.unitCost) })),
      notes: notes || '',
      createdBy: req.user._id,
    };

    // Allow manual GRN number if provided
    if (grnNumber) {
      receiptData.grnNumber = grnNumber;
    }

    const receipt = await StockReceipt.create(receiptData);

    for (const it of receipt.items) {
      await applyReceivingToProduct({
        productId: it.productId,
        qty: it.qty,
        unitCost: it.unitCost,
        storeId: targetStoreId,
      });
    }

    // 4. Auto-record purchase and potential payment in supplier payments ledger
    const totalCost = receipt.items.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const c = Number(it.unitCost) || 0;
      return sum + (q * c);
    }, 0);

    const advanceAmount = Number(req.body.advanceAmount) || 0;
    const paymentMethod = req.body.paymentMethod || 'cash';
    const accountId = req.body.accountId;

    if (totalCost > 0) {
      // Record Purchase Entry
      await SupplierPayment.create({
        supplierId: receipt.supplierId,
        storeId: targetStoreId,
        type: 'purchase',
        amount: totalCost,
        description: `GRN ${receipt.grnNumber || receipt._id} — ${receipt.items.length} item(s)`,
        date: receipt.receivedAt || new Date(),
        referenceId: receipt._id,
        createdBy: req.user._id,
      });

      // Record Advance Payment Entry if applicable
      if (advanceAmount > 0) {
        await SupplierPayment.create({
          supplierId: receipt.supplierId,
          storeId: targetStoreId,
          type: 'payment',
          amount: advanceAmount,
          description: `Advance Payment for GRN ${receipt.grnNumber || receipt._id}`,
          date: receipt.receivedAt || new Date(),
          paymentMethod,
          referenceId: receipt._id,
          createdBy: req.user._id,
        });

        // Record in Finance Ledger and update account balance
        const { recordTransaction } = require('../services/ledgerService');
        await recordTransaction({
          storeId: targetStoreId,
          accountId: accountId || null,
          type: 'expense',
          category: 'Stock Purchase Payment',
          amount: advanceAmount,
          paymentMethod: paymentMethod,
          description: `Payment for GRN ${receipt.grnNumber || receipt._id}`,
          createdBy: req.user._id,
          date: receipt.receivedAt || new Date(),
          referenceNo: receipt.grnNumber || receipt._id
        });
      }
    } else {
      console.log('[GRN] Skipping SupplierPayment (totalCost is 0)');
    }

    const populated = await StockReceipt.findById(receipt._id)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (error) { next(error); }
};

// @desc    List stock receipts
// @route   GET /api/stock/receipts
// @access  Private/Admin/Manager
const listStockReceipts = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }
    const { startDate, endDate, supplierId, grnNumber } = req.query;
    const filter = { storeId };
    if (supplierId) filter.supplierId = supplierId;
    if (grnNumber) {
      filter.grnNumber = { $regex: grnNumber, $options: 'i' };
    }
    if (startDate || endDate) {
      filter.receivedAt = {};
      if (startDate) filter.receivedAt.$gte = new Date(startDate);
      if (endDate) filter.receivedAt.$lte = new Date(endDate);
    }

    const receipts = await StockReceipt.find(filter)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name')
      .sort({ receivedAt: -1 })
      .limit(200);

    res.json(receipts);
  } catch (error) { next(error); }
};

// @desc    Get single stock receipt by GRN number
// @route   GET /api/stock/receipts/grn/:grnNumber
// @access  Private/Admin/Manager
const getReceiptByGRN = async (req, res, next) => {
  try {
    const { grnNumber } = req.params;
    const receipt = await StockReceipt.findOne({ grnNumber: { $regex: `^${grnNumber}$`, $options: 'i' } })
      .populate('supplierId', 'name phone email')
      .populate('items.productId', 'name sku price')
      .populate('createdBy', 'name');

    if (!receipt) {
      res.status(404);
      return next(new Error('GRN not found'));
    }
    res.json(receipt);
  } catch (error) { next(error); }
};

// @desc    Create supplier return
// @route   POST /api/stock/supplier-returns
// @access  Private/Admin/Manager
const createSupplierReturn = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }
    const { supplierId, returnedAt, reason, items, notes } = req.body;
    if (!supplierId) {
      res.status(400);
      return next(new Error('supplierId is required'));
    }
    if (!reason) {
      res.status(400);
      return next(new Error('reason is required'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400);
      return next(new Error('At least one item is required'));
    }

    const supplier = await Supplier.findById(supplierId).select('_id storeId status').lean();
    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }
    if (String(supplier.storeId) !== String(storeId)) {
      res.status(403);
      return next(new Error('Supplier does not belong to this store'));
    }

    for (const it of items) {
      if (!it?.productId || !it?.qty || it.qty <= 0) {
        res.status(400);
        return next(new Error('Invalid return item'));
      }
    }

    const targetStoreId = supplier.storeId || storeId;

    const ret = await SupplierReturn.create({
      storeId: targetStoreId,
      supplierId,
      returnedAt: returnedAt ? new Date(returnedAt) : new Date(),
      reason,
      items: items.map((i) => ({
        productId: i.productId,
        qty: Number(i.qty),
        unitCostAtReturn: i.unitCostAtReturn === undefined ? undefined : Number(i.unitCostAtReturn),
      })),
      notes: notes || '',
      createdBy: req.user._id,
    });

    // Deduct stock
    for (const it of ret.items) {
      await applySupplierReturnToProduct({
        productId: it.productId,
        qty: it.qty,
        unitCostAtReturn: it.unitCostAtReturn,
        storeId: targetStoreId,
      });
    }

    // Auto-record return as a "payment" (credit) in supplier ledger
    const totalReturnCost = ret.items.reduce((sum, it) => {
      const q = Number(it.qty) || 0;
      const c = Number(it.unitCostAtReturn) || 0;
      return sum + (q * c);
    }, 0);

    if (totalReturnCost > 0) {
      try {
        await SupplierPayment.create({
          supplierId: ret.supplierId,
          storeId: targetStoreId,
          type: 'payment',
          amount: totalReturnCost,
          description: `Stock Return: ${ret.reason} (${ret.items.length} item(s))`,
          date: ret.returnedAt || new Date(),
          referenceId: ret._id,
          createdBy: req.user._id,
        });
      } catch (spErr) {
        console.error('Failed to auto-record supplier return:', spErr.message);
      }
    }

    const populated = await SupplierReturn.findById(ret._id)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (error) { next(error); }
};

// @desc    List supplier returns
// @route   GET /api/stock/supplier-returns
// @access  Private/Admin/Manager
const listSupplierReturns = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400);
      return next(new Error('storeId is required'));
    }
    const { startDate, endDate, supplierId, reason } = req.query;
    const filter = { storeId };
    if (supplierId) filter.supplierId = supplierId;
    if (reason) filter.reason = reason;
    if (startDate || endDate) {
      filter.returnedAt = {};
      if (startDate) filter.returnedAt.$gte = new Date(startDate);
      if (endDate) filter.returnedAt.$lte = new Date(endDate);
    }

    const returns = await SupplierReturn.find(filter)
      .populate('supplierId', 'name')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name')
      .sort({ returnedAt: -1 })
      .limit(200);

    res.json(returns);
  } catch (error) { next(error); }
};

// ─── Stock Adjustments ───
// @desc    Create stock adjustment
// @route   POST /api/stock/adjustments
// @access  Private
const createStockAdjustment = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    if (!storeId) {
      res.status(400); return next(new Error('storeId is required'));
    }

    const { productId, type, quantity, imei, reason } = req.body;
    if (!productId || !type || !quantity || !reason) {
      res.status(400); return next(new Error('Missing required adjustment fields'));
    }

    const product = await Product.findById(productId);
    if (!product || String(product.storeId) !== String(storeId)) {
      res.status(404); return next(new Error('Product not found in this store'));
    }

    const adj = await StockAdjustment.create({
      storeId,
      product: productId,
      type,
      quantity: Number(quantity),
      imei: imei || [],
      reason,
      adjustedBy: req.user._id,
      status: 'approved' // Automatically approve for now
    });

    // Apply adjustment to stock
    if (type === 'addition' || type === 'return') {
      product.stock += Number(quantity);
    } else if (type === 'deduction' || type === 'damage') {
      if (product.stock < Number(quantity)) {
        res.status(400); return next(new Error('Insufficient stock to deduct'));
      }
      product.stock -= Number(quantity);
    }
    
    await product.save();
    
    res.status(201).json(adj);
  } catch (error) { next(error); }
};

// @desc    List stock adjustments
// @route   GET /api/stock/adjustments
// @access  Private
const listStockAdjustments = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const filter = storeId && storeId !== 'all' ? { storeId } : {};

    const adjustments = await StockAdjustment.find(filter)
      .populate('product', 'name sku')
      .populate('adjustedBy', 'name')
      .sort({ date: -1 });

    res.json(adjustments);
  } catch (error) { next(error); }
};

// ─── Stock Transfers ───
// @desc    Create stock transfer
// @route   POST /api/stock/transfers
// @access  Private
const createStockTransfer = async (req, res, next) => {
  try {
    const { fromStore, toStore, products, notes, trackingNumber, transferType = 'cash', amountPaid = 0 } = req.body;
    if (!fromStore || !toStore || !products || products.length === 0) {
      res.status(400); return next(new Error('Missing transfer data'));
    }

    if (fromStore === toStore) {
      res.status(400); return next(new Error('Cannot transfer to the same store'));
    }

    let totalAmount = 0;
    // Check stock in fromStore and calculate total cost/price
    for (const p of products) {
      const prod = await Product.findOne({ _id: p.productId, storeId: fromStore });
      if (!prod || prod.stock < p.quantity) {
        res.status(400); return next(new Error(`Insufficient stock for product ${prod?.name || p.productId}`));
      }
      totalAmount += (prod.price || 0) * Number(p.quantity);
    }

    const calculatedPaid = Number(amountPaid) || 0;
    const outstandingBalance = Math.max(0, totalAmount - calculatedPaid);

    // Deduct from fromStore immediately (it's in transit)
    for (const p of products) {
      await Product.updateOne({ _id: p.productId }, { $inc: { stock: -Number(p.quantity) } });
    }

    const transfer = await StockTransfer.create({
      fromStore,
      toStore,
      products: products.map(p => ({ product: p.productId, quantity: Number(p.quantity) })),
      status: 'in_transit',
      transferType,
      totalAmount,
      amountPaid: calculatedPaid,
      outstandingBalance,
      dispatchedBy: req.user._id,
      dispatchedAt: new Date(),
      notes,
      trackingNumber
    });

    res.status(201).json(transfer);
  } catch (error) { next(error); }
};

// @desc    Update stock transfer status
// @route   PUT /api/stock/transfers/:id/status
// @access  Private
const updateStockTransferStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) { res.status(404); return next(new Error('Transfer not found')); }

    if (transfer.status === 'completed' || transfer.status === 'cancelled') {
      res.status(400); return next(new Error('Transfer is already finalised'));
    }

    if (status === 'completed') {
      transfer.status = 'completed';
      transfer.receivedBy = req.user._id;
      transfer.receivedAt = new Date();

      // Add to toStore
      for (const p of transfer.products) {
        // Find if this product exists in toStore
        const originalProd = await Product.findById(p.product).lean();
        
        let destProd = await Product.findOne({ sku: originalProd.sku, storeId: transfer.toStore });
        if (destProd) {
          destProd.stock += Number(p.quantity);
          await destProd.save();
        } else {
          // Clone product to toStore
          delete originalProd._id;
          originalProd.storeId = transfer.toStore;
          originalProd.stock = p.quantity;
          await Product.create(originalProd);
        }
      }
    } else if (status === 'cancelled') {
      transfer.status = 'cancelled';
      // Return stock to fromStore
      for (const p of transfer.products) {
        await Product.updateOne({ _id: p.product }, { $inc: { stock: Number(p.quantity) } });
      }
    }

    await transfer.save();
    res.json(transfer);
  } catch (error) { next(error); }
};

// @desc    List stock transfers
// @route   GET /api/stock/transfers
// @access  Private
const listStockTransfers = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const filter = {};
    if (storeId && storeId !== 'all') {
      filter.$or = [{ fromStore: storeId }, { toStore: storeId }];
    }

    const transfers = await StockTransfer.find(filter)
      .populate('fromStore', 'name')
      .populate('toStore', 'name')
      .populate('products.product', 'name sku')
      .populate('dispatchedBy', 'name')
      .populate('receivedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) { next(error); }
};


// @desc    Get next GRN number (preview before creating)
// @route   GET /api/stock/next-grn
// @access  Private
const getNextGrn = async (req, res, next) => {
  try {
    const date = new Date();
    const prefix = `GRN-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const count = await StockReceipt.countDocuments({ grnNumber: { $regex: `^${prefix}` } });
    const nextGrn = `${prefix}-${String(count + 1).padStart(4, '0')}`;
    res.json({ grnNumber: nextGrn });
  } catch (error) { next(error); }
};

// @desc    Search GRN numbers (autocomplete)
// @route   GET /api/stock/grn-search?q=GRN-202605
// @access  Private
const searchGrnNumbers = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const receipts = await StockReceipt.find(
      { grnNumber: { $regex: q, $options: 'i' } },
      { grnNumber: 1, invoiceNo: 1, receivedAt: 1 }
    ).sort({ createdAt: -1 }).limit(10).lean();
    res.json(receipts.map(r => ({
      grnNumber: r.grnNumber,
      invoiceNo: r.invoiceNo,
      date: r.receivedAt,
    })));
  } catch (error) { next(error); }
};

// @desc    Delete stock receipt (GRN)
// @route   DELETE /api/stock/receipts/:id
// @access  Private/Admin
const deleteStockReceipt = async (req, res, next) => {
  try {
    const receipt = await StockReceipt.findById(req.params.id);
    if (!receipt) {
      res.status(404);
      return next(new Error('GRN receipt not found'));
    }
    await receipt.deleteOne();
    res.json({ message: 'GRN receipt deleted' });
  } catch (error) { next(error); }
};

module.exports = {
  createStockReceipt,
  listStockReceipts,
  getReceiptByGRN,
  deleteStockReceipt,
  getNextGrn,
  searchGrnNumbers,
  createSupplierReturn,
  listSupplierReturns,
  createStockAdjustment,
  listStockAdjustments,
  createStockTransfer,
  updateStockTransferStatus,
  listStockTransfers
};
