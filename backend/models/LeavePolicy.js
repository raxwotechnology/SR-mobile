const mongoose = require('mongoose');

const leavePolicySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    annualLeaves: {
      type: Number,
      default: 14,
    },
    sickLeaves: {
      type: Number,
      default: 7,
    },
    casualLeaves: {
      type: Number,
      default: 7,
    },
    deductionPerExcessLeave: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const LeavePolicy = mongoose.model('LeavePolicy', leavePolicySchema);

module.exports = LeavePolicy;
