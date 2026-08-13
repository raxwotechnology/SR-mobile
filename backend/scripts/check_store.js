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
  const storeCol = db.collection('stores');
  const stores = await storeCol.find({}).toArray();
  console.log("=== Stores in Database ===");
  stores.forEach(s => {
    console.log(JSON.stringify(s, null, 2));
  });
  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
