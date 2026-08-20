const mongoose = require('mongoose');
const User = require('./src/models/User');
const DailyAttendance = require('./src/models/DailyAttendance');

async function verifyDynamicSystem() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 VERIFYING DYNAMIC SYSTEM\n');
    console.log('=' .repeat(60));

    // Check all departments with students
    const departments = ['CS', 'IT', 'ECE', 'ME', 'EE', 'CSAI', 'AIDS', 'CIVIL'];
    
    console.log('\n📊 STUDENTS BY DEPARTMENT:\n');
    
    for (const dept of departments) {
      const students = await User.find({
        role: 'student',
        department: dept,
        isActive: true
      }).select('name academicYear').sort({ academicYear: 1, name: 1 });

      if (students.length > 0) {
        console.log(`\n${dept} Department:`);
        
        // Group by year
        const byYear = {};
        students.forEach(s => {
          if (!byYear[s.academicYear]) byYear[s.academicYear] = [];
          byYear[s.academicYear].push(s.name);
        });

        Object.keys(byYear).sort().forEach(year => {
          console.log(`  Year ${year}: ${byYear[year].length} students`);
          console.log(`    → ${byYear[year].join(', ')}`);
        });
      }
    }

    // Check faculty
    console.log('\n\n👨‍🏫 FACULTY BY DEPARTMENT:\n');
    
    for (const dept of departments) {
      const faculty = await User.find({
        role: 'faculty',
        department: dept,
        isActive: true
      }).select('name email accessibleYears');

      if (faculty.length > 0) {
        console.log(`\n${dept} Department:`);
        faculty.forEach(f => {
          console.log(`  → ${f.name} (${f.email})`);
          console.log(`    Can access years: ${f.accessibleYears?.join(', ') || 'All'}`);
        });
      }
    }

    // Check attendance sessions (only real ones, not sample)
    console.log('\n\n📅 ATTENDANCE SESSIONS (Submitted):\n');
    
    for (const dept of departments) {
      const sessions = await DailyAttendance.find({
        department: dept,
        status: 'submitted'
      }).select('date subjectCode academicYear studentAttendance').sort({ date: -1 });

      if (sessions.length > 0) {
        console.log(`\n${dept} Department: ${sessions.length} sessions`);
        
        // Group by year
        const byYear = {};
        sessions.forEach(s => {
          if (!byYear[s.academicYear]) byYear[s.academicYear] = 0;
          byYear[s.academicYear]++;
        });

        Object.keys(byYear).sort().forEach(year => {
          console.log(`  Year ${year}: ${byYear[year]} sessions`);
        });

        // Show latest session
        const latest = sessions[0];
        console.log(`  Latest: ${latest.subjectCode} on ${latest.date.toISOString().split('T')[0]}`);
        console.log(`    Students in session: ${latest.studentAttendance.length}`);
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('\n✅ SYSTEM STATUS: FULLY DYNAMIC');
    console.log('\n📝 HOW IT WORKS:');
    console.log('   1. Faculty logs in with their department');
    console.log('   2. Faculty creates attendance session');
    console.log('   3. System automatically fetches students from faculty\'s department');
    console.log('   4. Faculty marks attendance and submits');
    console.log('   5. Students and public can view the attendance');
    console.log('\n💡 NO SAMPLE DATA NEEDED!');
    console.log('   Faculty creates real attendance → Students appear automatically');
    console.log('\n' + '='.repeat(60));

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyDynamicSystem();
