const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const AcademicRecord = require('../src/models/AcademicRecord');

async function createTestData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find ridam student
    const student = await User.findOne({ name: /ridam/i });
    const faculty = await User.findOne({ name: /yash/i, role: 'faculty' });
    
    if (!student) {
      console.log('❌ Student "ridam" not found!');
      await mongoose.connection.close();
      return;
    }

    if (!faculty) {
      console.log('❌ Faculty "yash" not found!');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ Creating test academic data for:');
    console.log(`   Student: ${student.name} (${student._id})`);
    console.log(`   Faculty: ${faculty.name} (${faculty._id})\n`);

    // Create Mid-Term Marks
    const marksRecord = new AcademicRecord({
      studentId: student._id,
      student: student._id,
      faculty: faculty._id,
      department: student.department,
      academicYear: 3,
      semester: 'Fall 2024',
      type: 'midterm',
      data: {
        marks: [
          { subjectCode: 'CS301', subjectName: 'Data Structures', obtainedMarks: 85, maxMarks: 100 },
          { subjectCode: 'CS302', subjectName: 'Algorithms', obtainedMarks: 90, maxMarks: 100 },
          { subjectCode: 'CS303', subjectName: 'Database Systems', obtainedMarks: 78, maxMarks: 100 }
        ]
      }
    });
    await marksRecord.save();
    console.log('✅ Mid-term marks created');

    // Create Attendance
    const attendanceRecord = new AcademicRecord({
      studentId: student._id,
      student: student._id,
      faculty: faculty._id,
      department: student.department,
      academicYear: 3,
      semester: 'Fall 2024',
      type: 'attendance',
      data: {
        attendance: [
          { subject: 'CS301', present: 28, total: 30, percentage: 93.33 },
          { subject: 'CS302', present: 25, total: 30, percentage: 83.33 },
          { subject: 'CS303', present: 27, total: 30, percentage: 90.00 }
        ]
      }
    });
    await attendanceRecord.save();
    console.log('✅ Attendance created');

    // Create Debarment
    const debarmentRecord = new AcademicRecord({
      studentId: student._id,
      student: student._id,
      faculty: faculty._id,
      department: student.department,
      academicYear: 3,
      semester: 'Fall 2024',
      type: 'debarment',
      data: {
        isDebarred: false,
        debarredSubjects: [],
        manualDebarments: {}
      }
    });
    await debarmentRecord.save();
    console.log('✅ Debarment record created');

    console.log('\n✅ All test data created successfully!');
    console.log('\nNow refresh the student dashboard to see the data.');

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestData();
