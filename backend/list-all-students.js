const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function listAllStudents() {
  try {
    const students = await User.find({ role: 'student' })
      .select('name email department academicYear')
      .sort({ department: 1, academicYear: 1, name: 1 });
    
    console.log('\n👥 All Students in Database:\n');
    students.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.name} (${s.department} Year ${s.academicYear}) - ${s.email}`);
    });
    console.log(`\nTotal: ${students.length} students`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

listAllStudents();
