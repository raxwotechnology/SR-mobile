const mongoose = require('mongoose');

const reloadSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },
    operator: {
      type: String,
      required: [true, 'Operator is required'],
      enum: ['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT', 'Other'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    type: {
      type: String,
      enum: ['Prepaid', 'Postpaid', 'Bill Payment', 'Scratch Card'],
      default: 'Prepaid',
    },
    profitPercentage: {
      type: Number,
      default: 4,
    },
    profitAmount: {
      type: Number,
      default: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    cardDenomination: {
      type: Number,
    },
    isCard: {
      type: Boolean,
      default: false,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Bank Transfer'],
      default: 'Cash',
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Completed',
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

reloadSchema.index({ mobileNumber: 1 });
reloadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reload', reloadSchema);
