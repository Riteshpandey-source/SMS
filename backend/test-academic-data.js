const mongoose = require('mongoose');
const AcademicRecord = require('./src/models/AcademicRecord');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testAcademicData() {
  try {
    console.log('🔍 Testing Academic Data (Regular Attendance)...\n');

    // Check users first
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const faculty = await User.countDocuments({ role: 'faculty' });
    
    console.log(`👥 Users in database:`);
    console.log(`   Total: ${totalUsers}`);
    console.log(`   Students: ${students}`);
    console.log(`   Faculty: ${faculty}`);

    if (totalUsers === 0) {
      console.log('\n❌ No users found in database');
      console.log('💡 Need to create users first');
      return;
    }

    // Check academic records
    const totalRecords = await AcademicRecord.countDocuments();
    console.log(`\n📊 Total Academic Records: ${totalRecords}`);

    if (totalRecords === 0) {
      console.log('❌ No academic records found in database');
      console.log('💡 This is why regular attendance is not working');
      console.log('📝 Need to create academic records with attendance data');
      
      // Show sample students
      const sampleStudents = await User.find({ role: 'student' })
        .limit(3)
        .select('name department academicYear email');
      
      console.log(`\n👨‍🎓 Sample Students:`);
      sampleStudents.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} - ${student.department} - Year ${student.academicYear}`);
      });
      
      return;
    }

    // Show sample academic records
    const sampleRecords = await AcademicRecord.find()
      .limit(3)
      .populate('studentId', 'name department academicYear')
      .select('studentId attendance midTermMarks academicYear semester');
    
    console.log(`\n📋 Sample Academic Records:`);
    sampleRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Student: ${record.studentId?.name}`);
      console.log(`   Department: ${record.studentId?.department}`);
      console.log(`   Academic Year: ${record.academicYear}`);
      console.log(`   Semester: ${record.semester}`);
      console.log(`   Attendance Records: ${record.attendance?.length || 0}`);
      console.log(`   Mid-term Marks: ${record.midTermMarks?.length || 0}`);
      
      if (record.attendance && record.attendance.length > 0) {
        console.log(`   Sample Attendance:`, {
          subject: record.attendance[0].subjectCode,
          attended: record.attendance[0].attendedClasses,
          total: record.attendance[0].totalClasses,
          percentage: record.attendance[0].percentage
        });
      }
    });

    // Test department attendance API
    const sampleStudent = await User.findOne({ role: 'student' });
    if (sampleStudent) {
      console.log(`\n🧪 Testing Department Attendance for: ${sampleStudent.department}`);
      
      const deptStudents = await User.find({ 
        department: sampleStudent.department, 
        role: 'student' 
      }).select('name department academicYear');
      
      console.log(`   Students in ${sampleStudent.department}: ${deptStudents.length}`);
      
      const studentIds = deptStudents.map(s => s._id);
      const academicRecords = await AcademicRecord.find({ 
        studentId: { $in: studentIds } 
      });
      
      console.log(`   Academic records for department: ${academicRecords.length}`);
    }

  } catch (error) {
    console.error('❌ Error testing academic data:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAcademicData();