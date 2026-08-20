const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testDepartmentAPI() {
  try {
    console.log('🧪 Testing Department Daily Attendance API Query...\n');

    // Simulate the API query
    const query = {
      department: 'CS',
      academicYear: 3,
      status: 'submitted',
      date: {
        $gte: new Date('2026-03-01'),
        $lte: new Date('2026-03-31')
      }
    };

    console.log('📊 Query:', JSON.stringify(query, null, 2));

    const attendanceRecords = await DailyAttendance.find(query)
      .sort({ date: -1, classStartTime: -1 })
      .lean();

    console.log(`\n✅ Found ${attendanceRecords.length} attendance records\n`);

    if (attendanceRecords.length > 0) {
      attendanceRecords.forEach((record, idx) => {
        console.log(`📝 Session ${idx + 1}:`);
        console.log(`   Subject: ${record.subjectCode} - ${record.subjectName}`);
        console.log(`   Date: ${record.date.toDateString()}`);
        console.log(`   Time: ${record.classStartTime} - ${record.classEndTime}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Students in session: ${record.studentAttendance?.length || 0}`);
        
        if (record.studentAttendance && record.studentAttendance.length > 0) {
          console.log(`   Student List:`);
          record.studentAttendance.forEach((att, attIdx) => {
            console.log(`      ${attIdx + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
          });
        }
        console.log('');
      });

      // Count unique students
      const uniqueStudents = new Set();
      attendanceRecords.forEach(record => {
        record.studentAttendance?.forEach(att => {
          uniqueStudents.add(att.studentName);
        });
      });

      console.log(`\n📊 Summary:`);
      console.log(`   Total Sessions: ${attendanceRecords.length}`);
      console.log(`   Unique Students: ${uniqueStudents.size}`);
      console.log(`   Students: ${Array.from(uniqueStudents).join(', ')}`);
    } else {
      console.log('❌ No records found! This is why the student panel is empty.\n');
      
      // Check if there are any records without status filter
      const allRecords = await DailyAttendance.find({
        department: 'CS',
        academicYear: 3
      });
      
      console.log(`\n🔍 Found ${allRecords.length} records without status filter`);
      if (allRecords.length > 0) {
        console.log('   Status breakdown:');
        const statusCounts = {};
        allRecords.forEach(r => {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        });
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`      ${status}: ${count}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDepartmentAPI();
