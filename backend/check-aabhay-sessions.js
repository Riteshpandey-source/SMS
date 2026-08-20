const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkAabhaySessions() {
  try {
    console.log('🔍 Checking Aabhay Sessions...\n');

    // Find sessions with Aabhay
    const sessions = await DailyAttendance.find({
      'studentAttendance.studentName': /aabhay/i
    }).sort({ date: -1 });

    console.log(`📊 Total Sessions with Aabhay: ${sessions.length}\n`);

    if (sessions.length > 0) {
      sessions.slice(0, 5).forEach((session, idx) => {
        console.log(`Session ${idx + 1}:`);
        console.log(`   Date: ${session.date.toDateString()}`);
        console.log(`   Subject: ${session.subjectCode} - ${session.subjectName}`);
        console.log(`   Department: ${session.department}, Year: ${session.academicYear}`);
        console.log(`   Total Students: ${session.studentAttendance.length}`);
        console.log(`   Students:`);
        session.studentAttendance.forEach(att => {
          console.log(`      - ${att.studentName} (${att.isPresent ? 'Present' : 'Absent'})`);
        });
        console.log('');
      });

      // Check if Aabhay is alone
      const hasMultipleStudents = sessions.some(s => s.studentAttendance.length > 1);
      
      if (!hasMultipleStudents) {
        console.log('⚠️  ISSUE FOUND: Aabhay is ALONE in all sessions!');
        console.log('💡 Faculty needs to add OTHER students to the same sessions\n');
        
        // Find other Year 3 CS students
        const year3Students = await User.find({
          role: 'student',
          department: 'CS',
          academicYear: 3
        }).select('name email');
        
        console.log('👥 Other Year 3 CS Students who should be added:');
        year3Students.forEach((s, idx) => {
          console.log(`   ${idx + 1}. ${s.name} (${s.email})`);
        });
      }
    } else {
      console.log('❌ No sessions found with Aabhay');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAabhaySessions();
