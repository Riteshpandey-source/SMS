require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const DailyAttendance = require('../src/models/DailyAttendance');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'riteshpandey7443@gmail.com';
  const subject = 'PL';
  const docs = await DailyAttendance.aggregate([
    { $match: { subjectCode: subject.toUpperCase() } },
    { $unwind: '$studentAttendance' },
    { $match: { 'studentAttendance.studentEmail': email } },
    {
      $project: {
        date: 1,
        classStartTime: 1,
        isPresent: '$studentAttendance.isPresent',
        subjectCode: 1
      }
    },
    { $sort: { date: 1, classStartTime: 1 } }
  ]);
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
