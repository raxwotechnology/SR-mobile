const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Store = require('../models/Store');
const User = require('../models/User');

async function checkStoresAndUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  const stores = await Store.find({});
  const users = await User.find({});
  console.log('Stores:', stores.map(s => ({ id: s._id, name: s.name })));
  console.log('Users:', users.map(u => ({ id: u._id, name: u.name, role: u.role })));
  process.exit(0);
}

checkStoresAndUsers();
