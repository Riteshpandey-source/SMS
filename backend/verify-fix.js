const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function verifyFix() {
  try {
    console.log('🔍 Verifying Department Daily Attendance Fix...\n');
    console.log('='.repeat(60));
    console.log('\n');

    // Check Year 3 CS students
    const year3Students = await User.find({
      role: 'student',
      department: 'CS',
      academicYear: 3,
      isActive: true
    }).select('name email');

    console.log('👥 Year 3 CS Students in Database:');
    console.log(`   Total: ${year3Students.length}\n`);
    year3Students.forEach((student, idx) => {
      console.log(`   ${idx + 1}. ${student.name} (${student.email})`);
    });
    console.log('\n');

    // Check submitted sessions for March 2026
    const submittedSessions = await DailyAttendance.find({
      department: 'CS',
      academicYear: 3,
      status: 'submitted',
      date: {
        $gte: new Date('2026-03-01'),
        $lte: new Date('2026-03-31')
      }
    }).sort({ date: -1, classStartTime: 1 });

    console.log('📊 Submitted Sessions (What Students Will See):');
    console.log(`   Total Sessions: ${submittedSessions.length}\n`);

    if (submittedSessions.length === 0) {
      console.log('   ❌ NO SUBMITTED SESSIONS FOUND!');
      console.log('   This means students will see empty attendance.\n');
      
      // Check if there are draft sessions
      const draftSessions = await DailyAttendance.find({
        department: 'CS',
        academicYear: 3,
        status: 'draft',
        date: {
          $gte: new Date('2026-03-01'),
          $lte: new Date('2026-03-31')
        }
      });
      
      if (draftSessions.length > 0) {
        console.log(`   ⚠️  Found ${draftSessions.length} DRAFT sessions`);
        console.log('   Faculty needs to SUBMIT these sessions for students to see them.\n');
      }
    } else {
      // Group by date
      const sessionsByDate = {};
      submittedSessions.forEach(session => {
        const dateKey = session.date.toDateString();
        if (!sessionsByDate[dateKey]) {
          sessionsByDate[dateKey] = [];
        }
        sessionsByDate[dateKey].push(session);
      });

      Object.entries(sessionsByDate).forEach(([date, sessions]) => {
        console.log(`   📅 ${date}: ${sessions.length} sessions`);
      });
      console.log('\n');

      // Check student counts in each session
      console.log('👥 Student Count Per Session:');
      let allSessionsHaveAllStudents = true;
      const uniqueStudentsInSessions = new Set();

      submittedSessions.forEach((session, idx) => {
        const studentCount = session.studentAttendance?.length || 0;
        const status = studentCount === year3Students.length ? '✅' : '❌';
        
        if (studentCount !== year3Students.length) {
          allSessionsHaveAllStudents = false;
        }

        console.log(`   ${status} Session ${idx + 1}: ${session.subjectCode} - ${studentCount} students`);
        
        // Collect unique student names
        session.studentAttendance?.forEach(att => {
          uniqueStudentsInSessions.add(att.studentName);
        });
      });
      console.log('\n');

      console.log('📊 Summary:');
      console.log(`   Expected Students per Session: ${year3Students.length}`);
      console.log(`   Unique Students in Sessions: ${uniqueStudentsInSessions.size}`);
      console.log(`   Students: ${Array.from(uniqueStudentsInSessions).join(', ')}`);
      console.log('\n');

      if (allSessionsHaveAllStudents && uniqueStudentsInSessions.size === year3Students.length) {
        console.log('✅ SUCCESS! All sessions have all students!');
        console.log('✅ Students will see complete attendance data!');
        console.log('\n');
        console.log('🎯 Next Steps:');
        console.log('   1. Restart backend server (if not already done)');
        console.log('   2. Login as any Year 3 CS student');
        console.log('   3. Go to: Dashboard → Daily Attendance → Department Daily Attendance');
        console.log('   4. Select: Month=March, Year=2026');
        console.log('   5. You should see all 4 students in each session!');
      } else {
        console.log('⚠️  WARNING: Some sessions are missing students!');
        console.log('   This needs to be fixed before students can see complete data.');
      }
    }

    console.log('\n');
    console.log('='.repeat(60));
    console.log('\n');

    // Test API query simulation
    console.log('🧪 Simulating API Query (What Frontend Will Call):');
    const apiQuery = {
      department: 'CS',
      academicYear: 3,
      status: 'submitted',
      date: {
        $gte: new Date('2026-03-01'),
        $lte: new Date('2026-03-31')
      }
    };
    console.log('   Query:', JSON.stringify(apiQuery, null, 2));
    
    const apiResult = await DailyAttendance.find(apiQuery)
      .sort({ date: -1, classStartTime: -1 })
      .lean();
    
    console.log(`   Result: ${apiResult.length} sessions`);
    
    if (apiResult.length > 0) {
      const firstSession = apiResult[0];
      console.log(`   First Session: ${firstSession.subjectCode} with ${firstSession.studentAttendance?.length || 0} students`);
      console.log('   ✅ API will return data correctly!');
    } else {
      console.log('   ❌ API will return empty array!');
    }

    console.log('\n');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verifyFix();
