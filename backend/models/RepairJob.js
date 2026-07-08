const mongoose = require('mongoose');

const repairJobSchema = new mongoose.Schema(
  {
    jobNo: {
      type: String,
      required: true,
      unique: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
    },
    deviceModel: {
      type: String,
      required: true,
      trim: true,
    },
    deviceSerialNumber: {
      type: String,
      trim: true,
    },
    reportedIssue: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    repairFee: {
      type: Number,
      default: 0,
    },
    technicians: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    partsUsed: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: {
          type: String,
          required: true,
        },
        cost: {
          type: Number,
          required: true,
          default: 0,
        },
        qty: {
          type: Number,
          required: true,
          default: 1,
        },
        isInventory: {
          type: Boolean,
          default: false,
        },
      },
    ],
    status: {
      type: String,
      enum: ['received', 'in_progress', 'completed', 'delivered', 'cancelled'],
      default: 'received',
    },
    notes: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Bank Transfer', 'Card', 'Cheque'],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    dateReceived: {
      type: Date,
      default: Date.now,
    },
    dateDelivered: {
      type: Date,
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

module.exports = mongoose.model('RepairJob', repairJobSchema);
