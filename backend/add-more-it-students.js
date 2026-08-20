const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const AcademicRecord = require('./src/models/AcademicRecord');

async function addMoreITStudents() {
  try {
    console.log('🚀 Adding More IT Students...\n');

    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('password123', 12);

    // IT student names
    const itStudents = [
      { name: 'Rahul Sharma', year: 1 },
      { name: 'Priya Patel', year: 1 },
      { name: 'Amit Kumar', year: 1 },
      { name: 'Sneha Gupta', year: 2 },
      { name: 'Vikash Singh', year: 2 },
      { name: 'Anita Yadav', year: 2 },
      { name: 'Rohit Verma', year: 3 },
      { name: 'Kavya Reddy', year: 3 },
      { name: 'Arjun Mehta', year: 3 },
      { name: 'Pooja Jain', year: 4 }
    ];

    const itSubjects = [
      { code: 'IT101', name: 'Programming Fundamentals' },
      { code: 'IT102', name: 'Web Technologies' },
      { code: 'IT103', name: 'Database Management' },
      { code: 'IT104', name: 'Computer Networks' }
    ];

    let createdCount = 0;

    for (let i = 0; i < itStudents.length; i++) {
      const studentData = itStudents[i];
      
      // Check if student already exists
      const existing = await User.findOne({ 
        email: `it.student${i + 1}@college.edu` 
      });

      if (existing) {
        console.log(`⏭️  Skipping ${studentData.name} - already exists`);
        continue;
      }

      // Create student
      const student = await User.create({
        name: studentData.name,
        email: `it.student${i + 1}@college.edu`,
        password: hashedPassword,
        role: 'student',
        department: 'IT',
        academicYear: studentData.year,
        rollNumber: `IT2024${String(i + 1).padStart(3, '0')}`
      });

      console.log(`✅ Created: ${student.name} (Year ${student.academicYear})`);

      // Create academic record with attendance
      const attendanceData = itSubjects.map(subject => {
        const totalClasses = Math.floor(Math.random() * 20) + 30; // 30-50 classes
        const attendedClasses = Math.floor(totalClasses * (0.6 + Math.random() * 0.4)); // 60-100%
        const percentage = Math.round((attendedClasses / totalClasses) * 100);
        
        return {
          subjectId: subject.code,
          subjectCode: subject.code,
          subjectName: subject.name,
          attendedClasses,
          totalClasses,
          percentage
        };
      });

      await AcademicRecord.create({
        studentId: student._id,
        department: 'IT',
        academicYear: student.academicYear,
        semester: 'current',
        attendance: attendanceData
      });

      createdCount++;
    }

    console.log(`\n✅ Created ${createdCount} new IT students`);

    // Show summary
    const totalIT = await User.countDocuments({ 
      role: 'student', 
      department: 'IT' 
    });
    
    console.log(`📊 Total IT students: ${totalIT}`);

    // Show by year
    for (let year = 1; year <= 4; year++) {
      const count = await User.countDocuments({
        role: 'student',
        department: 'IT',
        academicYear: year
      });
      console.log(`   Year ${year}: ${count} students`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addMoreITStudents();