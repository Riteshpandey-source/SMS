const mongoose = require('mongoose');
const path = require('path');
const AcademicRecord = require('../src/models/AcademicRecord');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkRituShaData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find student "Sha"
    const studentSha = await User.findOne({ 
      $or: [
        { name: /sha/i },
        { email: /sha/i }
      ],
      role: 'student'
    });

    if (!studentSha) {
      console.log('❌ Student "Sha" not found in database');
      console.log('\n📋 Available students:');
      const allStudents = await User.find({ role: 'student' }).limit(10);
      allStudents.forEach(s => {
        console.log(`   - ${s.name} (${s.email}) - ID: ${s._id}`);
      });
      return;
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 STUDENT "SHA" INFORMATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Name:', studentSha.name);
    console.log('Email:', studentSha.email);
    console.log('Department:', studentSha.department);
    console.log('Academic Year:', studentSha.academicYear);
    console.log('Student ID:', studentSha._id.toString());

    // Find academic records for student "Sha"
    const academicRecords = await AcademicRecord.find({ 
      studentId: studentSha._id 
    }).sort({ updatedAt: -1 });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ACADEMIC RECORDS IN DATABASE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Total Records:', academicRecords.length);

    if (academicRecords.length === 0) {
      console.log('\n❌ NO ACADEMIC RECORDS FOUND!');
      console.log('   Faculty "Ritu" ne data save nahi kiya hai.');
      console.log('   Ya student ID mismatch hai.');
      return;
    }

    // Show latest record
    const latestRecord = academicRecords[0];
    console.log('\n📚 Latest Academic Record:');
    console.log('   Academic Year:', latestRecord.academicYear);
    console.log('   Semester:', latestRecord.semester);
    console.log('   Last Updated:', latestRecord.updatedAt);

    // Check Marks
    console.log('\n📊 MID-TERM MARKS:');
    if (latestRecord.midTermMarks && latestRecord.midTermMarks.length > 0) {
      console.log(`   ✅ Found ${latestRecord.midTermMarks.length} subjects with marks:`);
      latestRecord.midTermMarks.forEach(mark => {
        console.log(`      ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks} (${mark.grade})`);
      });
    } else {
      console.log('   ❌ No marks data found');
    }

    // Check Attendance
    console.log('\n📅 ATTENDANCE:');
    if (latestRecord.attendance && latestRecord.attendance.length > 0) {
      console.log(`   ✅ Found ${latestRecord.attendance.length} subjects with attendance:`);
      latestRecord.attendance.forEach(att => {
        const status = att.percentage >= 75 ? '✅' : '⚠️';
        console.log(`      ${status} ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
      });
      console.log(`   Overall Attendance: ${latestRecord.overallAttendance}%`);
    } else {
      console.log('   ❌ No attendance data found');
    }

    // Check Debarment
    console.log('\n⚠️  DEBARMENT STATUS:');
    console.log('   Is Debarred:', latestRecord.isDebarred ? 'YES' : 'NO');
    if (latestRecord.debarredSubjects && latestRecord.debarredSubjects.length > 0) {
      console.log('   Debarred Subjects:', latestRecord.debarredSubjects.join(', '));
    }

    // Simulate API Response
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔍 WHAT STUDENT "SHA" SHOULD SEE');
    console.log('═══════════════════════════════════════════════════════');

    console.log('\nAPI Endpoint: GET /api/academic/midterm/' + studentSha._id);
    console.log('Response:');
    console.log(JSON.stringify({
      success: true,
      data: {
        midTermMarks: latestRecord.midTermMarks,
        total: latestRecord.midTermMarks.length
      }
    }, null, 2));

    console.log('\nAPI Endpoint: GET /api/academic/attendance/' + studentSha._id);
    console.log('Response:');
    console.log(JSON.stringify({
      success: true,
      data: {
        attendance: latestRecord.attendance,
        overallAttendance: latestRecord.overallAttendance
      }
    }, null, 2));

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Student "Sha" ID:', studentSha._id.toString());
    console.log('Marks Subjects:', latestRecord.midTermMarks.length);
    console.log('Attendance Subjects:', latestRecord.attendance.length);
    console.log('Data Last Updated:', latestRecord.updatedAt);

    if (latestRecord.midTermMarks.length > 0 || latestRecord.attendance.length > 0) {
      console.log('\n✅ DATA EXISTS IN DATABASE!');
      console.log('   If student "Sha" cannot see this data:');
      console.log('   1. Clear browser cache: localStorage.clear()');
      console.log('   2. Hard refresh: Ctrl+Shift+R');
      console.log('   3. Check student ID matches in API calls');
      console.log('   4. Check browser console for errors');
    } else {
      console.log('\n❌ NO DATA IN DATABASE!');
      console.log('   Faculty "Ritu" needs to:');
      console.log('   1. Enter marks/attendance data');
      console.log('   2. Click "Save Changes" button');
      console.log('   3. Verify success message appears');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkRituShaData();
