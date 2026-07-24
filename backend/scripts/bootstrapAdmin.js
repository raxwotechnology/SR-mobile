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

    const usersToCreate = [
      {
        name: 'Mobile Hub Admin',
        email: 'admin@mobilehub.com',
        password: 'admin123',
        role: 'admin',
        phone: '+94771234567',
        isSuperAdmin: true,
        isActive: true,
        permissions: {
          inventory: true,
          finance: true,
          products: true,
          sales: true,
          reports: true,
          employees: true,
          suppliers: true,
          customers: true,
          rewards: true,
          vouchers: true,
          settings: true,
        },
      },
      {
        name: 'Nisha Perera',
        email: 'manager@mobilehub.com',
        password: 'manager123',
        role: 'manager',
        phone: '+94772345678',
        isActive: true,
        permissions: {
          employees: true,
          products: true,
          sales: true,
          suppliers: true,
          reports: true,
          inventory: true,
        },
      },
      {
        name: 'Amara Weerasinghe',
        email: 'manager2@mobilehub.com',
        password: 'manager123',
        role: 'manager',
        phone: '+94776789012',
        isActive: true,
        permissions: {
          employees: true,
          products: true,
          sales: true,
          suppliers: true,
          reports: true,
          inventory: true,
        },
      },
      {
        name: 'Dilshan Fernando',
        email: 'cashier@mobilehub.com',
        password: 'cashier123',
        role: 'cashier',
        phone: '+94773456789',
        isActive: true,
        employeeInfo: { salary: 45000, department: 'Sales', joinDate: new Date('2025-01-15') },
      },
      {
        name: 'Kamal Silva',
        email: 'delivery@mobilehub.com',
        password: 'delivery123',
        role: 'deliveryGuy',
        phone: '+94774567890',
        isActive: true,
        employeeInfo: { salary: 35000, department: 'Logistics', joinDate: new Date('2025-03-01') },
      },
      {
        name: 'Sahan Jayawardena',
        email: 'stock@mobilehub.com',
        password: 'stock123',
        role: 'stockEmployee',
        phone: '+94775678901',
        isActive: true,
        employeeInfo: { salary: 40000, department: 'Warehouse', joinDate: new Date('2025-02-10') },
      },
    ];

    for (const userData of usersToCreate) {
      let user = await User.findOne({ email: userData.email });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      if (user) {
        user.name = userData.name;
        user.password = hashedPassword;
        user.role = userData.role;
        user.phone = userData.phone;
        user.isActive = true;
        if (userData.isSuperAdmin !== undefined) user.isSuperAdmin = userData.isSuperAdmin;
        if (userData.permissions) user.permissions = userData.permissions;
        if (userData.employeeInfo) user.employeeInfo = userData.employeeInfo;
        await user.save();
        console.log(`✅ Updated account: ${userData.email} (${userData.role})`);
      } else {
        user = await User.create({
          ...userData,
          password: hashedPassword,
        });
        console.log(`✅ Created account: ${userData.email} (${userData.role})`);
      }
    }

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

    process.exit(0);
  } catch (error) {
    console.error('Bootstrap failed:', error.message);
    process.exit(1);
  }
};

bootstrapUsers();
