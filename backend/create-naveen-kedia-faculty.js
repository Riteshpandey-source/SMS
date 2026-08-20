const mongoose = require('mongoose');
const User = require('./src/models/User');
const DailyAttendance = require('./src/models/DailyAttendance');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createNaveenKediaFaculty() {
  try {
    console.log('🚀 Creating Naveen Kedia Faculty Account...\n');

    // Check if Naveen already exists
    let naveen = await User.findOne({ email: 'naveen.kedia@college.edu' });
    
    if (naveen) {
      console.log('✅ Naveen Kedia already exists');
    } else {
      // Create Naveen Kedia faculty
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      naveen = new User({
        name: 'Naveen Kedia',
        email: 'naveen.kedia@college.edu',
        password: hashedPassword,
        role: 'faculty',
        department: 'CS',
        isActive: true,
        accessibleYears: [1, 2, 3, 4] // Can access all years
      });
      
      await naveen.save();
      console.log('✅ Created Naveen Kedia faculty account');
    }

    console.log(`   Name: ${naveen.name}`);
    console.log(`   Email: ${naveen.email}`);
    console.log(`   Role: ${naveen.role}`);
    console.log(`   Department: ${naveen.department}`);
    console.log(`   ID: ${naveen._id}\n`);

    // Get Year 3 CS students (including those who haven't logged in)
    const year3Students = await User.find({
      role: 'student',
      department: 'CS',
      academicYear: 3
    });

    console.log(`👥 Year 3 CS Students (${year3Students.length}):`);
    year3Students.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.name} (${s.email})`);
    });
    console.log('');

    // Create sample daily attendance sessions
    const subjects = [
      { code: 'DS101', name: 'Data Structures' },
      { code: 'SE101', name: 'Software Engineering' },
      { code: 'DM101', name: 'Database Management' },
      { code: 'OS101', name: 'Operating Systems' },
      { code: 'CN101', name: 'Computer Networks' }
    ];

    // Delete existing sessions by Naveen
    await DailyAttendance.deleteMany({ facultyId: naveen._id });
    console.log('🗑️  Cleared existing sessions by Naveen\n');

    const today = new Date();
    const sessionsCreated = [];

    console.log('📝 Creating daily attendance sessions by Naveen Kedia...\n');

    // Create 5 sessions with ALL Year 3 students
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      
      // Add ALL students to the session (including those who never logged in)
      const studentAttendance = year3Students.map((student, index) => ({
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email,
        rollNumber: student.rollNumber || `CS3${String(index + 1).padStart(3, '0')}`,
        isPresent: Math.random() > 0.3, // 70% attendance rate
        markedBy: naveen._id,
        markedAt: today,
        remarks: ''
      }));

      const session = new DailyAttendance({
        date: today,
        subjectId: `subject-${subject.code}`,
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyId: naveen._id,
        facultyName: naveen.name,
        department: 'CS',
        academicYear: 3,
        semester: 'current',
        classStartTime: '09:00',
        classEndTime: '10:00',
        studentAttendance,
        classType: 'lecture',
        location: `Room ${301 + i}`,
        status: 'submitted', // IMPORTANT: Mark as submitted
        lastModifiedBy: naveen._id,
        submittedAt: today
      });

      await session.save();
      sessionsCreated.push(session);
      
      console.log(`✅ Session ${i + 1}: ${subject.code}`);
      console.log(`   Students: ${studentAttendance.length}`);
      console.log(`   Present: ${studentAttendance.filter(a => a.isPresent).length}`);
      console.log(`   Absent: ${studentAttendance.filter(a => !a.isPresent).length}`);
    }

    console.log(`\n✅ Created ${sessionsCreated.length} sessions by Naveen Kedia\n`);

    // Show sample session
    const sample = sessionsCreated[0];
    console.log('📋 Sample Session:');
    console.log(`   Faculty: ${sample.facultyName}`);
    console.log(`   Subject: ${sample.subjectCode} - ${sample.subjectName}`);
    console.log(`   Date: ${sample.date.toDateString()}`);
    console.log(`   Status: ${sample.status}`);
    console.log(`   Students in Session:`);
    sample.studentAttendance.forEach((att, idx) => {
      console.log(`      ${idx + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
    });

    console.log('\n✅ Done!');
    console.log('\n💡 Now ANY Year 3 student can see ALL students\' attendance');
    console.log('   (including students who never logged in)');
    console.log('\n📝 Login Credentials for Naveen Kedia:');
    console.log('   Email: naveen.kedia@college.edu');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createNaveenKediaFaculty();
