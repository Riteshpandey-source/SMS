const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkMarch1Sessions() {
  try {
    console.log('🔍 Checking March 1, 2026 Sessions...\n');

    const march1Sessions = await DailyAttendance.find({
      date: new Date('2026-03-01'),
      department: 'CS',
      academicYear: 3
    }).sort({ classStartTime: 1 });

    console.log(`Found ${march1Sessions.length} sessions on March 1, 2026\n`);

    march1Sessions.forEach((session, idx) => {
      console.log(`Session ${idx + 1}:`);
      console.log(`   ID: ${session._id}`);
      console.log(`   Subject: ${session.subjectCode} - ${session.subjectName}`);
      console.log(`   Time: ${session.classStartTime} - ${session.classEndTime}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Students: ${session.studentAttendance?.length || 0}`);
      
      if (session.studentAttendance && session.studentAttendance.length > 0) {
        session.studentAttendance.forEach((att, attIdx) => {
          console.log(`      ${attIdx + 1}. ${att.studentName} - ${att.isPresent ? 'Present' : 'Absent'}`);
        });
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkMarch1Sessions();
