const fetch = require('node-fetch');

async function testPublicAPI() {
  try {
    console.log('🧪 Testing Public Attendance API...\n');
    console.log('='.repeat(60));
    console.log('\n');

    const baseURL = 'http://localhost:5000/api';
    
    // Test 1: Get Year 3 CS students attendance
    console.log('📊 Test 1: Get Year 3 CS Students Attendance');
    console.log('   Endpoint: GET /daily-attendance/public/department');
    console.log('   Params: department=CS, academicYear=3\n');

    const params = new URLSearchParams({
      department: 'CS',
      academicYear: '3',
      startDate: '2026-03-01',
      endDate: '2026-03-31'
    });

    const response = await fetch(`${baseURL}/daily-attendance/public/department?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log('   ❌ API call failed!');
      const error = await response.text();
      console.log('   Error:', error);
      return;
    }

    const data = await response.json();
    console.log('   ✅ API call successful!\n');

    // Analyze response
    const sessions = data.data?.attendanceRecords || [];
    console.log(`📊 Response Analysis:`);
    console.log(`   Total Sessions: ${sessions.length}`);
    console.log(`   Department: ${data.data?.department}`);
    console.log(`   Academic Year: ${data.data?.academicYear}\n`);

    if (sessions.length > 0) {
      // Extract unique students
      const studentsMap = new Map();
      sessions.forEach(session => {
        session.studentAttendance?.forEach(att => {
          if (!studentsMap.has(att.studentName)) {
            studentsMap.set(att.studentName, {
              name: att.studentName,
              email: att.studentEmail,
              sessionsCount: 0,
              presentCount: 0
            });
          }
          const student = studentsMap.get(att.studentName);
          student.sessionsCount++;
          if (att.isPresent) student.presentCount++;
        });
      });

      const students = Array.from(studentsMap.values());
      
      console.log(`👥 Students Found: ${students.length}\n`);
      students.forEach((student, idx) => {
        const percentage = Math.round((student.presentCount / student.sessionsCount) * 100);
        console.log(`   ${idx + 1}. ${student.name}`);
        console.log(`      Email: ${student.email}`);
        console.log(`      Sessions: ${student.sessionsCount}`);
        console.log(`      Present: ${student.presentCount}`);
        console.log(`      Attendance: ${percentage}%`);
        console.log('');
      });

      // Show sample session
      const sampleSession = sessions[0];
      console.log(`📝 Sample Session:`);
      console.log(`   Subject: ${sampleSession.subjectCode} - ${sampleSession.subjectName}`);
      console.log(`   Date: ${new Date(sampleSession.date).toDateString()}`);
      console.log(`   Time: ${sampleSession.classStartTime} - ${sampleSession.classEndTime}`);
      console.log(`   Faculty: ${sampleSession.facultyName}`);
      console.log(`   Location: ${sampleSession.location}`);
      console.log(`   Status: ${sampleSession.status}`);
      console.log(`   Students in session: ${sampleSession.studentAttendance?.length || 0}\n`);

      console.log('✅ PUBLIC API IS WORKING CORRECTLY!');
      console.log('\n🎯 Students can now:');
      console.log('   1. Go to: http://localhost:5173/public-attendance');
      console.log('   2. Select: Department=CS, Year=3');
      console.log('   3. Choose their name from the list');
      console.log('   4. View their complete attendance!');

    } else {
      console.log('⚠️  No sessions found!');
      console.log('   Make sure:');
      console.log('   1. Faculty has created attendance sessions');
      console.log('   2. Sessions are in "submitted" status');
      console.log('   3. Date range includes the sessions');
    }

    console.log('\n');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error testing public API:', error.message);
    console.log('\n⚠️  Make sure backend server is running:');
    console.log('   cd SMS-master/backend');
    console.log('   npm start');
  }
}

testPublicAPI();
