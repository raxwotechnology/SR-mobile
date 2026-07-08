const mongoose = require('mongoose');

const supplierSchema = mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'Store',
    },
    allStores: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String },
    company: { type: String },
    taxId: { type: String },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    outstandingBalance: { type: Number, default: 0 },
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    bankAccountName: { type: String, default: '' },
    notes: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supplierSchema.index({ storeId: 1, name: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;

