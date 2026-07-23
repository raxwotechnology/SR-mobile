const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createSuperAdmin() {
  const email = process.argv[2] || 'superadmin@mobilehub.com';
  const password = process.argv[3] || 'SuperAdmin@1234';
  const name = process.argv[4] || 'SR Mobile Super Admin';

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB database.');

    let user = await User.findOne({ email });
    const allPermissions = {
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

    if (user) {
      user.name = name;
      user.password = password; // pre-save hook hashes password
      user.role = 'admin';
      user.isSuperAdmin = true;
      user.isActive = true;
      user.permissions = allPermissions;
      await user.save();
      console.log(`SUCCESS: Super Admin account (${email}) updated with full permissions!`);
    } else {
      user = new User({
        name,
        email,
        password,
        role: 'admin',
        isSuperAdmin: true,
        isActive: true,
        permissions: allPermissions,
      });
      await user.save();
      console.log(`SUCCESS: New Super Admin created! Email: ${email} | Password: ${password}`);
    }
  } catch (error) {
    console.error('Error creating super admin:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createSuperAdmin();
