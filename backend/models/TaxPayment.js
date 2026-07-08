const mongoose = require('mongoose');

const taxPaymentSchema = mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    period: {
      type: String,
      required: true, // e.g., 'Yearly', 'Q1', 'Q2', 'Q3', 'Q4'
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    referenceNo: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

taxPaymentSchema.index({ storeId: 1, year: 1, period: 1 });

module.exports = mongoose.model('TaxPayment', taxPaymentSchema);
