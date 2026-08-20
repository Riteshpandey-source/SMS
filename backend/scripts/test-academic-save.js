const mongoose = require('mongoose');
const path = require('path');
const AcademicRecord = require('../src/models/AcademicRecord');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testAcademicSave() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a test student (any student)
    const student = await User.findOne({ 
      role: 'student'
    });

    if (!student) {
      console.log('❌ No student found in database');
      return;
    }

    console.log('\n📝 Test Student:', {
      id: student._id,
      name: student.name,
      email: student.email,
      department: student.department,
      academicYear: student.academicYear
    });

    // Check existing academic record
    let academicRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    console.log('\n📊 Existing Academic Record:', academicRecord ? 'Found' : 'Not Found');

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

    // Test 1: Add mid-term marks
    console.log('\n🧪 Test 1: Adding mid-term marks...');
    const testMarks = [
      {
        subjectCode: 'ECE201',
        subjectName: 'Digital Electronics',
        subjectId: 'ECE201',
        maxMarks: 100,
        obtainedMarks: 85,
        grade: 'A',
        examDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        subjectCode: 'ECE202',
        subjectName: 'Signals and Systems',
        subjectId: 'ECE202',
        maxMarks: 100,
        obtainedMarks: 78,
        grade: 'B+',
        examDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    academicRecord.midTermMarks = testMarks;
    await academicRecord.save();
    console.log('✅ Mid-term marks saved successfully');

    // Test 2: Add attendance
    console.log('\n🧪 Test 2: Adding attendance...');
    await academicRecord.updateAttendance('ECE201', 45, 50, 'ECE201', 'Digital Electronics');
    await academicRecord.updateAttendance('ECE202', 40, 50, 'ECE202', 'Signals and Systems');
    console.log('✅ Attendance saved successfully');

    // Verify saved data
    const savedRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    console.log('\n✅ Verification - Saved Academic Record:');
    console.log('  Mid-term Marks:', savedRecord.midTermMarks.length, 'subjects');
    savedRecord.midTermMarks.forEach(mark => {
      console.log(`    - ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks} (${mark.grade})`);
    });
    
    console.log('  Attendance:', savedRecord.attendance.length, 'subjects');
    savedRecord.attendance.forEach(att => {
      console.log(`    - ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
    });
    
    console.log('  Overall Attendance:', savedRecord.overallAttendance + '%');
    console.log('  Is Debarred:', savedRecord.isDebarred);

    console.log('\n✅ All tests passed! Data is being saved correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

testAcademicSave();
