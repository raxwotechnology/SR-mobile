require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await User.updateMany(
    { role: 'manager' },
    {
      $set: {
        'permissions.employees': true,
        'permissions.products': true,
        'permissions.sales': true,
        'permissions.suppliers': true,
        'permissions.reports': true,
        'permissions.inventory': true
      }
    }
  );
  console.log('Manager permissions updated!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
