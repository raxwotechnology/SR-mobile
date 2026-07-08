const mongoose = require('mongoose');

const attendancePolicySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    shiftStartTime: {
      type: String,
      default: '09:00', // HH:MM
    },
    shiftEndTime: {
      type: String,
      default: '17:00', // HH:MM
    },
    graceTimeMinutes: {
      type: Number,
      default: 15,
    },
    lateArrivalPenalty: {
      type: Number,
      default: 0, // Deduction per late check-in
    },
    earlyCheckoutPenalty: {
      type: Number,
      default: 0, // Deduction per early check-out
    },
    halfDayThresholdHours: {
      type: Number,
      default: 4, // Hours below this count as half-day or absent
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

const AttendancePolicy = mongoose.model('AttendancePolicy', attendancePolicySchema);

module.exports = AttendancePolicy;
