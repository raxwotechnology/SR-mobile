const BarcodeLog = require('../models/BarcodeLog');
const Product = require('../models/Product');
const Settings = require('../models/Settings');

// @desc    Log barcode generation + return product details
// @route   POST /api/barcodes/generate
// @access  Private (admin, manager, cashier — permission-gated)
const generateBarcode = async (req, res, next) => {
  try {
    const { productId, quantity = 1, printerName = 'Default Printer' } = req.body;

    if (!productId) {
      res.status(400);
      return next(new Error('Product ID is required'));
    }
    if (quantity < 1 || quantity > 500) {
      res.status(400);
      return next(new Error('Quantity must be between 1 and 500'));
    }

    // Check role permission
    const settings = await Settings.findOne().lean();
    const rolePerms = settings?.rolePermissions?.[req.user.role];
    if (rolePerms && rolePerms.canGenerateBarcodes === false) {
      res.status(403);
      return next(new Error('You do not have permission to generate barcodes'));
    }

    const product = await Product.findById(productId)
      .select('name price sku barcode images')
      .lean();

    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    // Generate barcode value if product doesn't have one
    const barcodeValue = product.barcode || product.sku || `ZFC-${product._id.toString().slice(-8).toUpperCase()}`;
    const shopName = settings?.shopName || 'Mobile Hub';

    // Log the generation
    await BarcodeLog.create({
      productId: product._id,
      productName: product.name,
      sku: product.sku || '',
      barcode: barcodeValue,
      price: product.price,
      shopName,
      quantity,
      generatedBy: req.user._id,
      generatedByName: req.user.name,
      generatedByRole: req.user.role,
      printerName,
    });

    res.status(201).json({
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        sku: product.sku,
        barcode: barcodeValue,
        image: product.images?.[0] || '',
      },
      shopName,
      quantity,
      barcodeValue,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get barcode generation logs
// @route   GET /api/barcodes/logs
// @access  Private/Admin
const getBarcodeLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, startDate, endDate, role } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { generatedByName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      filter.generatedByRole = role;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      BarcodeLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BarcodeLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateBarcode,
  getBarcodeLogs,
};
