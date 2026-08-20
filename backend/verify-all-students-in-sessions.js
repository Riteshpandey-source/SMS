const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function verifyAllStudentsInSessions() {
  try {
    console.log('🔍 Verifying All Students in Attendance Sessions...\n');

    // Get Year 3 CS students
    const year3Students = await User.find({ 
      role: 'student', 
      department: 'CS',
      academicYear: 3 
    }).select('name email');

    console.log(`👥 Year 3 CS Students in Database (${year3Students.length}):`);
    year3Students.forEach((s, idx) => {
      console.log(`   ${idx + 1}. ${s.name} (${s.email})`);
    });

    // Get Year 3 attendance sessions
    const year3Sessions = await DailyAttendance.find({
      department: 'CS',
      academicYear: 3
    }).sort({ date: -1 }).limit(5);

    console.log(`\n📋 Recent Year 3 Attendance Sessions (${year3Sessions.length}):\n`);

    year3Sessions.forEach((session, idx) => {
      console.log(`${idx + 1}. ${session.date.toDateString()} - ${session.subjectCode}`);
      console.log(`   Total Students in Session: ${session.studentAttendance?.length || 0}`);
      console.log(`   Students:`);
      
      session.studentAttendance?.forEach((att, attIdx) => {
        console.log(`      ${attIdx + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
      });
      console.log('');
    });

    // Check if all database students are in sessions
    console.log('🔍 Verification:\n');
    
    const studentsInSessions = new Set();
    year3Sessions.forEach(session => {
      session.studentAttendance?.forEach(att => {
        studentsInSessions.add(att.studentName);
      });
    });

    console.log(`Students in Database: ${year3Students.length}`);
    console.log(`Unique Students in Sessions: ${studentsInSessions.size}`);
    console.log(`Students in Sessions: ${Array.from(studentsInSessions).join(', ')}`);

    // Check for missing students
    const missingStudents = year3Students.filter(dbStudent => 
      !Array.from(studentsInSessions).some(sessionStudent => 
        sessionStudent.includes(dbStudent.name.split(' ')[0])
      )
    );

    if (missingStudents.length > 0) {
      console.log(`\n⚠️  Missing Students (in DB but not in sessions):`);
      missingStudents.forEach(s => console.log(`   - ${s.name}`));
    } else {
      console.log(`\n✅ All database students are present in attendance sessions!`);
    }

    // Test API response format
    console.log('\n📊 Testing API Response Format:\n');
    const sampleSession = year3Sessions[0];
    if (sampleSession) {
      console.log('Sample Session Data Structure:');
      console.log(`   _id: ${sampleSession._id}`);
      console.log(`   date: ${sampleSession.date}`);
      console.log(`   subjectCode: ${sampleSession.subjectCode}`);
      console.log(`   subjectName: ${sampleSession.subjectName}`);
      console.log(`   department: ${sampleSession.department}`);
      console.log(`   academicYear: ${sampleSession.academicYear}`);
      console.log(`   studentAttendance: Array(${sampleSession.studentAttendance?.length || 0})`);
      
      if (sampleSession.studentAttendance && sampleSession.studentAttendance.length > 0) {
        console.log(`\n   Sample Student Record:`);
        const sampleStudent = sampleSession.studentAttendance[0];
        console.log(`      studentId: ${sampleStudent.studentId}`);
        console.log(`      studentName: ${sampleStudent.studentName}`);
        console.log(`      studentEmail: ${sampleStudent.studentEmail}`);
        console.log(`      isPresent: ${sampleStudent.isPresent}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyAllStudentsInSessions();
