const mongoose = require('mongoose');
const User = require('./src/models/User');
const DailyAttendance = require('./src/models/DailyAttendance');

async function createITDailyAttendance() {
  try {
    console.log('🚀 Creating IT Department Daily Attendance Data...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');

    // Find or create IT faculty
    let itFaculty = await User.findOne({ email: 'it.faculty@college.edu' });
    
    if (!itFaculty) {
      console.log('Creating IT faculty...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      itFaculty = await User.create({
        name: 'Prof. Rajesh IT',
        email: 'it.faculty@college.edu',
        password: hashedPassword,
        role: 'faculty',
        department: 'IT',
        accessibleYears: [1, 2, 3, 4]
      });
      console.log('✅ IT Faculty created');
    } else {
      console.log('✅ IT Faculty found:', itFaculty.name);
    }

    // Find IT students
    const itStudents = await User.find({
      role: 'student',
      department: 'IT',
      isActive: true
    }).select('name email department academicYear rollNumber');

    console.log(`📋 Found ${itStudents.length} IT students`);

    if (itStudents.length === 0) {
      console.log('⚠️ No IT students found. Creating sample IT students...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const itStudentNames = [
        'Rahul IT', 'Priya IT', 'Amit IT', 'Sneha IT',
        'Vikash IT', 'Anita IT', 'Rohit IT', 'Kavya IT'
      ];

      for (let i = 0; i < itStudentNames.length; i++) {
        await User.create({
          name: itStudentNames[i],
          email: `it.student${i + 1}@college.edu`,
          password: hashedPassword,
          role: 'student',
          department: 'IT',
          academicYear: Math.floor(i / 2) + 1, // Mix of years 1-4
          rollNumber: `IT2024${String(i + 1).padStart(3, '0')}`
        });
      }

      // Fetch newly created students
      const newStudents = await User.find({
        role: 'student',
        department: 'IT',
        isActive: true
      }).select('name email department academicYear rollNumber');

      itStudents.push(...newStudents);
      console.log(`✅ Created ${newStudents.length} IT students`);
    }

    // Delete existing IT daily attendance
    await DailyAttendance.deleteMany({ department: 'IT' });
    console.log('🧹 Cleared existing IT daily attendance');

    // IT subjects
    const itSubjects = [
      { code: 'IT101', name: 'Programming Fundamentals' },
      { code: 'IT102', name: 'Web Technologies' },
      { code: 'IT103', name: 'Database Management' },
      { code: 'IT104', name: 'Computer Networks' },
      { code: 'IT105', name: 'Software Engineering' }
    ];

    // Create daily attendance sessions for March 2026
    const sessionsToCreate = [];
    const startDate = new Date('2026-03-01');
    const endDate = new Date('2026-03-10'); // 10 days of data

    // Group students by year
    const studentsByYear = {};
    itStudents.forEach(student => {
      const year = student.academicYear;
      if (!studentsByYear[year]) {
        studentsByYear[year] = [];
      }
      studentsByYear[year].push(student);
    });

    console.log('\n📊 Students by year:');
    Object.keys(studentsByYear).forEach(year => {
      console.log(`   Year ${year}: ${studentsByYear[year].length} students`);
    });

    // Create sessions for each year
    for (const [year, students] of Object.entries(studentsByYear)) {
      if (students.length === 0) continue;

      console.log(`\n📅 Creating sessions for IT Year ${year}...`);
      
      let sessionCount = 0;
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        // Create 2-3 sessions per day
        const sessionsPerDay = Math.floor(Math.random() * 2) + 2; // 2-3 sessions
        
        for (let i = 0; i < sessionsPerDay && i < itSubjects.length; i++) {
          const subject = itSubjects[i];
          const hour = 9 + (i * 2); // 9:00, 11:00, 13:00, etc.
          
          const studentAttendance = students.map(student => ({
            studentId: student._id,
            studentName: student.name,
            studentEmail: student.email,
            rollNumber: student.rollNumber || '',
            isPresent: Math.random() > 0.2, // 80% attendance rate
            markedBy: itFaculty._id,
            markedAt: new Date(date),
            remarks: ''
          }));

          sessionsToCreate.push({
            date: new Date(date),
            subjectId: `subject-${subject.code}-year${year}`,
            subjectCode: subject.code,
            subjectName: subject.name,
            facultyId: itFaculty._id,
            facultyName: itFaculty.name,
            department: 'IT',
            academicYear: parseInt(year),
            semester: 'current',
            classStartTime: `${String(hour).padStart(2, '0')}:00`,
            classEndTime: `${String(hour + 1).padStart(2, '0')}:00`,
            studentAttendance,
            classType: 'lecture',
            location: `Room ${100 + i}`,
            status: 'submitted',
            submittedAt: new Date(date),
            submittedBy: itFaculty._id,
            lastModifiedBy: itFaculty._id
          });

          sessionCount++;
        }
      }
      
      console.log(`   ✅ Created ${sessionCount} sessions for Year ${year}`);
    }

    // Insert all sessions with error handling for duplicates
    if (sessionsToCreate.length > 0) {
      let insertedCount = 0;
      let skippedCount = 0;
      
      for (const session of sessionsToCreate) {
        try {
          await DailyAttendance.create(session);
          insertedCount++;
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error - skip this session
            skippedCount++;
          } else {
            throw error;
          }
        }
      }
      
      console.log(`\n✅ Inserted ${insertedCount} new sessions`);
      if (skippedCount > 0) {
        console.log(`⏭️  Skipped ${skippedCount} duplicate sessions`);
      }
    }

    // Verify data
    const verifyCount = await DailyAttendance.countDocuments({ department: 'IT' });
    console.log(`\n📊 Verification: ${verifyCount} IT daily attendance sessions in database`);

    // Show sample data
    const sampleSessions = await DailyAttendance.find({ department: 'IT' })
      .limit(3)
      .sort({ date: -1 });

    console.log('\n📋 Sample Sessions:');
    sampleSessions.forEach((session, index) => {
      console.log(`\n${index + 1}. ${session.subjectCode} - ${session.subjectName}`);
      console.log(`   Date: ${session.date.toISOString().split('T')[0]}`);
      console.log(`   Time: ${session.classStartTime} - ${session.classEndTime}`);
      console.log(`   Year: ${session.academicYear}`);
      console.log(`   Students: ${session.studentAttendance.length}`);
      console.log(`   Present: ${session.presentCount}`);
      console.log(`   Status: ${session.status}`);
    });

    console.log('\n🎉 IT Daily Attendance Data Created Successfully!');
    console.log('\n🔑 Test with:');
    console.log('   Department: IT');
    console.log('   Year: 1, 2, 3, or 4');
    console.log('   Date Range: March 1-10, 2026');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

createITDailyAttendance();