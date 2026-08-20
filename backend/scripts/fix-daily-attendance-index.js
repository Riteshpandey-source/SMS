const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const DailyAttendance = require('../src/models/DailyAttendance');

const OLD_INDEX_NAME = 'date_1_subjectId_1_classStartTime_1';
const NEW_INDEX_DEF = {
  date: 1,
  subjectId: 1,
  classStartTime: 1,
  facultyId: 1
};
const NEW_INDEX_OPTS = { unique: true, name: 'date_subject_time_faculty_unique' };

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not set');
  }

  await mongoose.connect(uri);
  const indexes = await DailyAttendance.collection.indexes();

  const hasOld = indexes.some((idx) => idx.name === OLD_INDEX_NAME);
  if (hasOld) {
    console.log(`Dropping old unique index: ${OLD_INDEX_NAME}`);
    await DailyAttendance.collection.dropIndex(OLD_INDEX_NAME);
  } else {
    console.log('Old index not found; nothing to drop.');
  }

  console.log('Ensuring new unique index with facultyId...');
  await DailyAttendance.collection.createIndex(NEW_INDEX_DEF, NEW_INDEX_OPTS);
  console.log('Done.');
}

run()
  .catch((err) => {
    console.error('Index fix failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
