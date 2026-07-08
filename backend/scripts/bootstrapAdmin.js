/**
 * Bootstrap Admin User
 * Creates the initial admin account and core staff users so the seed script can run.
 * Run once: node scripts/bootstrapAdmin.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db');
const User = require('../models/User');

const bootstrapUsers = async () => {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      console.log('Skipping bootstrap. Run seed.js to populate catalog data.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);

    // Create admin
    const admin = await User.create({
      name: 'Mobile Hub Admin',
      email: 'admin@mobilehub.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      phone: '+94771234567',
      isActive: true,
    });
    console.log('✅ Admin created:', admin.email);

    // Create manager
    const manager = await User.create({
      name: 'Nisha Perera',
      email: 'manager@mobilehub.com',
      password: await bcrypt.hash('manager123', salt),
      role: 'manager',
      phone: '+94772345678',
      isActive: true,
      permissions: {
        employees: true,
        products: true,
        sales: true,
        suppliers: true,
        reports: true,
        inventory: true
      }
    });
    console.log('✅ Manager created:', manager.email);

    // Create cashier
    const cashier = await User.create({
      name: 'Dilshan Fernando',
      email: 'cashier@mobilehub.com',
      password: await bcrypt.hash('cashier123', salt),
      role: 'cashier',
      phone: '+94773456789',
      isActive: true,
      employeeInfo: { salary: 45000, department: 'Sales', joinDate: new Date('2025-01-15') },
    });
    console.log('✅ Cashier created:', cashier.email);

    // Create delivery
    const delivery = await User.create({
      name: 'Kamal Silva',
      email: 'delivery@mobilehub.com',
      password: await bcrypt.hash('delivery123', salt),
      role: 'deliveryGuy',
      phone: '+94774567890',
      isActive: true,
      employeeInfo: { salary: 35000, department: 'Logistics', joinDate: new Date('2025-03-01') },
    });
    console.log('✅ Delivery created:', delivery.email);

    // Create stock employee
    const stockEmp = await User.create({
      name: 'Sahan Jayawardena',
      email: 'stock@mobilehub.com',
      password: await bcrypt.hash('stock123', salt),
      role: 'stockEmployee',
      phone: '+94775678901',
      isActive: true,
      employeeInfo: { salary: 40000, department: 'Warehouse', joinDate: new Date('2025-02-10') },
    });
    console.log('✅ Stock Employee created:', stockEmp.email);

    // Create a second manager for store2
    const manager2 = await User.create({
      name: 'Amara Weerasinghe',
      email: 'manager2@mobilehub.com',
      password: await bcrypt.hash('manager123', salt),
      role: 'manager',
      phone: '+94776789012',
      isActive: true,
      permissions: {
        employees: true,
        products: true,
        sales: true,
        suppliers: true,
        reports: true,
        inventory: true
      }
    });
    console.log('✅ Manager 2 created:', manager2.email);

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  BOOTSTRAP COMPLETE - User Accounts');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('  Admin:     admin@mobilehub.com / admin123');
    console.log('  Manager:   manager@mobilehub.com / manager123');
    console.log('  Manager 2: manager2@mobilehub.com / manager123');
    console.log('  Cashier:   cashier@mobilehub.com / cashier123');
    console.log('  Delivery:  delivery@mobilehub.com / delivery123');
    console.log('  Stock:     stock@mobilehub.com / stock123');
    console.log('');
    console.log('Now run: node seed.js');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Bootstrap failed:', error.message);
    process.exit(1);
  }
};

bootstrapUsers();
