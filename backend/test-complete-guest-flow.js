const axios = require('axios');

async function testCompleteGuestFlow() {
  try {
    console.log('🧪 Testing Complete Guest Student Flow\n');
    console.log('=' .repeat(60));

    // Step 1: Faculty Login
    console.log('\n📝 Step 1: Faculty Login');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'it.faculty@college.edu',
      password: 'password123'
    });
    
    const token = loginRes.data.data.token;
    const faculty = loginRes.data.data.user;
    console.log(`✅ Logged in as: ${faculty.name}`);
    console.log(`   Department: ${faculty.department}`);
    console.log(`   Accessible Years: ${faculty.accessibleYears.join(', ')}`);

    // Step 2: Create Attendance Session
    console.log('\n📝 Step 2: Create Attendance Session');
    const sessionData = {
      date: '2026-03-25',
      subjectId: 'IT301-year2-session1',
      subjectCode: 'IT301',
      subjectName: 'Advanced Programming',
      department: 'IT',
      academicYear: 2,
      classStartTime: '14:00',
      classEndTime: '15:00',
      classType: 'lecture',
      location: 'Room 401'
    };

    const sessionRes = await axios.post(
      'http://localhost:5000/api/daily-attendance/sessions',
      sessionData,
      { headers: { Authorization: `Bearer ${token}` }}
    );

    const session = sessionRes.data.data.attendanceSession;
    console.log(`✅ Session Created: ${session.subjectCode} - ${session.subjectName}`);
    console.log(`   Session ID: ${session._id}`);
    console.log(`   Date: ${new Date(session.date).toLocaleDateString()}`);
    console.log(`   Time: ${session.classStartTime} - ${session.classEndTime}`);
    console.log(`   Auto-added students: ${session.studentAttendance.length}`);
    
    // Show auto-added students
    console.log('\n   📋 Auto-added Students (from database):');
    session.studentAttendance.forEach((s, i) => {
      console.log(`      ${i + 1}. ${s.studentName} (${s.studentEmail})`);
    });

    // Step 3: Add Guest Students
    console.log('\n📝 Step 3: Add Guest Students (Not in Database)');
    
    const guestStudents = [
      {
        studentName: 'Rahul Kumar',
        studentEmail: 'rahul.guest@example.com',
        rollNumber: 'GUEST001',
        isPresent: true
      },
      {
        studentName: 'Priya Sharma',
        studentEmail: 'priya.guest@example.com',
        rollNumber: 'GUEST002',
        isPresent: false
      }
    ];

    for (const guest of guestStudents) {
      const guestRes = await axios.post(
        `http://localhost:5000/api/daily-attendance/sessions/${session._id}/guest`,
        guest,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      console.log(`✅ Added Guest: ${guest.studentName}`);
      console.log(`   Email: ${guest.studentEmail}`);
      console.log(`   Status: ${guest.isPresent ? 'Present' : 'Absent'}`);
    }

    // Step 4: Mark Attendance for Some Students
    console.log('\n📝 Step 4: Mark Attendance');
    
    // Mark first registered student as absent
    if (session.studentAttendance.length > 0) {
      const firstStudent = session.studentAttendance[0];
      await axios.put(
        `http://localhost:5000/api/daily-attendance/sessions/${session._id}/student`,
        {
          studentId: firstStudent.studentId,
          isPresent: false,
          remarks: 'Marked absent by faculty'
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      console.log(`✅ Marked ${firstStudent.studentName} as Absent`);
    }

    // Step 5: Submit Session
    console.log('\n📝 Step 5: Submit Session');
    await axios.post(
      `http://localhost:5000/api/daily-attendance/sessions/${session._id}/submit`,
      {},
      { headers: { Authorization: `Bearer ${token}` }}
    );
    console.log('✅ Session Submitted (Now visible to public!)');

    // Step 6: Verify in Public API (No Login Required)
    console.log('\n📝 Step 6: Verify in Public Viewer (No Login)');
    
    const publicRes = await axios.get(
      'http://localhost:5000/api/daily-attendance/public/department',
      {
        params: {
          department: 'IT',
          academicYear: 2,
          startDate: '2026-03-01',
          endDate: '2026-03-31'
        }
      }
    );

    const publicSessions = publicRes.data.data.attendanceRecords;
    const ourSession = publicSessions.find(s => s._id === session._id);

    if (ourSession) {
      console.log('✅ Session Found in Public API!');
      console.log(`   Subject: ${ourSession.subjectCode} - ${ourSession.subjectName}`);
      console.log(`   Total Students: ${ourSession.studentAttendance.length}`);
      console.log(`   Present: ${ourSession.presentCount}`);
      console.log(`   Absent: ${ourSession.absentCount}`);
      
      console.log('\n   📋 All Students (Registered + Guest):');
      ourSession.studentAttendance.forEach((s, i) => {
        const badge = s.isGuest ? '🎫 GUEST' : '👤 Registered';
        const status = s.isPresent ? '✅ Present' : '❌ Absent';
        console.log(`      ${i + 1}. ${s.studentName} ${badge} - ${status}`);
      });

      // Extract unique students for public viewer
      console.log('\n   👥 Students List for Public Viewer:');
      const studentsMap = new Map();
      publicSessions.forEach(sess => {
        sess.studentAttendance?.forEach(att => {
          if (!studentsMap.has(att.studentEmail)) {
            studentsMap.set(att.studentEmail, {
              name: att.studentName,
              email: att.studentEmail,
              isGuest: att.isGuest || false
            });
          }
        });
      });

      Array.from(studentsMap.values()).forEach((s, i) => {
        const badge = s.isGuest ? '🎫' : '👤';
        console.log(`      ${i + 1}. ${badge} ${s.name} (${s.email})`);
      });
    } else {
      console.log('⚠️  Session not found in public API');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ COMPLETE FLOW SUCCESSFUL!');
    console.log('\n📊 Summary:');
    console.log(`   - Faculty: ${faculty.name} (${faculty.department})`);
    console.log(`   - Session: ${sessionData.subjectCode} - ${sessionData.subjectName}`);
    console.log(`   - Registered Students: ${session.studentAttendance.length}`);
    console.log(`   - Guest Students Added: ${guestStudents.length}`);
    console.log(`   - Total Students: ${session.studentAttendance.length + guestStudents.length}`);
    console.log(`   - Status: Submitted & Visible in Public Viewer`);
    
    console.log('\n🌐 Public Access:');
    console.log('   1. Open: http://localhost:5173/public-attendance');
    console.log('   2. Select: IT Department, Year 2');
    console.log('   3. See all students (registered + guest)');
    console.log('   4. Click any name to view attendance');
    
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompleteGuestFlow();
