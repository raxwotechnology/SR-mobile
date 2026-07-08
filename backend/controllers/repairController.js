const RepairJob = require('../models/RepairJob');
const Product = require('../models/Product');
const Store = require('../models/Store');
const Account = require('../models/Account');
const { recordTransaction } = require('../services/ledgerService');

// @desc    Get all repair jobs
// @route   GET /api/repairs
// @access  Private
const getRepairs = async (req, res, next) => {
  try {
    const { search, status, storeId } = req.query;
    const filter = {};

    // Scoping repairs by store depending on user role
    if (req.user.role === 'manager') {
      const store = await Store.findOne({ managerId: req.user._id });
      if (store) filter.storeId = store._id;
    } else if (req.user.assignedStore) {
      filter.storeId = req.user.assignedStore;
    } else if (storeId) {
      filter.storeId = storeId;
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { jobNo: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { deviceModel: searchRegex }
      ];
    }

    const repairs = await RepairJob.find(filter)
      .populate('storeId', 'name')
      .populate('technicians', 'name role')
      .populate('createdBy', 'name')
      .populate('partsUsed.productId', 'name stock price')
      .sort({ createdAt: -1 });

    res.json(repairs);
  } catch (error) {
    next(error);
  }
};

// @desc    Get repair job by ID
// @route   GET /api/repairs/:id
// @access  Private
const getRepairById = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id)
      .populate('storeId', 'name')
      .populate('technicians', 'name role')
      .populate('createdBy', 'name')
      .populate('partsUsed.productId', 'name stock price');

    if (!repair) {
      res.status(404);
      return next(new Error('Repair job not found'));
    }

    res.json(repair);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new repair job
// @route   POST /api/repairs
// @access  Private
const createRepair = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deviceModel,
      deviceSerialNumber,
      reportedIssue,
      estimatedCost,
      notes,
      storeId
    } = req.body;

    if (!customerName || !customerPhone || !deviceModel || !reportedIssue) {
      res.status(400);
      return next(new Error('Please provide customer name, customer phone, device model, and reported issue'));
    }

    // Resolve storeId
    let assignedStore = storeId;
    if (!assignedStore) {
      if (req.user.role === 'manager') {
        const store = await Store.findOne({ managerId: req.user._id });
        if (store) assignedStore = store._id;
      } else if (req.user.assignedStore) {
        assignedStore = req.user.assignedStore;
      } else if (req.user.role === 'admin') {
        const store = await Store.findOne({ isActive: true });
        if (store) assignedStore = store._id;
      }
    }

    if (!assignedStore) {
      res.status(400);
      return next(new Error('Target store is required for creating a repair job'));
    }

    // Generate unique sequential jobNo (REP-XXXXX)
    const lastJob = await RepairJob.findOne({}, {}, { sort: { createdAt: -1 } });
    let nextNumber = 10001;
    if (lastJob && lastJob.jobNo) {
      const match = lastJob.jobNo.match(/REP-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const jobNo = `REP-${nextNumber}`;

    const repair = await RepairJob.create({
      jobNo,
      storeId: assignedStore,
      customerName,
      customerPhone,
      customerEmail,
      deviceModel,
      deviceSerialNumber,
      reportedIssue,
      estimatedCost: estimatedCost || 0,
      notes,
      createdBy: req.user._id,
      status: 'received'
    });

    res.status(201).json(repair);
  } catch (error) {
    next(error);
  }
};

// @desc    Update repair job
// @route   PUT /api/repairs/:id
// @access  Private
const updateRepair = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id);

    if (!repair) {
      res.status(404);
      return next(new Error('Repair job not found'));
    }

    if (repair.status === 'delivered') {
      res.status(400);
      return next(new Error('Cannot update a repair job that has already been delivered'));
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      deviceModel,
      deviceSerialNumber,
      reportedIssue,
      estimatedCost,
      repairFee,
      technicians,
      partsUsed,
      status,
      notes
    } = req.body;

    if (customerName !== undefined) repair.customerName = customerName;
    if (customerPhone !== undefined) repair.customerPhone = customerPhone;
    if (customerEmail !== undefined) repair.customerEmail = customerEmail;
    if (deviceModel !== undefined) repair.deviceModel = deviceModel;
    if (deviceSerialNumber !== undefined) repair.deviceSerialNumber = deviceSerialNumber;
    if (reportedIssue !== undefined) repair.reportedIssue = reportedIssue;
    if (estimatedCost !== undefined) repair.estimatedCost = estimatedCost;
    if (repairFee !== undefined) repair.repairFee = repairFee;
    if (technicians !== undefined) repair.technicians = technicians;
    if (partsUsed !== undefined) repair.partsUsed = partsUsed;
    if (status !== undefined) repair.status = status;
    if (notes !== undefined) repair.notes = notes;

    const updatedRepair = await repair.save();
    res.json(updatedRepair);
  } catch (error) {
    next(error);
  }
};

// @desc    Checkout and deliver repair job
// @route   PUT /api/repairs/:id/deliver
// @access  Private
const deliverRepair = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id);

    if (!repair) {
      res.status(404);
      return next(new Error('Repair job not found'));
    }

    if (repair.status === 'delivered') {
      res.status(400);
      return next(new Error('Repair job has already been delivered'));
    }

    const { paymentMethod, accountId } = req.body;

    if (!paymentMethod || !accountId) {
      res.status(400);
      return next(new Error('Payment method and account are required for delivery'));
    }

    // 1. Validate stock for inventory items in partsUsed
    for (const item of repair.partsUsed) {
      if (item.isInventory && item.productId) {
        const product = await Product.findById(item.productId);
        if (!product) {
          res.status(400);
          return next(new Error(`Product not found for part: ${item.name}`));
        }
        if (product.stock < item.qty) {
          res.status(400);
          return next(new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.qty}`));
        }
      }
    }

    // 2. Deduct inventory quantities
    for (const item of repair.partsUsed) {
      if (item.isInventory && item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.qty }
        });
      }
    }

    // 3. Calculate total amount
    const partsTotal = repair.partsUsed.reduce((sum, item) => sum + (item.cost * item.qty), 0);
    const totalAmount = (repair.repairFee || 0) + partsTotal;

    // 4. Record transaction in Ledger
    await recordTransaction({
      storeId: repair.storeId,
      accountId,
      type: 'income',
      category: 'Phone Repair',
      amount: totalAmount,
      paymentMethod,
      referenceNo: repair.jobNo,
      description: `Device Repair Service - Job #${repair.jobNo} (${repair.deviceModel})`,
      createdBy: req.user._id,
      date: new Date()
    });

    // 5. Finalize status and details
    repair.status = 'delivered';
    repair.paymentMethod = paymentMethod;
    repair.accountId = accountId;
    repair.dateDelivered = new Date();

    const finalizedRepair = await repair.save();
    res.json(finalizedRepair);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete repair job
// @route   DELETE /api/repairs/:id
// @access  Private/Admin/Manager
const deleteRepair = async (req, res, next) => {
  try {
    const repair = await RepairJob.findById(req.params.id);

    if (!repair) {
      res.status(404);
      return next(new Error('Repair job not found'));
    }

    // Block deletion of delivered jobs unless they are cancelled first, or allow only for Admin
    if (repair.status === 'delivered' && req.user.role !== 'admin') {
      res.status(400);
      return next(new Error('Only Admins can delete delivered repair jobs'));
    }

    await repair.deleteOne();
    res.json({ message: 'Repair job deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRepairs,
  getRepairById,
  createRepair,
  updateRepair,
  deliverRepair,
  deleteRepair
};
