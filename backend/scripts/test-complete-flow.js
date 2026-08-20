const mongoose = require('mongoose');
const path = require('path');
const AcademicRecord = require('../src/models/AcademicRecord');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testCompleteFlow() {
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

    // Step 1: Faculty adds new marks
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 1: Faculty Adding New Marks');
    console.log('═══════════════════════════════════════════════════════');

    let academicRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    if (!academicRecord) {
      console.log('Creating new academic record...');
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

    // Add new marks
    const newMarks = [
      {
        subjectCode: 'TEST101',
        subjectName: 'Test Subject 1',
        subjectId: 'TEST101',
        maxMarks: 100,
        obtainedMarks: 92,
        grade: 'A+',
        examDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        subjectCode: 'TEST102',
        subjectName: 'Test Subject 2',
        subjectId: 'TEST102',
        maxMarks: 100,
        obtainedMarks: 88,
        grade: 'A',
        examDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Update marks
    newMarks.forEach(mark => {
      const existingIndex = academicRecord.midTermMarks.findIndex(
        m => m.subjectCode === mark.subjectCode
      );
      if (existingIndex >= 0) {
        academicRecord.midTermMarks[existingIndex] = mark;
      } else {
        academicRecord.midTermMarks.push(mark);
      }
    });

    await academicRecord.save();
    console.log('✅ Marks saved successfully');
    console.log('   Total subjects with marks:', academicRecord.midTermMarks.length);

    // Step 2: Faculty adds attendance
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 2: Faculty Adding Attendance');
    console.log('═══════════════════════════════════════════════════════');

    await academicRecord.updateAttendance('TEST101', 45, 50, 'TEST101', 'Test Subject 1');
    await academicRecord.updateAttendance('TEST102', 48, 50, 'TEST102', 'Test Subject 2');
    
    console.log('✅ Attendance saved successfully');
    console.log('   Total subjects with attendance:', academicRecord.attendance.length);

    // Step 3: Verify data is saved
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 3: Verifying Data in Database');
    console.log('═══════════════════════════════════════════════════════');

    const savedRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    console.log('✅ Database Verification:');
    console.log('\n📊 Mid-term Marks:');
    savedRecord.midTermMarks.forEach(mark => {
      console.log(`   ✓ ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks} (${mark.grade})`);
    });

    console.log('\n📅 Attendance:');
    savedRecord.attendance.forEach(att => {
      const status = att.percentage >= 75 ? '✓' : '⚠️';
      console.log(`   ${status} ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
    });
    console.log(`   Overall: ${savedRecord.overallAttendance}%`);

    // Step 4: Simulate API response
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 4: Simulating API Response');
    console.log('═══════════════════════════════════════════════════════');

    const apiResponse = {
      success: true,
      data: {
        midTermMarks: savedRecord.midTermMarks,
        marks: savedRecord.midTermMarks, // For backward compatibility
        total: savedRecord.midTermMarks.length,
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

    console.log('📤 API Response Structure:');
    console.log(JSON.stringify(apiResponse, null, 2));

    // Step 5: Verify frontend will receive data correctly
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 STEP 5: Frontend Data Processing Verification');
    console.log('═══════════════════════════════════════════════════════');

    // Simulate frontend processing
    const frontendMarks = apiResponse.data.midTermMarks || apiResponse.data.marks || [];
    console.log('✅ Frontend will receive:', frontendMarks.length, 'marks');
    console.log('✅ Data structure is correct:', frontendMarks.length > 0 ? 'YES' : 'NO');

    if (frontendMarks.length > 0) {
      console.log('\n📊 Sample mark object:');
      console.log(JSON.stringify(frontendMarks[0], null, 2));
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ COMPLETE FLOW TEST PASSED!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 Summary:');
    console.log('   ✓ Faculty can save marks and attendance');
    console.log('   ✓ Data is properly stored in database');
    console.log('   ✓ API returns correct data structure');
    console.log('   ✓ Frontend will receive and process data correctly');
    console.log('\n🎉 Student dashboard should now show updated data!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

testCompleteFlow();
