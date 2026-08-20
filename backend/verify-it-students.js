const mongoose = require('mongoose');
const User = require('./src/models/User');

async function verifyITStudents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB\n');

    const itStudents = await User.find({
      role: 'student',
      department: 'IT',
      isActive: true
    }).select('name email department academicYear rollNumber').sort({ academicYear: 1, name: 1 });

    console.log(`📊 Total IT Students: ${itStudents.length}\n`);

    // Group by year
    const byYear = {};
    itStudents.forEach(student => {
      const year = student.academicYear;
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(student);
    });

    Object.keys(byYear).sort().forEach(year => {
      console.log(`\n📚 Year ${year} (${byYear[year].length} students):`);
      byYear[year].forEach(student => {
        console.log(`   - ${student.name} (${student.email})`);
      });
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyITStudents();
