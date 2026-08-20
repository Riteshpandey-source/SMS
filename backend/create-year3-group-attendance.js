const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createYear3GroupAttendance() {
  try {
    console.log('🚀 Creating Group Attendance for Year 3 Students...\n');

    // Get faculty
    const faculty = await User.findOne({ role: 'faculty' });
    if (!faculty) {
      console.log('❌ No faculty found');
      return;
    }

    // Get all Year 3 CS students
    const year3Students = await User.find({ 
      role: 'student', 
      department: 'CS',
      academicYear: 3 
    });

    if (year3Students.length === 0) {
      console.log('❌ No Year 3 students found');
      return;
    }

    console.log(`✅ Found ${year3Students.length} Year 3 CS students:`);
    year3Students.forEach(s => console.log(`   - ${s.name}`));
    console.log(`✅ Faculty: ${faculty.name}\n`);

    // Subjects for Year 3
    const subjects = [
      { code: 'CS301', name: 'Operating Systems' },
      { code: 'CS302', name: 'Computer Networks' },
      { code: 'CS303', name: 'Software Engineering' },
      { code: 'CS304', name: 'Database Management' },
      { code: 'CS305', name: 'Web Technologies' }
    ];

    // Delete existing Year 3 attendance
    await DailyAttendance.deleteMany({ 
      department: 'CS', 
      academicYear: 3 
    });
    console.log('🗑️  Cleared existing Year 3 attendance records\n');

    const today = new Date();
    const sessionsCreated = [];

    // Create group sessions for last 7 days
    console.log('📝 Creating group attendance sessions...\n');
    
    for (let i = 0; i < 7; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - i);

      // Create 2 sessions per day
      for (let j = 0; j < 2; j++) {
        const subject = subjects[j % subjects.length];
        
        // Create attendance for ALL Year 3 students in same session
        const studentAttendance = year3Students.map((student, index) => ({
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          rollNumber: student.rollNumber || `CS3${String(index + 1).padStart(3, '0')}`,
          isPresent: Math.random() > 0.25, // 75% attendance rate
          markedBy: faculty._id,
          markedAt: sessionDate,
          remarks: ''
        }));

        const session = new DailyAttendance({
          date: sessionDate,
          subjectId: `subject-${subject.code}`,
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: faculty._id,
          facultyName: faculty.name,
          department: 'CS',
          academicYear: 3,
          semester: 'current',
          classStartTime: j === 0 ? '09:00' : '11:00',
          classEndTime: j === 0 ? '10:00' : '12:00',
          studentAttendance,
          classType: 'lecture',
          location: `Room ${301 + j}`,
          status: 'submitted',
          lastModifiedBy: faculty._id,
          submittedAt: sessionDate
        });

        await session.save();
        sessionsCreated.push(session);
        
        console.log(`✅ Session ${sessionsCreated.length}: ${sessionDate.toDateString()} - ${subject.code}`);
        console.log(`   Students: ${studentAttendance.length}, Present: ${studentAttendance.filter(a => a.isPresent).length}`);
      }
    }

    console.log(`\n✅ Created ${sessionsCreated.length} group attendance sessions\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total Sessions: ${sessionsCreated.length}`);
    console.log(`   Students per Session: ${year3Students.length}`);
    console.log(`   Date Range: ${sessionsCreated[sessionsCreated.length - 1].date.toDateString()} to ${sessionsCreated[0].date.toDateString()}`);
    console.log(`   Subjects: ${subjects.map(s => s.code).join(', ')}`);
    
    // Show sample session
    const sampleSession = sessionsCreated[0];
    console.log(`\n📋 Sample Session:`);
    console.log(`   Date: ${sampleSession.date.toDateString()}`);
    console.log(`   Subject: ${sampleSession.subjectCode} - ${sampleSession.subjectName}`);
    console.log(`   Time: ${sampleSession.classStartTime} - ${sampleSession.classEndTime}`);
    console.log(`   Location: ${sampleSession.location}`);
    console.log(`   Total Students: ${sampleSession.totalStudents}`);
    console.log(`   Present: ${sampleSession.presentCount}`);
    console.log(`   Absent: ${sampleSession.absentCount}`);
    console.log(`   Attendance %: ${sampleSession.attendancePercentage}%`);
    
    console.log(`\n   Student Attendance:`);
    sampleSession.studentAttendance.forEach((att, index) => {
      console.log(`      ${index + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
    });

    console.log('\n✅ Year 3 group attendance created successfully!');
    console.log('\n💡 Now all Year 3 students will see each other\'s attendance in the same sessions!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createYear3GroupAttendance();
