const mongoose = require('mongoose');
require('dotenv').config();

async function createTestAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./src/models/User');
    const StudentFacultyAssignment = require('./src/models/StudentFacultyAssignment');
    
    // Find test users
    const csStudent = await User.findOne({ email: 'testcs@test.com' });
    const eceStudent = await User.findOne({ email: 'testece@test.com' });
    const csFaculty = await User.findOne({ role: 'faculty', department: 'CS' });
    const eceFaculty = await User.findOne({ role: 'faculty', department: 'ECE' });
    
    console.log('Found users:');
    console.log('CS Student:', csStudent ? csStudent.name : 'Not found');
    console.log('ECE Student:', eceStudent ? eceStudent.name : 'Not found');
    console.log('CS Faculty:', csFaculty ? csFaculty.name : 'Not found');
    console.log('ECE Faculty:', eceFaculty ? eceFaculty.name : 'Not found');
    
    // Create CS assignment
    if (csStudent && csFaculty) {
      const csAssignment = new StudentFacultyAssignment({
        student: csStudent._id,
        faculty: csFaculty._id,
        academicYear: 1,
        department: 'CS',
        isActive: true,
        assignmentSource: 'manual'
      });
      await csAssignment.save();
      console.log('CS Assignment created');
    }
    
    // Create ECE assignment
    if (eceStudent && eceFaculty) {
      const eceAssignment = new StudentFacultyAssignment({
        student: eceStudent._id,
        faculty: eceFaculty._id,
        academicYear: 1,
        department: 'ECE',
        isActive: true,
        assignmentSource: 'manual'
      });
      await eceAssignment.save();
      console.log('ECE Assignment created');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestAssignments();