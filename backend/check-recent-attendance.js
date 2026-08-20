const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkRecentAttendance() {
  try {
    console.log('🔍 Checking Recent Attendance Records...\n');

    // Get all attendance records sorted by creation date
    const allRecords = await DailyAttendance.find({})
      .sort({ createdAt: -1 })
      .populate('facultyId', 'name email')
      .limit(20);

    console.log(`📊 Total Recent Records: ${allRecords.length}\n`);

    if (allRecords.length === 0) {
      console.log('❌ No attendance records found');
      return;
    }

    // Group by department and year
    const groupedRecords = {};
    
    allRecords.forEach((record, index) => {
      const key = `${record.department}-Year${record.academicYear}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = [];
      }
      groupedRecords[key].push(record);
    });

    console.log('📋 Attendance Records by Department & Year:\n');
    
    Object.entries(groupedRecords).forEach(([key, records]) => {
      console.log(`\n🎓 ${key}:`);
      console.log(`   Total Sessions: ${records.length}`);
      
      // Get unique students
      const uniqueStudents = new Set();
      records.forEach(record => {
        record.studentAttendance?.forEach(att => {
          uniqueStudents.add(att.studentName);
        });
      });
      
      console.log(`   Unique Students: ${uniqueStudents.size}`);
      console.log(`   Students: ${Array.from(uniqueStudents).join(', ')}`);
      
      // Show latest session
      const latest = records[0];
      console.log(`\n   Latest Session:`);
      console.log(`      Date: ${latest.date.toDateString()}`);
      console.log(`      Subject: ${latest.subjectCode} - ${latest.subjectName}`);
      console.log(`      Faculty: ${latest.facultyName}`);
      console.log(`      Status: ${latest.status}`);
      console.log(`      Students in session: ${latest.studentAttendance?.length || 0}`);
      
      if (latest.studentAttendance && latest.studentAttendance.length > 0) {
        console.log(`      Attendance:`);
        latest.studentAttendance.forEach((att, idx) => {
          console.log(`         ${idx + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
        });
      }
    });

    // Check for Rohit and Pooja specifically
    console.log('\n\n🔍 Searching for Rohit and Pooja...\n');
    
    const rohitRecords = allRecords.filter(record => 
      record.studentAttendance?.some(att => 
        att.studentName?.toLowerCase().includes('rohit')
      )
    );
    
    const poojaRecords = allRecords.filter(record => 
      record.studentAttendance?.some(att => 
        att.studentName?.toLowerCase().includes('pooja')
      )
    );

    if (rohitRecords.length > 0) {
      console.log(`✅ Found ${rohitRecords.length} records with Rohit`);
      rohitRecords.forEach((record, idx) => {
        const rohitAtt = record.studentAttendance.find(att => 
          att.studentName?.toLowerCase().includes('rohit')
        );
        console.log(`   ${idx + 1}. ${record.date.toDateString()} - ${record.subjectCode} - ${rohitAtt.isPresent ? 'Present' : 'Absent'}`);
      });
    } else {
      console.log('❌ No records found with Rohit');
    }

    if (poojaRecords.length > 0) {
      console.log(`\n✅ Found ${poojaRecords.length} records with Pooja`);
      poojaRecords.forEach((record, idx) => {
        const poojaAtt = record.studentAttendance.find(att => 
          att.studentName?.toLowerCase().includes('pooja')
        );
        console.log(`   ${idx + 1}. ${record.date.toDateString()} - ${record.subjectCode} - ${poojaAtt.isPresent ? 'Present' : 'Absent'}`);
      });
    } else {
      console.log('\n❌ No records found with Pooja');
    }

    // Check all students in database
    console.log('\n\n👥 All Students in Database:\n');
    const allStudents = await User.find({ role: 'student' })
      .select('name department academicYear')
      .sort({ department: 1, academicYear: 1, name: 1 });
    
    const studentsByDeptYear = {};
    allStudents.forEach(student => {
      const key = `${student.department}-Year${student.academicYear}`;
      if (!studentsByDeptYear[key]) {
        studentsByDeptYear[key] = [];
      }
      studentsByDeptYear[key].push(student.name);
    });

    Object.entries(studentsByDeptYear).forEach(([key, students]) => {
      console.log(`${key}: ${students.join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkRecentAttendance();
