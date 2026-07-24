const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, default: 'Mobile Hub' },
  tagline: { type: String, default: 'Where style meets accessories' },
  logo: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  seal: { type: String, default: '' },
  sealUrl: { type: String, default: '' },
  letterheadHeader: { type: String, default: '' },
  letterheadFooter: { type: String, default: '' },
  email: { type: String, default: 'hello@mobilehub.com' },
  phone: { type: String, default: '+94 11 255 5000' },
  phone2: { type: String, default: '' },
  address: { type: String, default: '88 tech Avenue, Colombo 03, Sri Lanka' },
  city: { type: String, default: 'Colombo' },
  country: { type: String, default: 'Sri Lanka' },
  currency: { type: String, default: 'LKR' },
  exchangeRate: { type: Number, default: 320 },
  deliveryFeeThreshold: { type: Number, default: 5000 },
  deliveryFee: { type: Number, default: 350 },
  taxRate: { type: Number, default: 0 },
  kokoInterestRate: { type: Number, default: 0 }, // percentage

  loyaltyPointsPerUnit: { type: Number, default: 100 },
  loyaltyPointValue: { type: Number, default: 1 },
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
  },
  footerText: { type: String, default: '© 2026 Raxwo (Pvt) LTD. All rights reserved.' },
  heroProducts: [{
    name: { type: String },
    price: { type: Number },
    emoji: { type: String },
  }],
  maintenanceMode: { type: Boolean, default: false },
  rolePermissions: {
    cashier: {
      canGenerateBarcodes: { type: Boolean, default: true },
      canAccessReturns: { type: Boolean, default: false },
      canViewInventory: { type: Boolean, default: false },
      canApplyDiscounts: { type: Boolean, default: true },
      canViewSalesReports: { type: Boolean, default: false },
      canManageStock: { type: Boolean, default: false },
    },
    manager: {
      canGenerateBarcodes: { type: Boolean, default: true },
      canAccessReturns: { type: Boolean, default: true },
      canManagePayroll: { type: Boolean, default: true },
      canManageSupplierPayments: { type: Boolean, default: true },
      canViewPredictions: { type: Boolean, default: false },
      canManagePromotions: { type: Boolean, default: true },
    },
  },
  receiptSettings: {
    warrantyTerms: { type: String, default: 'Standard 1-year manufacturer warranty applies unless otherwise stated.' },
    termsAndConditions: { type: String, default: 'Thank you for your business! Goods sold are not returnable/exchangeable unless there is a manufacturing defect.' },
    showWarranty: { type: Boolean, default: true },
    layoutStyle: { type: String, default: 'receipt' }, // 'receipt' | 'a4'
    themeColor: { type: String, default: '#3b82f6' },
    headerTitle: { type: String, default: 'Mobile Hub' },
    subtitle: { type: String, default: '88 Tech Avenue, Colombo 03' },
    footerMessage: { type: String, default: 'Thank you for your purchase!' }
  },
  documentTemplates: {
    paysheet: {
      title: { type: String, default: 'Paysheet' },
      layout: { type: String, default: 'standard' },
      accentColor: { type: String, default: '#2563eb' },
      footerText: { type: String, default: 'This is a system-generated paysheet.' },
      fields: {
        showEmployeeRole: { type: Boolean, default: true },
        showStore: { type: Boolean, default: true },
        showProcessedBy: { type: Boolean, default: true },
        showEmployerContributions: { type: Boolean, default: true },
      },
    },
    invoice: {
      title: { type: String, default: 'Invoice' },
      layout: { type: String, default: 'a4' },
      accentColor: { type: String, default: '#2563eb' },
      footerText: { type: String, default: 'Thank you for your business.' },
      showTax: { type: Boolean, default: true },
      showWarranty: { type: Boolean, default: true },
    },
    posReceipt: {
      title: { type: String, default: 'Receipt' },
      layout: { type: String, default: 'thermal' },
      footerText: { type: String, default: 'Thank you. Come again!' },
      showCashier: { type: Boolean, default: true },
      showBarcode: { type: Boolean, default: true },
      showWarranty: { type: Boolean, default: true },
    },
  },
  smsTemplates: {
    otp: { type: String, default: 'Your {shopName} OTP is {code}.' },
    payment: { type: String, default: 'Payment received for {invoiceNo}. Total: Rs. {total}. Thank you - {shopName}' },
    posReceipt: { type: String, default: 'Thank you for shopping at {shopName}. Invoice {invoiceNo}, total Rs. {total}.' },
    orderStatus: { type: String, default: 'Your order {orderNo} is now {status}. - {shopName}' },
  },
  labelPrinters: [{
    name: { type: String, required: true },
    layout: { type: String, enum: ['50x30', '38x25', 'a4_3col', '80mm'], default: '50x30' },
    connection: { type: String, default: 'USB' },
    isDefault: { type: Boolean, default: false }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
