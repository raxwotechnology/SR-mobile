const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const HirePurchase = require('../models/HirePurchase');
const Store = require('../models/Store');
const User = require('../models/User');

const filePath = 'D:\\Intern\\SR Mobile Official-1\\SR Mobile Official\\sql\\shopmanager1-14.sql';

// Parsing helpers
function parseTuples(str) {
  const rows = [];
  let inString = false;
  let quoteChar = '';
  let escape = false;
  let currentTuple = '';
  let inTuple = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escape) {
      currentTuple += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      currentTuple += char;
      escape = true;
      continue;
    }

    if (inString) {
      currentTuple += char;
      if (char === quoteChar) {
        inString = false;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      inString = true;
      quoteChar = char;
      currentTuple += char;
      continue;
    }

    if (char === '(' && !inTuple) {
      inTuple = true;
      currentTuple = '';
      continue;
    }

    if (char === ')' && inTuple) {
      inTuple = false;
      rows.push(splitValues(currentTuple));
      currentTuple = '';
      continue;
    }

    if (inTuple) {
      currentTuple += char;
    }
  }

  return rows;
}

function splitValues(tupleStr) {
  const values = [];
  let current = '';
  let inString = false;
  let quoteChar = '';
  let escape = false;

  for (let i = 0; i < tupleStr.length; i++) {
    const char = tupleStr[i];

    if (escape) {
      current += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      current += char;
      escape = true;
      continue;
    }

    if (inString) {
      if (char === quoteChar) {
        inString = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      inString = true;
      quoteChar = char;
      continue;
    }

    if (char === ',') {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseDateStr(dateStr, timeStr) {
  if (!dateStr) return new Date();
  try {
    // Format in SQL: 2024/08/22 or 2024-08-22
    let cleanDate = dateStr.replace(/\//g, '-');
    if (timeStr) {
      cleanDate += ' ' + timeStr;
    }
    const d = new Date(cleanDate);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch (e) {
    return new Date();
  }
}

async function runImport() {
  console.log('Reading SQL file...');
  const content = fs.readFileSync(filePath, 'utf8');

  const tablesToExtract = ['acustomer', 'adv', 'advance', 'advpay'];
  const data = {};

  for (const tName of tablesToExtract) {
    data[tName] = [];
    const regex = new RegExp(`INSERT INTO \`${tName}\` (?:\\([^)]+\\)\\s+)?VALUES\\s*([\\s\\S]*?);`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const valuesBlock = match[1];
      const tuples = parseTuples(valuesBlock);
      data[tName].push(...tuples);
    }
  }

  console.log(`Parsed SQL Data Summary:`);
  console.log(`  acustomer: ${data.acustomer.length}`);
  console.log(`  adv: ${data.adv.length}`);
  console.log(`  advance: ${data.advance.length}`);
  console.log(`  advpay: ${data.advpay.length}`);

  // Connect to DB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const store = await Store.findOne({});
  const admin = await User.findOne({ role: 'admin' });

  if (!store) {
    console.error('No Store found in DB!');
    process.exit(1);
  }

  const storeId = store._id;
  const createdBy = admin ? admin._id : undefined;

  // Build lookup maps by receipt number
  // acustomer: [no, receipt, Date, title, name, nic, mobile, address]
  const customerMap = {};
  for (const c of data.acustomer) {
    const receipt = c[1];
    if (!receipt) continue;
    customerMap[receipt] = {
      title: c[3] || '',
      name: c[4] || 'Unknown Customer',
      nic: c[5] || 'N/A',
      phone: c[6] || '0000000000',
      address: c[7] || ''
    };
  }

  // advance (item details): [no, receipt, Date, Time, item, brand, model, qunt, price, buyprice, subtotal, discount, total, advance, Fee, adbalance, sid]
  const itemMap = {};
  for (const item of data.advance) {
    const receipt = item[1];
    if (!receipt) continue;
    if (!itemMap[receipt]) itemMap[receipt] = [];
    const imei = item[4] || '';
    const brand = item[5] || '';
    const model = item[6] || '';
    const price = item[8] || '0';
    const fee = item[14] || '0';
    itemMap[receipt].push(`${brand} ${model} (IMEI: ${imei}, Price: ${price}${fee !== '0' ? ', Fee: ' + fee : ''})`);
  }

  // advpay (installment payments): [no, receipt, Date, time, dtotal, discount, total, advance, balance]
  const payMap = {};
  for (const pay of data.advpay) {
    const receipt = pay[1];
    if (!receipt) continue;
    if (!payMap[receipt]) payMap[receipt] = [];
    const pDate = parseDateStr(pay[2], pay[3]);
    const amount = parseFloat(pay[7] || pay[4] || '0') || 0;
    if (amount > 0) {
      payMap[receipt].push({
        amount: amount,
        date: pDate,
        paymentMethod: 'Cash',
        referenceNo: `ADV-PAY-${pay[0]}`,
        receiptNo: receipt
      });
    }
  }

  console.log('Building HirePurchase documents...');
  const hirePurchaseDocs = [];

  // adv: [no, receipt, date, time, dtotal, discount, total, advance, Fee, balance, sid, status]
  for (const advRow of data.adv) {
    const receipt = advRow[1];
    const dateStr = advRow[2];
    const timeStr = advRow[3];
    const dtotal = parseFloat(advRow[4] || '0') || 0;
    const discount = parseFloat(advRow[5] || '0') || 0;
    const total = parseFloat(advRow[6] || '0') || 0;
    const advancePaid = parseFloat(advRow[7] || '0') || 0;
    const fee = parseFloat(advRow[8] || '0') || 0;
    const balance = parseFloat(advRow[9] || '0') || 0;
    const sqlStatus = (advRow[11] || '').trim();

    const cust = customerMap[receipt] || {
      name: `Customer #${receipt}`,
      phone: '0000000000',
      nic: 'N/A',
      address: ''
    };

    const fullName = (cust.title ? cust.title + ' ' : '') + cust.name;
    const itemsList = itemMap[receipt] ? itemMap[receipt].join('; ') : '';
    const paymentsList = payMap[receipt] || [];

    const totalPaidFromPayments = paymentsList.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidSum = advancePaid + totalPaidFromPayments;

    // Status mapping
    let hpStatus = 'Active';
    if (balance <= 0 || sqlStatus.toLowerCase() === 'completed') {
      hpStatus = 'Completed';
    }

    const doc = {
      storeId: storeId,
      invoiceNumber: receipt,
      customer: {
        name: fullName.trim() || 'Unknown Customer',
        phone: cust.phone || '0000000000',
        nic: cust.nic || 'N/A',
        address: cust.address || '',
        guarantors: []
      },
      totalAmount: total > 0 ? total : dtotal,
      interestRate: 0,
      interestAmount: fee,
      netTotal: (total > 0 ? total : dtotal) + fee,
      downPayment: advancePaid,
      balanceAmount: Math.max(0, balance),
      installmentType: 'Monthly',
      numberOfInstallments: paymentsList.length > 0 ? paymentsList.length : 1,
      installmentAmount: paymentsList.length > 0 ? (paymentsList[0].amount || balance) : balance,
      installmentsPaid: paymentsList.length,
      totalPaid: totalPaidSum,
      payments: paymentsList,
      status: hpStatus,
      startDate: parseDateStr(dateStr, timeStr),
      notes: itemsList ? `Items: ${itemsList}` : undefined,
      createdBy: createdBy
    };

    hirePurchaseDocs.push(doc);
  }

  console.log(`Prepared ${hirePurchaseDocs.length} HirePurchase documents for bulk insertion.`);

  // Insert in batches of 500
  const batchSize = 500;
  let insertedCount = 0;

  for (let i = 0; i < hirePurchaseDocs.length; i += batchSize) {
    const batch = hirePurchaseDocs.slice(i, i + batchSize);
    await HirePurchase.insertMany(batch);
    insertedCount += batch.length;
    console.log(`Inserted ${insertedCount}/${hirePurchaseDocs.length} documents...`);
  }

  console.log('✅ ALL INSTALLMENT RECORDS IMPORTED SUCCESSFULLY!');
  process.exit(0);
}

runImport().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
