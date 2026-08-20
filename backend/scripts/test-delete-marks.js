const mongoose = require('mongoose');
const path = require('path');
const AcademicRecord = require('../src/models/AcademicRecord');
const User = require('../src/models/User');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testDeleteMarks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find a test student
    const student = await User.findOne({ role: 'student' });
    if (!student) {
      console.log('❌ No student found');
      return;
    }

    console.log('📝 Student:', student.name);
    console.log('   ID:', student._id.toString());

    // Get academic record
    let academicRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    if (!academicRecord) {
      console.log('❌ No academic record found');
      return;
    }

    console.log('\n📊 Current Marks:', academicRecord.midTermMarks.length, 'subjects');
    academicRecord.midTermMarks.forEach(mark => {
      console.log(`   - ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks}`);
    });

    // Test 1: Delete one subject
    console.log('\n🧪 Test 1: Deleting one subject (TEST101)');
    const updatedMarks = academicRecord.midTermMarks.filter(mark => 
      mark.subjectCode !== 'TEST101'
    );
    
    console.log('   Updated marks count:', updatedMarks.length);
    
    // Replace entire array
    academicRecord.midTermMarks = updatedMarks.map(mark => ({
      subjectCode: mark.subjectCode,
      subjectName: mark.subjectName,
      subjectId: mark.subjectId || mark.subjectCode,
      maxMarks: mark.maxMarks,
      obtainedMarks: mark.obtainedMarks,
      grade: mark.grade,
      examDate: mark.examDate,
      createdAt: mark.createdAt || new Date(),
      updatedAt: new Date()
    }));

    await academicRecord.save();
    console.log('✅ Saved successfully');

    // Verify
    const verifyRecord = await AcademicRecord.findOne({
      studentId: student._id,
      academicYear: student.academicYear
    });

    console.log('\n✅ Verification - After Delete:');
    console.log('   Marks count:', verifyRecord.midTermMarks.length);
    verifyRecord.midTermMarks.forEach(mark => {
      console.log(`   - ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks}`);
    });

    // Check if TEST101 is gone
    const test101Exists = verifyRecord.midTermMarks.some(mark => mark.subjectCode === 'TEST101');
    console.log('\n   TEST101 exists:', test101Exists ? '❌ STILL EXISTS (FAILED)' : '✅ DELETED (SUCCESS)');

    if (!test101Exists) {
      console.log('\n🎉 Delete test PASSED!');
    } else {
      console.log('\n❌ Delete test FAILED!');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

testDeleteMarks();
