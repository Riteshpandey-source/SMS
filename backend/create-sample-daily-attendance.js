const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createSampleDailyAttendance() {
  try {
    console.log('🚀 Creating Sample Daily Attendance Data...\n');

    // Get faculty and students
    const faculty = await User.findOne({ role: 'faculty' });
    if (!faculty) {
      console.log('❌ No faculty found. Please create faculty first.');
      return;
    }

    const students = await User.find({ 
      role: 'student', 
      department: 'CS',
      academicYear: 1 
    }).limit(10);

    if (students.length === 0) {
      console.log('❌ No students found. Please create students first.');
      return;
    }

    console.log(`✅ Found ${students.length} students in CS department, Year 1`);
    console.log(`✅ Faculty: ${faculty.name}\n`);

    // Clear existing daily attendance
    await DailyAttendance.deleteMany({});
    console.log('🗑️  Cleared existing daily attendance records\n');

    // Create sample sessions for last 7 days
    const subjects = [
      { code: 'CS101', name: 'Data Structures' },
      { code: 'CS102', name: 'Algorithms' },
      { code: 'CS103', name: 'Database Systems' },
      { code: 'MATH101', name: 'Mathematics' }
    ];

    const sessions = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - i);

      // Create 2 sessions per day (different subjects)
      for (let j = 0; j < 2; j++) {
        const subject = subjects[j % subjects.length];
        
        // Create student attendance records
        const studentAttendance = students.map((student, index) => ({
          studentId: student._id,
          studentName: student.name,
          studentEmail: student.email,
          rollNumber: student.rollNumber || `CS1${String(index + 1).padStart(3, '0')}`,
          isPresent: Math.random() > 0.2, // 80% attendance rate
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
          academicYear: 1,
          semester: 'current',
          classStartTime: j === 0 ? '09:00' : '11:00',
          classEndTime: j === 0 ? '10:00' : '12:00',
          studentAttendance,
          classType: 'lecture',
          location: `Room ${101 + j}`,
          status: 'submitted',
          lastModifiedBy: faculty._id,
          submittedAt: sessionDate
        });

        await session.save();
        sessions.push(session);
      }
    }

    console.log(`✅ Created ${sessions.length} daily attendance sessions\n`);

    // Show summary
    console.log('📊 Summary:');
    console.log(`   Total Sessions: ${sessions.length}`);
    console.log(`   Date Range: ${sessions[sessions.length - 1].date.toDateString()} to ${sessions[0].date.toDateString()}`);
    console.log(`   Students per Session: ${students.length}`);
    console.log(`   Subjects: ${subjects.map(s => s.code).join(', ')}`);
    
    // Show sample session
    const sampleSession = sessions[0];
    console.log(`\n📋 Sample Session:`);
    console.log(`   Date: ${sampleSession.date.toDateString()}`);
    console.log(`   Subject: ${sampleSession.subjectCode} - ${sampleSession.subjectName}`);
    console.log(`   Time: ${sampleSession.classStartTime} - ${sampleSession.classEndTime}`);
    console.log(`   Location: ${sampleSession.location}`);
    console.log(`   Total Students: ${sampleSession.totalStudents}`);
    console.log(`   Present: ${sampleSession.presentCount}`);
    console.log(`   Absent: ${sampleSession.absentCount}`);
    console.log(`   Attendance %: ${sampleSession.attendancePercentage}%`);
    
    // Show student attendance details
    console.log(`\n👥 Student Attendance in Sample Session:`);
    sampleSession.studentAttendance.slice(0, 5).forEach((att, index) => {
      console.log(`   ${index + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
    });
    if (sampleSession.studentAttendance.length > 5) {
      console.log(`   ... and ${sampleSession.studentAttendance.length - 5} more students`);
    }

    console.log('\n✅ Sample daily attendance data created successfully!');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleDailyAttendance();
