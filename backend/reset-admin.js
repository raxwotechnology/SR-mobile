const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createOrResetAdmin(name, email, password) {
  let user = await User.findOne({ email });
  if (!user) {
    console.log(`Admin user ${email} not found. Creating it...`);
    user = new User({
      name,
      email,
      password,
      role: 'admin',
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
      }
    });
    await user.save();
    console.log(`Admin user successfully created with password: ${password}`);
  } else {
    console.log(`Admin user ${email} found. Resetting password...`);
    user.password = password;
    user.role = 'admin'; // Ensure role is admin
    user.isActive = true;
    user.permissions = {
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
    };
    await user.save();
    console.log(`Admin password successfully reset to: ${password}`);
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    await createOrResetAdmin('Talk N Fix Admin', 'admin@mobilehub.com', 'admin123');
    await createOrResetAdmin('Talk N Fix Admin 2', 'admin2@mobilehub.com', 'admin456');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
