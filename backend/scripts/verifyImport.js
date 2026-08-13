const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const HirePurchase = require('../models/HirePurchase');

async function verify() {
  await mongoose.connect(process.env.MONGO_URI);
  const totalHp = await HirePurchase.countDocuments({});
  const completed = await HirePurchase.countDocuments({ status: 'Completed' });
  const active = await HirePurchase.countDocuments({ status: 'Active' });

  console.log('=== VERIFICATION SUMMARY ===');
  console.log(`Total HirePurchase Documents: ${totalHp}`);
  console.log(`Completed Installments: ${completed}`);
  console.log(`Active Installments: ${active}`);

  const sample = await HirePurchase.findOne({ 'payments.0': { $exists: true } });
  if (sample) {
    console.log('\n--- Sample Document with Payment History ---');
    console.log(`Invoice: ${sample.invoiceNumber}`);
    console.log(`Customer:`, sample.customer);
    console.log(`Net Total: ${sample.netTotal}, DownPayment: ${sample.downPayment}, Balance: ${sample.balanceAmount}`);
    console.log(`Status: ${sample.status}`);
    console.log(`Total Payments Made: ${sample.payments.length}`);
    console.log(`First Payment Sample:`, sample.payments[0]);
  }
  process.exit(0);
}

verify();
