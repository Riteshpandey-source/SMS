const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const AcademicRecord = require('./src/models/AcademicRecord');

async function checkStudentData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all students with email containing "de"
    const students = await User.find({ 
      role: 'student',
      $or: [
        { email: /de/i },
        { name: /de/i }
      ]
    });

    console.log('📋 Students matching "de":');
    students.forEach(s => {
      console.log(`- ID: ${s._id}`);
      console.log(`  Name: ${s.name}`);
      console.log(`  Email: ${s.email}`);
      console.log(`  Department: ${s.department}`);
      console.log(`  Year: ${s.academicYear}\n`);
    });

    // Check academic records for each student
    console.log('📚 Academic Records:');
    for (const student of students) {
      const records = await AcademicRecord.find({ studentId: student._id });
      console.log(`\nStudent: ${student.name} (${student._id})`);
      console.log(`Records found: ${records.length}`);
      
      records.forEach((record, index) => {
        console.log(`\n  Record ${index + 1}:`);
        console.log(`  - Academic Year: ${record.academicYear}`);
        console.log(`  - Semester: ${record.semester}`);
        console.log(`  - Marks: ${record.midTermMarks?.length || 0} subjects`);
        console.log(`  - Attendance: ${record.attendance?.length || 0} subjects`);
        console.log(`  - Debarred: ${record.isDebarred}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkStudentData();
