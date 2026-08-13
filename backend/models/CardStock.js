const mongoose = require('mongoose');

const cardStockSchema = new mongoose.Schema(
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
    denomination: {
      type: Number,
      required: [true, 'Denomination is required'],
      min: [1, 'Denomination must be at least 1'],
    },
    cardName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    profitPercentage: {
      type: Number,
      default: 4,
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

cardStockSchema.index({ storeId: 1, operator: 1, denomination: 1 }, { unique: true });

module.exports = mongoose.model('CardStock', cardStockSchema);
