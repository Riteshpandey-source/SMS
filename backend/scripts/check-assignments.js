const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const StudentFacultyAssignment = require('../src/models/StudentFacultyAssignment');

async function checkAssignments() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find ridam
    const student = await User.findOne({ name: /ridam/i });
    
    if (!student) {
      console.log('\n❌ User "ridam" not found!');
      await mongoose.connection.close();
      return;
    }

    console.log(`\n✅ Checking assignments for: ${student.name}`);
    console.log(`   Department: ${student.department}`);
    console.log(`   Academic Year: ${student.academicYear}`);
    console.log(`   Student ID: ${student._id}\n`);

    // Find assignments
    const assignments = await StudentFacultyAssignment.find({
      student: student._id
    }).populate('faculty', 'name email department');

    console.log(`📊 Total assignments: ${assignments.length}\n`);

    if (assignments.length === 0) {
      console.log('❌ No faculty assigned to this student!');
      console.log('\n💡 This might be why events are not showing.');
      console.log('   The assignment middleware might be filtering out all events.');
    } else {
      console.log('✅ Assigned faculty:\n');
      assignments.forEach((assignment, index) => {
        console.log(`${index + 1}. ${assignment.faculty.name}`);
        console.log(`   - Email: ${assignment.faculty.email}`);
        console.log(`   - Department: ${assignment.faculty.department}`);
        console.log(`   - Active: ${assignment.isActive}`);
        console.log(`   - Assigned on: ${assignment.assignedAt.toLocaleDateString()}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAssignments();
