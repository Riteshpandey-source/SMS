require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const DailyAttendance = require('../src/models/DailyAttendance');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const studentId = '69b2f4efd8ba5d65f884a917';
  const studentEmail = 'riteshpandey7443@gmail.com';
  const subject = 'PL';
  const docs = await DailyAttendance.aggregate([
    { $match: { subjectCode: subject.toUpperCase() } },
    { $unwind: '$studentAttendance' },
    {
      $match: {
        $or: [
          { 'studentAttendance.studentId': new mongoose.Types.ObjectId(studentId) },
          { 'studentAttendance.studentEmail': studentEmail }
        ]
      }
    },
    {
      $project: {
        date: 1,
        classStartTime: 1,
        isPresent: '$studentAttendance.isPresent',
        status: 1
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
