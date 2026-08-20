const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkAbhayAttendance() {
  try {
    console.log('🔍 Checking Abhay\'s Attendance Data...\n');

    // Find Abhay
    const abhay = await User.findOne({ 
      name: /abhay/i, 
      role: 'student' 
    });

    if (!abhay) {
      console.log('❌ Abhay not found in database\n');
      
      const allStudents = await User.find({ role: 'student' }).select('name email department academicYear');
      console.log('👥 All Students:');
      allStudents.forEach((s, idx) => {
        console.log(`   ${idx + 1}. ${s.name} (${s.department} Year ${s.academicYear})`);
      });
      return;
    }

    console.log(`✅ Found: ${abhay.name}`);
    console.log(`   Email: ${abhay.email}`);
    console.log(`   Department: ${abhay.department}`);
    console.log(`   Year: ${abhay.academicYear}\n`);

    // Get Abhay's attendance sessions
    const abhaySessions = await DailyAttendance.find({
      'studentAttendance.studentId': abhay._id
    }).sort({ date: -1 }).limit(10);

    console.log(`📊 Sessions where Abhay appears: ${abhaySessions.length}\n`);

    if (abhaySessions.length === 0) {
      console.log('❌ No attendance sessions found for Abhay\n');
      return;
    }

    // Check each session
    abhaySessions.forEach((session, idx) => {
      console.log(`Session ${idx + 1}:`);
      console.log(`   Date: ${session.date.toDateString()}`);
      console.log(`   Subject: ${session.subjectCode} - ${session.subjectName}`);
      console.log(`   Department: ${session.department}, Year: ${session.academicYear}`);
      console.log(`   Total Students in Session: ${session.studentAttendance?.length || 0}`);
      
      if (session.studentAttendance && session.studentAttendance.length > 0) {
        console.log(`   Students:`);
        session.studentAttendance.forEach((att, attIdx) => {
          const isAbhay = att.studentId.toString() === abhay._id.toString();
          console.log(`      ${attIdx + 1}. ${att.studentName} ${isAbhay ? '👈 (Abhay)' : ''} - ${att.isPresent ? '✅' : '❌'}`);
        });
      }
      console.log('');
    });

    // Check if there are other students in same department/year
    const sameYearStudents = await User.find({
      role: 'student',
      department: abhay.department,
      academicYear: abhay.academicYear,
      _id: { $ne: abhay._id }
    }).select('name');

    console.log(`\n👥 Other students in ${abhay.department} Year ${abhay.academicYear}:`);
    if (sameYearStudents.length > 0) {
      sameYearStudents.forEach((s, idx) => {
        console.log(`   ${idx + 1}. ${s.name}`);
      });
    } else {
      console.log('   ❌ No other students found in same department/year');
      console.log('   💡 This is why only Abhay shows - he\'s alone in his year!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAbhayAttendance();
