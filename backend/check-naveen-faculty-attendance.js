const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkNaveenFacultyAttendance() {
  try {
    console.log('🔍 Checking Faculty Daily Attendance Records...\n');

    // Find faculty named Naveen (or Rajesh if Naveen not found)
    let faculty = await User.findOne({ 
      name: /naveen/i, 
      role: 'faculty' 
    });

    if (!faculty) {
      console.log('⚠️  Faculty Naveen not found, checking Dr. Rajesh Kumar instead...\n');
      faculty = await User.findOne({ 
        name: /rajesh/i, 
        role: 'faculty' 
      });
    }

    if (!faculty) {
      console.log('❌ No faculty found in database\n');
      
      // Show all faculty
      const allFaculty = await User.find({ role: 'faculty' }).select('name email');
      console.log('👨‍🏫 All Faculty in Database:');
      allFaculty.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.name} (${f.email})`);
      });
      return;
    }

    console.log(`✅ Found Faculty: ${faculty.name} (${faculty.email})\n`);

    // Get all daily attendance records created by this faculty
    const facultySessions = await DailyAttendance.find({
      facultyId: faculty._id
    }).sort({ date: -1 });

    console.log(`📊 Total Sessions Created by ${faculty.name}: ${facultySessions.length}\n`);

    if (facultySessions.length === 0) {
      console.log(`❌ ${faculty.name} has not created any daily attendance sessions yet\n`);
      console.log('💡 Faculty needs to:');
      console.log('   1. Go to Faculty Dashboard');
      console.log('   2. Click on Daily Attendance');
      console.log('   3. Create new attendance session');
      console.log('   4. Add students and mark attendance');
      console.log('   5. Submit the session');
      return;
    }

    // Group by date
    const sessionsByDate = {};
    facultySessions.forEach(session => {
      const dateKey = session.date.toDateString();
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = [];
      }
      sessionsByDate[dateKey].push(session);
    });

    console.log('📅 Daily Attendance Summary:\n');
    
    Object.entries(sessionsByDate).forEach(([date, sessions]) => {
      console.log(`📆 ${date}:`);
      console.log(`   Total Sessions: ${sessions.length}`);
      
      sessions.forEach((session, idx) => {
        console.log(`\n   Session ${idx + 1}:`);
        console.log(`      Subject: ${session.subjectCode} - ${session.subjectName}`);
        console.log(`      Time: ${session.classStartTime} - ${session.classEndTime}`);
        console.log(`      Department: ${session.department}, Year: ${session.academicYear}`);
        console.log(`      Location: ${session.location || 'Not specified'}`);
        console.log(`      Status: ${session.status}`);
        console.log(`      Total Students: ${session.studentAttendance?.length || 0}`);
        
        if (session.studentAttendance && session.studentAttendance.length > 0) {
          console.log(`      Students:`);
          session.studentAttendance.forEach((att, attIdx) => {
            console.log(`         ${attIdx + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
          });
          
          const presentCount = session.studentAttendance.filter(a => a.isPresent).length;
          const absentCount = session.studentAttendance.length - presentCount;
          console.log(`      Present: ${presentCount}, Absent: ${absentCount}`);
        }
      });
      console.log('');
    });

    // Overall statistics
    console.log('\n📊 Overall Statistics:\n');
    
    const totalSessions = facultySessions.length;
    const uniqueStudents = new Set();
    const uniqueSubjects = new Set();
    const departmentYearCombos = new Set();
    let totalStudentRecords = 0;
    let totalPresentRecords = 0;
    
    facultySessions.forEach(session => {
      uniqueSubjects.add(session.subjectCode);
      departmentYearCombos.add(`${session.department}-Year${session.academicYear}`);
      
      session.studentAttendance?.forEach(att => {
        uniqueStudents.add(att.studentName);
        totalStudentRecords++;
        if (att.isPresent) totalPresentRecords++;
      });
    });

    console.log(`Total Sessions Created: ${totalSessions}`);
    console.log(`Unique Students: ${uniqueStudents.size}`);
    console.log(`Unique Subjects: ${uniqueSubjects.size}`);
    console.log(`Department-Year Combinations: ${Array.from(departmentYearCombos).join(', ')}`);
    console.log(`Total Student Records: ${totalStudentRecords}`);
    console.log(`Total Present Records: ${totalPresentRecords}`);
    console.log(`Total Absent Records: ${totalStudentRecords - totalPresentRecords}`);
    console.log(`Overall Attendance Rate: ${totalStudentRecords > 0 ? Math.round((totalPresentRecords / totalStudentRecords) * 100) : 0}%`);

    console.log(`\n👥 All Students Added by ${faculty.name}:`);
    Array.from(uniqueStudents).forEach((name, idx) => {
      console.log(`   ${idx + 1}. ${name}`);
    });

    console.log(`\n📚 All Subjects:`);
    Array.from(uniqueSubjects).forEach((code, idx) => {
      const subjectSessions = facultySessions.filter(s => s.subjectCode === code);
      console.log(`   ${idx + 1}. ${code} - ${subjectSessions.length} sessions`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkNaveenFacultyAttendance();
