const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');
const Category = require('../models/Category');
const Store = require('../models/Store');
const mongoose = require('mongoose');

// Helper: generate SKU like 'MOB-0042' or 'PRD-0001'
const generateSku = async (categoryName = '', prefix = '') => {
  // Take first 3 chars of category, uppercase
  const catCode = (categoryName || 'PRD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3) || 'PRD';
  const baseCode = prefix ? `${prefix}-${catCode}` : catCode;
  // Count existing products with this SKU prefix
  const count = await Product.countDocuments({ sku: { $regex: `^${baseCode}-` } });
  return `${baseCode}-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Get all products (with filtering, sorting, pagination)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { status: 'active' };

    if (req.query.category) filter.categoryId = req.query.category;
    if (req.query.store) filter.storeId = req.query.store;
    if (req.query.featured === 'true') filter.isFeatured = true;
    if (req.query.onSale === 'true') filter.isOnSale = true;

    // Price range
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Rating filter
    if (req.query.rating) {
      filter.averageRating = { $gte: Number(req.query.rating) };
    }

    // Build sort
    let sort = {};
    switch (req.query.sort) {
      case 'price_low':
        sort = { price: 1 };
        break;
      case 'price_high':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { averageRating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { totalReviews: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .populate('supplierId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res, next) => {
  try {
    const keyword = req.query.q;
    if (!keyword) {
      return res.json({ products: [] });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ],
      status: 'active',
    })
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .limit(20);

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, status: 'active' })
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .limit(12);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Get deals / on-sale products
// @route   GET /api/products/deals
// @access  Public
const getDeals = async (req, res, next) => {
  try {
    const products = await Product.find({ isOnSale: true, status: 'active' })
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo')
      .sort({ discount: -1 })
      .limit(12);
    res.json(products);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug')
      .populate('storeId', 'name slug logo city phone email')
      .populate('supplierId', 'name');

    if (product) {
      res.json(product);
    } else {
      res.status(404);
      next(new Error('Product not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/StoreOwner
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      categoryId,
      subCategory,
      description,
      price,
      mrp,
      discount,
      unit,
      variants,
      stock,
      images,
      isFeatured,
      isOnSale,
      allowKokoOnline,
      allowKokoPos,
      purchasePrice,
      brand,
      modelNumber,
      ram,
      storage,
      color,
      condition,
      imei,
      warranty,
      supplierId,
      productLink,
      minPrice,
    } = req.body;

    const numericPrice = Number(price || 0);
    const numericMinPrice = Number(minPrice || 0);
    if (numericMinPrice > 0 && numericPrice < numericMinPrice) {
      res.status(400);
      return next(new Error('Selling price cannot be lower than the configured minimum price'));
    }


    let finalCategoryId = categoryId;
    
    // If categoryId is not a valid MongoDB ID, treat it as a name and find/create
    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      const categoryName = categoryId.trim();
      let category = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
      
      if (!category) {
        const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
        category = await Category.create({
          name: categoryName,
          slug: catSlug,
          description: `Auto-created category for ${categoryName}`,
          image: '/uploads/default-category.png'
        });
      }
      finalCategoryId = category._id;
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    // Auto-generate SKU if not provided
    let sku = req.body.sku;
    if (!sku) {
      const catObj = await Category.findById(finalCategoryId).lean();
      sku = await generateSku(catObj?.name || '', '');
    }


    const product = await Product.create({
      storeId: req.body.storeId,
      name,
      slug,
      categoryId: finalCategoryId,

      subCategory,
      description,
      price: numericPrice,
      mrp,
      discount: discount || Math.round(((mrp - price) / mrp) * 100),
      unit,
      variants: variants || [],
      stock,
      images: images || [],
      isFeatured: isFeatured || false,
      isOnSale: isOnSale || false,
      allowKokoOnline: allowKokoOnline !== undefined ? !!allowKokoOnline : true,
      allowKokoPos: allowKokoPos !== undefined ? !!allowKokoPos : true,
      brand,
      modelNumber,
      ram,
      storage,
      color,
      condition,
      imei: Array.isArray(imei) ? imei : imei ? [imei] : [],
      warranty,
      supplierId: supplierId || null,
      sku,
      lastCost: Number(purchasePrice || 0),

      avgCost: Number(purchasePrice || 0),
      costPrice: Number(purchasePrice || 0),
      minPrice: numericMinPrice,
      newStock: stock || 0,
      oldStock: 0,
      stockType: 'new',
      productLink,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/StoreOwner
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    const fields = [
      'name', 'categoryId', 'subCategory', 'description', 'price',
      'mrp', 'discount', 'unit', 'variants', 'stock', 'images',
      'isFeatured', 'isOnSale', 'status', 'allowKokoOnline', 'allowKokoPos',
      'stockType', 'oldStock', 'newStock', 'costPrice', 'storeId',
      'brand', 'modelNumber', 'ram', 'storage', 'color', 'condition', 'imei', 'warranty', 'supplierId', 'productLink', 'minPrice'
    ];



    if (req.body.categoryId && !mongoose.Types.ObjectId.isValid(req.body.categoryId)) {
      const categoryName = req.body.categoryId.trim();
      let category = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
      
      if (!category) {
        const catSlug = categoryName.toLowerCase().replace(/\s+/g, '-');
        category = await Category.create({
          name: categoryName,
          slug: catSlug,
          description: `Auto-created category for ${categoryName}`,
          image: '/uploads/default-category.png'
        });
      }
      req.body.categoryId = category._id;
    }

    const nextPrice = req.body.price !== undefined ? Number(req.body.price || 0) : Number(product.price || 0);
    const nextMinPrice = req.body.minPrice !== undefined ? Number(req.body.minPrice || 0) : Number(product.minPrice || 0);
    if (nextMinPrice > 0 && nextPrice < nextMinPrice) {
      res.status(400);
      return next(new Error('Selling price cannot be lower than the configured minimum price'));
    }


    // Log price change if price or cost changed
    const priceChanged = req.body.price !== undefined && Number(req.body.price) !== product.price;
    const costChanged = req.body.costPrice !== undefined && Number(req.body.costPrice) !== Number(product.costPrice || 0);
    const mrpChanged = req.body.mrp !== undefined && Number(req.body.mrp) !== Number(product.mrp || 0);

    if (priceChanged || costChanged || mrpChanged) {
      const oldPrice = product.price;
      const newPrice = Number(req.body.price || product.price);
      const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice * 100) : 0;

      await PriceHistory.create({
        productId: product._id,
        storeId: product.storeId,
        oldPrice,
        newPrice,
        oldCost: Number(product.costPrice || product.lastCost || 0),
        newCost: Number(req.body.costPrice || req.body.purchasePrice || product.costPrice || 0),
        oldMrp: Number(product.mrp || 0),
        newMrp: Number(req.body.mrp || product.mrp || 0),
        priceChangePercent: Math.round(changePercent * 10) / 10,
        reason: req.body.priceChangeReason || 'Price update',
        changedBy: req.user?._id,
      });
    }

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    if (req.body.name) {
      product.slug = req.body.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }

    if (req.body.purchasePrice !== undefined) {
      const parsedPurchasePrice = Number(req.body.purchasePrice || 0);
      product.lastCost = parsedPurchasePrice;
      product.avgCost = parsedPurchasePrice;
      if (!req.body.costPrice) product.costPrice = parsedPurchasePrice;
    }

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/StoreOwner/Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products for a store owner's store (including inactive)
// @route   GET /api/products/my-store
// @access  Private/StoreOwner
const getMyProducts = async (req, res, next) => {
  try {
    const Store = require('../models/Store');
    const store = await Store.findOne({ managerId: req.user._id });
    if (!store) {
      res.status(404);
      return next(new Error('No store found for this user'));
    }
    const products = await Product.find({ storeId: store._id })
      .populate('categoryId', 'name slug')
      .populate('supplierId', 'name')
      .sort({ createdAt: -1 });
    res.json({ products, store });
  } catch (error) {
    next(error);
  }
};

// @desc    Get price history for a product
// @route   GET /api/products/:id/price-history
// @access  Private/Admin/Manager
const getPriceHistory = async (req, res, next) => {
  try {
    const history = await PriceHistory.find({ productId: req.params.id })
      .populate('changedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (error) { next(error); }
};

// @desc    Get next auto-generated SKU for a category
// @route   GET /api/products/next-sku?categoryId=xxx
// @access  Private
const getNextSku = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    let catName = 'PRD';
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const cat = await Category.findById(categoryId).lean();
      if (cat) catName = cat.name;
    }
    const sku = await generateSku(catName, '');
    res.json({ sku });
  } catch (error) { next(error); }
};

module.exports = {
  getProducts,
  searchProducts,
  getFeaturedProducts,
  getDeals,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getPriceHistory,
  getNextSku,
};
