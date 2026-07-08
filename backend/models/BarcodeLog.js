const mongoose = require('mongoose');

const barcodeLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
    },
    barcode: {
      type: String,
    },
    price: {
      type: Number,
    },
    shopName: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generatedByName: {
      type: String,
      required: true,
    },
    generatedByRole: {
      type: String,
      enum: ['admin', 'manager', 'cashier'],
      required: true,
    },
    printerName: {
      type: String,
      default: 'Default Printer',
    },
  },
  {
    timestamps: true,
  }
);

barcodeLogSchema.index({ createdAt: -1 });
barcodeLogSchema.index({ generatedBy: 1 });
barcodeLogSchema.index({ productId: 1 });

module.exports = mongoose.model('BarcodeLog', barcodeLogSchema);
