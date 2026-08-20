const mongoose = require('mongoose');
const path = require('path');
const AcademicRecord = require('../src/models/AcademicRecord');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyDataFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a test student
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('❌ No student found');
      return;
    }

    console.log('📝 Student:', student.name, `(${student.email})`);
    console.log('   Department:', student.department);
    console.log('   Academic Year:', student.academicYear);
    console.log('   Student ID:', student._id.toString());

    // Check academic records
    const records = await AcademicRecord.find({ studentId: student._id })
      .sort({ academicYear: -1, updatedAt: -1 });

    console.log('\n📊 Academic Records Found:', records.length);

    if (records.length === 0) {
      console.log('\n⚠️  No academic records found for this student');
      console.log('   This means faculty has not entered any data yet');
      return;
    }

    // Show latest record
    const latestRecord = records[0];
    console.log('\n📚 Latest Academic Record:');
    console.log('   Academic Year:', latestRecord.academicYear);
    console.log('   Semester:', latestRecord.semester);
    console.log('   Last Updated:', latestRecord.updatedAt);

    // Mid-term marks
    console.log('\n📊 Mid-term Marks:', latestRecord.midTermMarks.length, 'subjects');
    if (latestRecord.midTermMarks.length > 0) {
      latestRecord.midTermMarks.forEach(mark => {
        console.log(`   ✓ ${mark.subjectCode} (${mark.subjectName}): ${mark.obtainedMarks}/${mark.maxMarks} - Grade: ${mark.grade}`);
      });
    } else {
      console.log('   ⚠️  No marks entered yet');
    }

    // Attendance
    console.log('\n📅 Attendance:', latestRecord.attendance.length, 'subjects');
    if (latestRecord.attendance.length > 0) {
      latestRecord.attendance.forEach(att => {
        const status = att.percentage >= 75 ? '✓' : '⚠️';
        console.log(`   ${status} ${att.subjectCode} (${att.subjectName}): ${att.attendedClasses}/${att.totalClasses} - ${att.percentage}%`);
      });
      console.log(`   Overall Attendance: ${latestRecord.overallAttendance}%`);
    } else {
      console.log('   ⚠️  No attendance entered yet');
    }

    // Debarment
    console.log('\n⚠️  Debarment Status:');
    console.log('   Is Debarred:', latestRecord.isDebarred ? 'YES' : 'NO');
    if (latestRecord.debarredSubjects && latestRecord.debarredSubjects.length > 0) {
      console.log('   Debarred Subjects:', latestRecord.debarredSubjects.join(', '));
    }

    // Test API query format
    console.log('\n🔍 API Query Test:');
    console.log('   GET /api/academic/midterm/' + student._id);
    console.log('   GET /api/academic/attendance/' + student._id);
    console.log('   GET /api/academic/debarment/' + student._id);

    // Simulate what API would return
    console.log('\n📤 Expected API Response for Mid-term Marks:');
    console.log(JSON.stringify({
      success: true,
      data: {
        midTermMarks: latestRecord.midTermMarks,
        total: latestRecord.midTermMarks.length,
        academicYear: latestRecord.academicYear,
        semester: latestRecord.semester
      }
    }, null, 2));

    console.log('\n✅ Data flow verification complete!');
    console.log('\n💡 If student dashboard is not showing data:');
    console.log('   1. Check if frontend is calling correct API endpoints');
    console.log('   2. Check if student ID matches in API calls');
    console.log('   3. Check browser console for API errors');
    console.log('   4. Verify authentication token is valid');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

verifyDataFlow();
