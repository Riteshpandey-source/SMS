const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createRohitPoojaAttendance() {
  try {
    console.log('🚀 Creating Attendance for Rohit and Pooja...\n');

    // Get faculty
    const faculty = await User.findOne({ role: 'faculty' });
    if (!faculty) {
      console.log('❌ No faculty found');
      return;
    }

    // Get Rohit (Year 3) and Pooja (Year 4)
    const rohit = await User.findOne({ name: /rohit/i, role: 'student' });
    const pooja = await User.findOne({ name: /pooja/i, role: 'student' });

    if (!rohit) {
      console.log('❌ Rohit not found');
      return;
    }

    if (!pooja) {
      console.log('❌ Pooja not found');
      return;
    }

    console.log(`✅ Found Rohit: ${rohit.name} (Year ${rohit.academicYear})`);
    console.log(`✅ Found Pooja: ${pooja.name} (Year ${pooja.academicYear})`);
    console.log(`✅ Faculty: ${faculty.name}\n`);

    // Subjects for Year 3
    const year3Subjects = [
      { code: 'CS301', name: 'Operating Systems' },
      { code: 'CS302', name: 'Computer Networks' },
      { code: 'CS303', name: 'Software Engineering' }
    ];

    // Subjects for Year 4
    const year4Subjects = [
      { code: 'CS401', name: 'Machine Learning' },
      { code: 'CS402', name: 'Cloud Computing' },
      { code: 'CS403', name: 'Artificial Intelligence' }
    ];

    const today = new Date();
    const sessionsCreated = [];

    // Create attendance for Rohit (Year 3) - last 5 days
    console.log('📝 Creating attendance for Rohit (Year 3)...');
    for (let i = 0; i < 5; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - i);

      for (let j = 0; j < 2; j++) {
        const subject = year3Subjects[j % year3Subjects.length];
        
        const session = new DailyAttendance({
          date: sessionDate,
          subjectId: `subject-${subject.code}`,
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: faculty._id,
          facultyName: faculty.name,
          department: rohit.department,
          academicYear: rohit.academicYear,
          semester: 'current',
          classStartTime: j === 0 ? '09:00' : '11:00',
          classEndTime: j === 0 ? '10:00' : '12:00',
          studentAttendance: [{
            studentId: rohit._id,
            studentName: rohit.name,
            studentEmail: rohit.email,
            rollNumber: rohit.rollNumber || 'CS3001',
            isPresent: Math.random() > 0.3, // 70% attendance
            markedBy: faculty._id,
            markedAt: sessionDate,
            remarks: ''
          }],
          classType: 'lecture',
          location: `Room ${301 + j}`,
          status: 'submitted',
          lastModifiedBy: faculty._id,
          submittedAt: sessionDate
        });

        await session.save();
        sessionsCreated.push(session);
      }
    }
    console.log(`✅ Created ${sessionsCreated.length} sessions for Rohit\n`);

    // Create attendance for Pooja (Year 4) - last 5 days
    console.log('📝 Creating attendance for Pooja (Year 4)...');
    const poojaSessionsStart = sessionsCreated.length;
    
    for (let i = 0; i < 5; i++) {
      const sessionDate = new Date(today);
      sessionDate.setDate(today.getDate() - i);

      for (let j = 0; j < 2; j++) {
        const subject = year4Subjects[j % year4Subjects.length];
        
        const session = new DailyAttendance({
          date: sessionDate,
          subjectId: `subject-${subject.code}`,
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: faculty._id,
          facultyName: faculty.name,
          department: pooja.department,
          academicYear: pooja.academicYear,
          semester: 'current',
          classStartTime: j === 0 ? '14:00' : '16:00',
          classEndTime: j === 0 ? '15:00' : '17:00',
          studentAttendance: [{
            studentId: pooja._id,
            studentName: pooja.name,
            studentEmail: pooja.email,
            rollNumber: pooja.rollNumber || 'CS4001',
            isPresent: Math.random() > 0.2, // 80% attendance
            markedBy: faculty._id,
            markedAt: sessionDate,
            remarks: ''
          }],
          classType: 'lecture',
          location: `Room ${401 + j}`,
          status: 'submitted',
          lastModifiedBy: faculty._id,
          submittedAt: sessionDate
        });

        await session.save();
        sessionsCreated.push(session);
      }
    }
    console.log(`✅ Created ${sessionsCreated.length - poojaSessionsStart} sessions for Pooja\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total Sessions Created: ${sessionsCreated.length}`);
    console.log(`   Rohit Sessions: ${poojaSessionsStart}`);
    console.log(`   Pooja Sessions: ${sessionsCreated.length - poojaSessionsStart}`);
    
    // Show sample sessions
    console.log('\n📋 Sample Sessions:\n');
    
    const rohitSample = sessionsCreated.find(s => s.academicYear === 3);
    if (rohitSample) {
      console.log('Rohit (Year 3):');
      console.log(`   Date: ${rohitSample.date.toDateString()}`);
      console.log(`   Subject: ${rohitSample.subjectCode} - ${rohitSample.subjectName}`);
      console.log(`   Time: ${rohitSample.classStartTime} - ${rohitSample.classEndTime}`);
      console.log(`   Status: ${rohitSample.studentAttendance[0].isPresent ? '✅ Present' : '❌ Absent'}`);
    }
    
    const poojaSample = sessionsCreated.find(s => s.academicYear === 4);
    if (poojaSample) {
      console.log('\nPooja (Year 4):');
      console.log(`   Date: ${poojaSample.date.toDateString()}`);
      console.log(`   Subject: ${poojaSample.subjectCode} - ${poojaSample.subjectName}`);
      console.log(`   Time: ${poojaSample.classStartTime} - ${poojaSample.classEndTime}`);
      console.log(`   Status: ${poojaSample.studentAttendance[0].isPresent ? '✅ Present' : '❌ Absent'}`);
    }

    console.log('\n✅ Attendance data created successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

createRohitPoojaAttendance();
