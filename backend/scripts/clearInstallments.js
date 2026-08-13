const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const HirePurchase = require('../models/HirePurchase');
const CreditPayment = require('../models/CreditPayment');

async function clearInstallments() {
  try {
    const connStr = process.env.MONGO_URI;
    if (!connStr) {
      console.error('MONGO_URI is missing in .env file!');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(connStr);
    console.log('Connected successfully.');

    const hpCountBefore = await HirePurchase.countDocuments({});
    const cpCountBefore = await CreditPayment.countDocuments({});

    console.log(`Found ${hpCountBefore} HirePurchase records.`);
    console.log(`Found ${cpCountBefore} CreditPayment records.`);

    console.log('Deleting all HirePurchase records...');
    const hpRes = await HirePurchase.deleteMany({});
    console.log(`Deleted ${hpRes.deletedCount} HirePurchase records.`);

    console.log('Deleting all CreditPayment records...');
    const cpRes = await CreditPayment.deleteMany({});
    console.log(`Deleted ${cpRes.deletedCount} CreditPayment records.`);

    console.log('All installment records have been successfully cleared!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing installment records:', error);
    process.exit(1);
  }
}

clearInstallments();
