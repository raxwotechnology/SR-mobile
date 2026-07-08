const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    let user = await User.findOne({ email: 'admin@mobilehub.com' });
    if (!user) {
      console.log('Admin user admin@mobilehub.com not found. Creating it...');
      user = new User({
        name: 'Talk N Fix Admin',
        email: 'admin@mobilehub.com',
        password: 'admin123',
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
      console.log('Admin user successfully created with password: admin123');
    } else {
      console.log('Admin user admin@mobilehub.com found. Resetting password...');
      user.password = 'admin123';
      await user.save();
      console.log('Admin password successfully reset to: admin123');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
