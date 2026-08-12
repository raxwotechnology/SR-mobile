const mongoose = require('mongoose');

const reloadStockSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    operator: {
      type: String,
      required: [true, 'Operator is required'],
      enum: ['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT', 'Other'],
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    profitPercentage: {
      type: Number,
      default: 4,
    },
    lastTopUpAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

reloadStockSchema.index({ storeId: 1, operator: 1 }, { unique: true });

module.exports = mongoose.model('ReloadStock', reloadStockSchema);
