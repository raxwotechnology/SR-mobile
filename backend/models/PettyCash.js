const mongoose = require('mongoose');

const pettyCashSchema = mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    type: {
      type: String,
      enum: ['in', 'out'], // 'in' for cash deposits, 'out' for cash withdrawals/spending
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    referenceNo: {
      type: String,
      trim: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account', // Linked bank account (for double-entry adjustments/transfers)
    },
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

pettyCashSchema.index({ storeId: 1, date: -1 });

module.exports = mongoose.model('PettyCash', pettyCashSchema);
