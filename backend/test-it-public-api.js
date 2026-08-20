const axios = require('axios');

async function testITPublicAPI() {
  try {
    console.log('🧪 Testing IT Department Public API...\n');

    const years = [1, 2, 3, 4];

    for (const year of years) {
      console.log(`\n📊 Testing IT Year ${year}:`);
      
      const url = 'http://localhost:5000/api/daily-attendance/public/department';
      const params = {
        department: 'IT',
        academicYear: year,
        startDate: '2026-03-01',
        endDate: '2026-03-31'
      };
      
      console.log(`   🔗 URL: ${url}`);
      console.log(`   📋 Params:`, params);
      
      const response = await axios.get(url, { params });

      console.log(`   📡 Response status: ${response.status}`);
      console.log(`   📦 Response data keys:`, Object.keys(response.data));
      
      const sessions = response.data?.data?.attendanceRecords || [];
      console.log(`   ✅ Found ${sessions.length} sessions`);

      if (sessions.length > 0) {
        // Extract unique students
        const studentsMap = new Map();
        sessions.forEach(session => {
          session.studentAttendance?.forEach(att => {
            if (!studentsMap.has(att.studentName)) {
              studentsMap.set(att.studentName, att.studentName);
            }
          });
        });

        const students = Array.from(studentsMap.values());
        console.log(`   👥 Students: ${students.length}`);
        console.log(`   📝 Names: ${students.join(', ')}`);

        // Show sample session
        const sample = sessions[0];
        console.log(`   📅 Sample: ${sample.subjectCode} on ${new Date(sample.date).toLocaleDateString()}`);
      } else {
        console.log('   ⚠️  No sessions found!');
      }
    }

    console.log('\n✅ Test Complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testITPublicAPI();
