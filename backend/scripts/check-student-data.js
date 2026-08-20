const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const AcademicRecord = require('../src/models/AcademicRecord');

async function checkStudentData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find ridam student
    const student = await User.findOne({ name: /ridam/i });
    
    if (!student) {
      console.log('❌ Student "ridam" not found!');
      await mongoose.connection.close();
      return;
    }

    console.log('✅ Student found:');
    console.log(`   Name: ${student.name}`);
    console.log(`   ID: ${student._id}`);
    console.log(`   Department: ${student.department}`);
    console.log(`   Academic Year: ${student.academicYear}\n`);

    // Check Academic Records
    console.log('📊 Checking Academic Records...');
    const records = await AcademicRecord.find({ studentId: student._id })
      .populate('faculty', 'name')
      .sort({ createdAt: -1 });
    
    console.log(`   Total records: ${records.length}`);
    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`\n   ${index + 1}. Record:`);
        console.log(`      Faculty: ${record.faculty?.name || 'Unknown'}`);
        console.log(`      Academic Year: ${record.academicYear}`);
        console.log(`      Semester: ${record.semester}`);
        console.log(`      Type: ${record.type}`);
        console.log(`      Data: ${JSON.stringify(record.data, null, 2)}`);
        console.log(`      Created: ${record.createdAt.toLocaleString()}`);
      });
    } else {
      console.log('   ❌ No academic records found!');
    }

    await mongoose.connection.close();
    console.log('\n\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentData();
