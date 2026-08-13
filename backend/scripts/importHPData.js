const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import Mongoose models
const HirePurchase = require('../models/HirePurchase');
const Store = require('../models/Store');
const User = require('../models/User');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const readline = require('readline');

const MONGO_URI = process.env.MONGO_URI;
const jsonFilePath = path.join(__dirname, './migrated_records.json');
const sqlFilePath = process.env.SQL_FILE_PATH || 'C:/Users/ASUS/Downloads/shopmanager1-13.sql';

function parseSqlRow(rowStr) {
  const values = [];
  let current = '';
  let inString = false;
  let stringChar = null;
  let escaped = false;
  
  const start = rowStr.indexOf('(');
  const end = rowStr.lastIndexOf(')');
  if (start === -1 || end === -1) return null;
  const content = rowStr.slice(start + 1, end);
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (inString) {
      if (char === stringChar) {
        inString = false;
      } else {
        current += char;
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
      } else if (char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  values.push(current.trim());
  return values;
}

const parseCustomersFromSql = async (sqlPath) => {
  const customerMap = new Map();
  if (!fs.existsSync(sqlPath)) {
    console.log(`\n[WARNING] SQL file not found at: ${sqlPath}`);
    console.log('Customer details will be generated with placeholder values.\n');
    return customerMap;
  }
  
  console.log(`\nParsing customer details from SQL file: ${sqlPath}...`);
  const fileStream = fs.createReadStream(sqlPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let inCustomerInsert = false;

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.startsWith('INSERT INTO `customer`') || 
        trimmed.startsWith('INSERT INTO `acustomer`') ||
        trimmed.startsWith('INSERT INTO `wscustomer`')) {
      inCustomerInsert = true;
      continue;
    }
    if (inCustomerInsert) {
      if (trimmed.startsWith('(')) {
        const parsed = parseSqlRow(trimmed);
        if (parsed) {
          const receipt = parsed[1];
          const Title = parsed[3];
          const name = parsed[4];
          const nic = parsed[5];
          const mobile = parsed[6];
          const address = parsed[7];
          
          customerMap.set(receipt, {
            name: (Title && Title !== "''" && Title !== '""' ? Title + ' ' : '') + name,
            nic: nic || '000000000V',
            phone: mobile || '0000000000',
            address: address || 'Migrated from previous system'
          });
        }
      } else if (trimmed.includes(';')) {
        inCustomerInsert = false;
      }
    }
  }
  console.log(`Successfully parsed ${customerMap.size} unique customer receipt records from SQL.\n`);
  return customerMap;
};

const importRecords = async () => {
  try {
    console.log('Connecting to database...');
    if (!MONGO_URI) {
      throw new Error('MONGO_URI is not defined in the env variables!');
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');

    // Read the JSON file
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON file not found at: ${jsonFilePath}`);
    }
    const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
    const records = JSON.parse(rawData);
    console.log(`Loaded ${records.length} records from JSON file.`);

    // Parse SQL customer dump
    const customerMap = await parseCustomersFromSql(sqlFilePath);

    // Clear existing migrated placeholder/records first to prevent duplication
    console.log('Clearing existing migrated Hire Purchase records from database...');
    const deleteResult = await HirePurchase.deleteMany({ notes: /Migrated from previous system/ });
    console.log(`Deleted ${deleteResult.deletedCount} existing migrated records.`);

    // Retrieve default Store and Admin User (Required for references)
    const store = await Store.findOne();
    const adminUser = await User.findOne({ role: 'admin' });

    if (!store) {
      throw new Error('Store not found in database. Please run seed script first.');
    }
    if (!adminUser) {
      throw new Error('Admin user not found in database. Please bootstrap an admin.');
    }
    console.log(`Using Store: ${store.name} (${store._id})`);
    console.log(`Using Admin: ${adminUser.name || adminUser.email} (${adminUser._id})`);

    const ONLY_IMPORT_ACTIVE = false; // User requested all 3,035 records

    let importedCount = 0;
    const hpRecordsToInsert = [];

    for (const record of records) {
      const isCompleted = record.balance === 0;

      if (ONLY_IMPORT_ACTIVE && isCompleted) {
        continue;
      }

      // Calculations:
      const totalPaid = record.total - record.balance;
      
      // payments array configuration:
      const payments = [];

      // 1. Add the Down Payment (Advance)
      payments.push({
        amount: record.advance,
        date: new Date(record.date),
        paymentMethod: 'Cash',
        receivedBy: adminUser._id,
        receiptNo: `HP-REC-DP-${record.rNo}`
      });

      // 2. Add remaining paid amount as installment payments (if any installments have been paid)
      const installmentsPaidAmount = totalPaid - record.advance;
      if (installmentsPaidAmount > 0) {
        payments.push({
          amount: installmentsPaidAmount,
          date: new Date(record.date),
          paymentMethod: 'Cash',
          receivedBy: adminUser._id,
          receiptNo: `HP-REC-INST-${record.rNo}`
        });
      }

      // Estimate monthly installment amount based on a default 12-month duration
      const totalLoanAmount = record.total - record.advance;
      const installmentAmount = totalLoanAmount > 0 ? Math.ceil(totalLoanAmount / 12) : 0;

      // Look up customer in SQL map
      const cust = customerMap.get(record.rNo);
      const customerData = cust ? {
        name: cust.name,
        phone: cust.phone,
        nic: cust.nic,
        address: cust.address
      } : {
        name: `Customer R-${record.rNo}`,
        phone: '0000000000',
        nic: '000000000V',
        address: 'Migrated from previous system'
      };

      // Construct HirePurchase object
      hpRecordsToInsert.push({
        storeId: store._id,
        customer: customerData,
        totalAmount: record.total,
        interestRate: 0,
        interestAmount: 0,
        netTotal: record.total,
        downPayment: record.advance,
        balanceAmount: record.balance,
        installmentType: 'Monthly',
        numberOfInstallments: 12,
        installmentAmount: installmentAmount,
        installmentsPaid: installmentsPaidAmount > 0 ? Math.floor(installmentsPaidAmount / installmentAmount) : 0,
        totalPaid: totalPaid,
        payments: payments,
        status: isCompleted ? 'Completed' : 'Active',
        startDate: new Date(record.date),
        notes: `Migrated from previous system. Old Receipt No: ${record.rNo}`,
        createdBy: adminUser._id
      });
    }

    const matchedCount = hpRecordsToInsert.filter(r => !r.customer.name.startsWith('Customer R-')).length;
    console.log(`Matched and resolved actual customer details for ${matchedCount} / ${hpRecordsToInsert.length} records (${(matchedCount / hpRecordsToInsert.length * 100).toFixed(2)}%).`);
    console.log(`Prepared ${hpRecordsToInsert.length} records for database insertion...`);
    
    // Perform bulk insertion in chunks of 500 for better database performance
    const chunkSize = 500;
    for (let i = 0; i < hpRecordsToInsert.length; i += chunkSize) {
      const chunk = hpRecordsToInsert.slice(i, i + chunkSize);
      await HirePurchase.insertMany(chunk);
      importedCount += chunk.length;
      console.log(`Successfully inserted ${importedCount} / ${hpRecordsToInsert.length} records.`);
    }

    console.log(`Migration completed successfully! Imported a total of ${importedCount} records.`);
    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

importRecords();
