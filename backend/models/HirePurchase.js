const mongoose = require('mongoose');

const installmentPaymentSchema = mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'Card'], default: 'Cash' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  referenceNo: { type: String },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiptNo: { type: String }
}, { timestamps: true });

const hirePurchaseSchema = mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Linked order
    invoiceNumber: { type: String },
    
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      nic: { type: String, required: true }, // National ID
      address: { type: String },
      guarantors: [{
        name: String,
        phone: String,
        nic: String,
        address: String
      }]
    },

    totalAmount: { type: Number, required: true },
    interestRate: { type: Number, default: 0 },
    interestAmount: { type: Number, default: 0 },
    netTotal: { type: Number, required: true }, // totalAmount + interestAmount
    
    downPayment: { type: Number, required: true },
    balanceAmount: { type: Number, required: true }, // netTotal - downPayment
    
    installmentType: { type: String, enum: ['Weekly', 'Monthly'], default: 'Monthly' },
    numberOfInstallments: { type: Number, required: true },
    installmentAmount: { type: Number, required: true },
    
    installmentsPaid: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 }, // Including down payment
    
    payments: [installmentPaymentSchema],
    
    status: { 
      type: String, 
      enum: ['Active', 'Completed', 'Overdue', 'Defaulted', 'Cancelled'], 
      default: 'Active' 
    },
    
    startDate: { type: Date, default: Date.now },
    nextDueDate: { type: Date },
    
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HirePurchase', hirePurchaseSchema);
