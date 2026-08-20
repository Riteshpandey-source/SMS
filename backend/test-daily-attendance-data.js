const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testDailyAttendanceData() {
  try {
    console.log('🔍 Testing Daily Attendance Data...\n');

    // Check if there are any daily attendance records
    const totalRecords = await DailyAttendance.countDocuments();
    console.log(`📊 Total Daily Attendance Records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('❌ No daily attendance records found in database');
      console.log('💡 This is why the student view is not working');
      console.log('📝 Faculty needs to create daily attendance sessions first');
      
      // Check if there are any users
      const totalUsers = await User.countDocuments();
      const students = await User.countDocuments({ role: 'student' });
      const faculty = await User.countDocuments({ role: 'faculty' });
      
      console.log(`\n👥 Users in database:`);
      console.log(`   Total: ${totalUsers}`);
      console.log(`   Students: ${students}`);
      console.log(`   Faculty: ${faculty}`);
      
      if (students > 0) {
        const sampleStudent = await User.findOne({ role: 'student' }).select('name department academicYear');
        console.log(`\n👨‍🎓 Sample Student:`, sampleStudent);
      }
      
      return;
    }

    // Show sample records
    const sampleRecords = await DailyAttendance.find()
      .limit(3)
      .populate('facultyId', 'name')
      .select('date subjectCode subjectName department academicYear studentAttendance status');
    
    console.log(`\n📋 Sample Daily Attendance Records:`);
    sampleRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ID: ${record._id}`);
      console.log(`   Date: ${record.date}`);
      console.log(`   Subject: ${record.subjectCode} - ${record.subjectName}`);
      console.log(`   Department: ${record.department}`);
      console.log(`   Academic Year: ${record.academicYear}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Students in attendance: ${record.studentAttendance?.length || 0}`);
      
      if (record.studentAttendance && record.studentAttendance.length > 0) {
        console.log(`   Sample student attendance:`, {
          studentId: record.studentAttendance[0].studentId,
          isPresent: record.studentAttendance[0].isPresent
        });
      }
    });

    // Test the getStudentAttendance method
    const sampleStudent = await User.findOne({ role: 'student' });
    if (sampleStudent) {
      console.log(`\n🧪 Testing getStudentAttendance for student: ${sampleStudent.name}`);
      
      const studentAttendance = await DailyAttendance.getStudentAttendance(sampleStudent._id, {
        department: sampleStudent.department
      });
      
      console.log(`   Found ${studentAttendance.length} attendance records for this student`);
      
      if (studentAttendance.length > 0) {
        console.log(`   Sample record:`, {
          date: studentAttendance[0].date,
          subject: studentAttendance[0].subjectCode,
          status: studentAttendance[0].status
        });
      }
    }

  } catch (error) {
    console.error('❌ Error testing daily attendance data:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDailyAttendanceData();