const mongoose = require('mongoose');
const path = require('path');
const AcademicRecord = require('../src/models/AcademicRecord');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testAttendanceFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a test student
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('❌ No student found');
      return;
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 STUDENT INFORMATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Name:', student.name);
    console.log('Email:', student.email);
    console.log('Department:', student.department);
    console.log('Academic Year:', student.academicYear);
    console.log('Student ID:', student._id.toString());

    // Get or create academic record
    let academicRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    if (!academicRecord) {
      console.log('\n🆕 Creating new academic record...');
      academicRecord = new AcademicRecord({
        studentId: student._id,
        academicYear: student.academicYear,
        semester: 'current',
        department: student.department,
        attendance: [],
        midTermMarks: [],
        overallAttendance: 0,
        isDebarred: false,
        debarredSubjects: []
      });
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 1: Faculty Updates Attendance');
    console.log('═══════════════════════════════════════════════════════');

    // Simulate faculty updating attendance
    const testAttendance = [
      { subjectId: 'CS101', subjectCode: 'CS101', subjectName: 'Programming', attended: 45, total: 50 },
      { subjectId: 'CS102', subjectCode: 'CS102', subjectName: 'Data Structures', attended: 40, total: 50 },
      { subjectId: 'MATH101', subjectCode: 'MATH101', subjectName: 'Mathematics', attended: 38, total: 50 }
    ];

    console.log('Faculty entering attendance:');
    for (const att of testAttendance) {
      await academicRecord.updateAttendance(
        att.subjectId,
        att.attended,
        att.total,
        att.subjectCode,
        att.subjectName
      );
      const percentage = Math.round((att.attended / att.total) * 100);
      console.log(`   ✓ ${att.subjectCode}: ${att.attended}/${att.total} (${percentage}%)`);
    }

    console.log('\n✅ Faculty saved attendance to database');

    // Verify in database
    const savedRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 2: Verify Database Storage');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Database has', savedRecord.attendance.length, 'attendance records:');
    savedRecord.attendance.forEach(att => {
      console.log(`   ✓ ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
    });
    console.log('Overall Attendance:', savedRecord.overallAttendance + '%');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 3: Simulate Student API Call');
    console.log('═══════════════════════════════════════════════════════');

    // Simulate what student dashboard API call would return
    const studentApiResponse = {
      success: true,
      data: {
        attendance: savedRecord.attendance,
        summary: savedRecord.attendanceSummary,
        overallAttendance: savedRecord.overallAttendance,
        isDebarred: savedRecord.isDebarred,
        debarredSubjects: savedRecord.debarredSubjects,
        student: {
          _id: student._id,
          name: student.name,
          email: student.email
        },
        academicYear: savedRecord.academicYear,
        semester: savedRecord.semester
      },
      timestamp: new Date().toISOString()
    };

    console.log('Student API Response:');
    console.log(JSON.stringify(studentApiResponse, null, 2));

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 4: Verify Data Match');
    console.log('═══════════════════════════════════════════════════════');

    let allMatch = true;
    testAttendance.forEach((expected, index) => {
      const actual = savedRecord.attendance.find(a => a.subjectCode === expected.subjectCode);
      if (actual) {
        const match = actual.attendedClasses === expected.attended && 
                     actual.totalClasses === expected.total;
        console.log(`${match ? '✅' : '❌'} ${expected.subjectCode}:`);
        console.log(`   Faculty entered: ${expected.attended}/${expected.total}`);
        console.log(`   Database has: ${actual.attendedClasses}/${actual.totalClasses}`);
        console.log(`   Student will see: ${actual.attendedClasses}/${actual.totalClasses}`);
        if (!match) allMatch = false;
      } else {
        console.log(`❌ ${expected.subjectCode}: NOT FOUND in database!`);
        allMatch = false;
      }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    if (allMatch) {
      console.log('✅ SUCCESS: All attendance data matches!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('\n🎉 Faculty attendance = Student attendance ✅');
      console.log('\nWhat Faculty sees:');
      testAttendance.forEach(att => {
        const pct = Math.round((att.attended / att.total) * 100);
        console.log(`   ${att.subjectCode}: ${att.attended}/${att.total} (${pct}%)`);
      });
      console.log('\nWhat Student sees:');
      savedRecord.attendance.forEach(att => {
        console.log(`   ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
      });
    } else {
      console.log('❌ FAILURE: Data mismatch detected!');
      console.log('═══════════════════════════════════════════════════════');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

testAttendanceFlow();
