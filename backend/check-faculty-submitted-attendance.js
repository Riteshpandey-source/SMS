const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkFacultySubmittedAttendance() {
  try {
    console.log('🔍 Checking Faculty Submitted Attendance...\n');

    // Get all attendance records sorted by most recent
    const allRecords = await DailyAttendance.find({})
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`📊 Total Attendance Records: ${allRecords.length}\n`);

    // Find records with students whose names contain 'rit', 'ro', or 'po'
    console.log('🔍 Looking for students with names: rit, ro, po\n');

    const matchingRecords = allRecords.filter(record => {
      return record.studentAttendance?.some(att => {
        const name = att.studentName?.toLowerCase() || '';
        return name.includes('rit') || name.includes('ro') || name.includes('po');
      });
    });

    console.log(`✅ Found ${matchingRecords.length} records with matching students\n`);

    if (matchingRecords.length === 0) {
      console.log('❌ No records found with students named rit, ro, or po');
      console.log('\n💡 This means faculty submitted attendance is not saved in database');
      console.log('💡 Possible reasons:');
      console.log('   1. Attendance was not submitted (still in draft)');
      console.log('   2. API call failed during submission');
      console.log('   3. Student names in database are different\n');
      
      // Show all unique student names in database
      console.log('👥 All Students in Database:');
      const allStudents = await User.find({ role: 'student' })
        .select('name email department academicYear')
        .sort({ name: 1 });
      
      allStudents.forEach((student, idx) => {
        console.log(`   ${idx + 1}. ${student.name} (${student.department} Year ${student.academicYear})`);
      });
      
      return;
    }

    // Show matching records
    console.log('📋 Matching Attendance Records:\n');
    
    matchingRecords.forEach((record, idx) => {
      console.log(`${idx + 1}. Session ID: ${record._id}`);
      console.log(`   Date: ${record.date.toDateString()}`);
      console.log(`   Subject: ${record.subjectCode} - ${record.subjectName}`);
      console.log(`   Department: ${record.department}, Year: ${record.academicYear}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Created: ${record.createdAt?.toLocaleString() || 'N/A'}`);
      console.log(`   Students:`);
      
      record.studentAttendance?.forEach((att, attIdx) => {
        const name = att.studentName?.toLowerCase() || '';
        if (name.includes('rit') || name.includes('ro') || name.includes('po')) {
          console.log(`      ${attIdx + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
        }
      });
      console.log('');
    });

    // Check if these are the most recent records
    const mostRecent = allRecords[0];
    console.log('📅 Most Recent Attendance Record:');
    console.log(`   Date: ${mostRecent.date.toDateString()}`);
    console.log(`   Subject: ${mostRecent.subjectCode}`);
    console.log(`   Created: ${mostRecent.createdAt?.toLocaleString() || 'N/A'}`);
    console.log(`   Students: ${mostRecent.studentAttendance?.map(a => a.studentName).join(', ')}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkFacultySubmittedAttendance();
