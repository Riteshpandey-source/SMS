require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await User.updateOne(
    { email: 'rama@gmail.com' },
    { $set: { accessibleYears: [2, 3] } }
  );
  const user = await User.findOne({ email: 'rama@gmail.com' }).lean();
  console.log('update result', res);
  console.log('updated accessibleYears', user?.accessibleYears);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
