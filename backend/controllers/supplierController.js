const Supplier = require('../models/Supplier');
const Store = require('../models/Store');

const resolveStoreId = async (req) => {
  if (req.user.role === 'manager') {
    const store = await Store.findOne({ managerId: req.user._id }).select('_id').lean();
    return store?._id || null;
  }
  return req.body?.storeId || req.query?.storeId || null;
};

// @desc    List suppliers
// @route   GET /api/suppliers
// @access  Private/Admin/Manager
const listSuppliers = async (req, res, next) => {
  try {
    const storeId = await resolveStoreId(req);
    const isSuper = req.user.email === 'admin@mobilehub.com' || req.user.isSuperAdmin;
    const isAdmin = req.user.role === 'admin';

    if (!storeId && !isSuper && !isAdmin) {
      res.status(400);
      return next(new Error('storeId is required'));
    }

    const filter = {};
    if (storeId) {
      filter.$or = [
        { storeId: storeId },
        { allStores: true }
      ];
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) filter.name = { $regex: req.query.q, $options: 'i' };

    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) { next(error); }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private/Admin/Manager
const createSupplier = async (req, res, next) => {
  try {
    const allStores = req.body.allStores === true;
    const storeId = allStores ? null : await resolveStoreId(req);
    if (!allStores && !storeId) {
      res.status(400);
      return next(new Error('storeId is required unless allStores is true'));
    }
    const {
      name, contactPerson, company, taxId, email, phone, address, notes, status,
      bankName, bankBranch, bankAccountNumber, bankAccountName
    } = req.body;
    
    if (!name) {
      res.status(400);
      return next(new Error('Supplier name is required'));
    }

    const supplier = await Supplier.create({
      storeId: allStores ? null : storeId,
      allStores,
      name,
      contactPerson: contactPerson || '',
      company: company || '',
      taxId: taxId || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      notes: notes || '',
      status: status || 'active',
      bankName: bankName || '',
      bankBranch: bankBranch || '',
      bankAccountNumber: bankAccountNumber || '',
      bankAccountName: bankAccountName || '',
      createdBy: req.user._id,
    });
    res.status(201).json(supplier);
  } catch (error) { next(error); }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin/Manager
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }

    const storeId = await resolveStoreId(req);
    if (storeId && supplier.storeId && String(supplier.storeId) !== String(storeId) && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized for this supplier'));
    }

    const fields = [
      'name', 'contactPerson', 'company', 'taxId', 'email', 'phone', 'address', 'notes', 'status',
      'bankName', 'bankBranch', 'bankAccountNumber', 'bankAccountName', 'allStores'
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) supplier[f] = req.body[f];
    });

    if (req.body.allStores === true) {
      supplier.storeId = null;
    } else if (req.body.storeId !== undefined) {
      supplier.storeId = req.body.storeId;
    }

    await supplier.save();
    res.json(supplier);
  } catch (error) { next(error); }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin/Manager
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      res.status(404);
      return next(new Error('Supplier not found'));
    }

    const storeId = await resolveStoreId(req);
    if (storeId && String(supplier.storeId) !== String(storeId) && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('Not authorized for this supplier'));
    }

    await supplier.deleteOne();
    res.json({ message: 'Supplier deleted' });
  } catch (error) { next(error); }
};

module.exports = {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};

