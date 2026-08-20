const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createAabhayGroupAttendance() {
  try {
    console.log('🚀 Creating Group Attendance with Aabhay...\n');

    // Get faculty
    const faculty = await User.findOne({ role: 'faculty' });
    if (!faculty) {
      console.log('❌ No faculty found');
      return;
    }

    // Find or create Aabhay
    let aabhay = await User.findOne({ name: /aabhay/i, role: 'student' });
    
    if (!aabhay) {
      console.log('Creating Aabhay student...');
      aabhay = new User({
        name: 'Aabhay',
        email: 'aabhay@college.edu',
        password: '$2a$10$abcdefghijklmnopqrstuv', // hashed password
        role: 'student',
        department: 'CS',
        academicYear: 3,
        isActive: true
      });
      await aabhay.save();
    }

    // Get all Year 3 CS students
    const year3Students = await User.find({
      role: 'student',
      department: 'CS',
      academicYear: 3
    });

    console.log(`✅ Found ${year3Students.length} Year 3 CS students:`);
    year3Students.forEach(s => console.log(`   - ${s.name}`));
    console.log('');

    // Subjects
    const subjects = [
      { code: 'DS101', name: 'Data Structures' },
      { code: 'SE101', name: 'Software Engineering' },
      { code: 'DM101', name: 'Database Management' },
      { code: 'OS101', name: 'Operating Systems' },
      { code: 'CN101', name: 'Computer Networks' }
    ];

    // Delete existing March 2026 sessions for Year 3
    await DailyAttendance.deleteMany({
      department: 'CS',
      academicYear: 3,
      date: { $gte: new Date('2026-03-01'), $lte: new Date('2026-03-31') }
    });
    console.log('🗑️  Cleared existing March 2026 sessions\n');

    const sessionsCreated = [];
    const today = new Date('2026-03-01'); // March 1, 2026

    // Create 5 sessions (one for each subject) with ALL students
    console.log('📝 Creating group sessions...\n');
    
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      
      // Create attendance for ALL Year 3 students in same session
      const studentAttendance = year3Students.map((student, index) => ({
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email,
        rollNumber: student.rollNumber || `CS3${String(index + 1).padStart(3, '0')}`,
        isPresent: true, // All present
        markedBy: faculty._id,
        markedAt: today,
        remarks: ''
      }));

      const session = new DailyAttendance({
        date: today,
        subjectId: `subject-${subject.code}`,
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyId: faculty._id,
        facultyName: faculty.name,
        department: 'CS',
        academicYear: 3,
        semester: 'current',
        classStartTime: '09:00',
        classEndTime: '10:00',
        studentAttendance,
        classType: 'lecture',
        location: `Room ${301 + i}`,
        status: 'submitted',
        lastModifiedBy: faculty._id,
        submittedAt: today
      });

      await session.save();
      sessionsCreated.push(session);
      
      console.log(`✅ Session ${i + 1}: ${subject.code} - ${studentAttendance.length} students`);
    }

    console.log(`\n✅ Created ${sessionsCreated.length} group sessions\n`);

    // Show sample
    const sample = sessionsCreated[0];
    console.log('📋 Sample Session:');
    console.log(`   Subject: ${sample.subjectCode} - ${sample.subjectName}`);
    console.log(`   Date: ${sample.date.toDateString()}`);
    console.log(`   Students: ${sample.studentAttendance.length}`);
    console.log(`   Student Names:`);
    sample.studentAttendance.forEach((att, idx) => {
      console.log(`      ${idx + 1}. ${att.studentName}`);
    });

    console.log('\n✅ Done! Now all Year 3 students will see each other in Department Daily Attendance!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAabhayGroupAttendance();
