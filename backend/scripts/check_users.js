const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  const atlasUri = process.env.MONGO_URI;
  await mongoose.connect(atlasUri);
};

const run = async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const userCol = db.collection('users');
  const users = await userCol.find({}).toArray();
  console.log("=== Users in Database ===");
  users.forEach(u => {
    console.log(`ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, AssignedStore: ${u.assignedStore}`);
  });
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
