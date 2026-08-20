const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');
const User = require('./src/models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkDailyAttendanceStudents() {
  try {
    console.log('🔍 Checking Daily Attendance Students Data...\n');

    // Find students named Rohit and Pooja
    const rohit = await User.findOne({ name: /rohit/i, role: 'student' });
    const pooja = await User.findOne({ name: /pooja/i, role: 'student' });

    console.log('👥 Students Found:');
    if (rohit) {
      console.log(`✅ Rohit: ${rohit.name} (${rohit._id})`);
      console.log(`   Department: ${rohit.department}, Year: ${rohit.academicYear}`);
    } else {
      console.log('❌ Rohit not found');
    }

    if (pooja) {
      console.log(`✅ Pooja: ${pooja.name} (${pooja._id})`);
      console.log(`   Department: ${pooja.department}, Year: ${pooja.academicYear}`);
    } else {
      console.log('❌ Pooja not found');
    }

    // Check all daily attendance records
    const allRecords = await DailyAttendance.find({}).sort({ date: -1 });
    console.log(`\n📊 Total Daily Attendance Records: ${allRecords.length}\n`);

    if (allRecords.length === 0) {
      console.log('❌ No daily attendance records found');
      return;
    }

    // Check if Rohit and Pooja are in any attendance records
    console.log('🔍 Searching for Rohit and Pooja in attendance records...\n');

    let rohitFound = false;
    let poojaFound = false;

    allRecords.forEach((record, index) => {
      const rohitAttendance = record.studentAttendance?.find(att => 
        att.studentName?.toLowerCase().includes('rohit') || 
        att.studentId?.toString() === rohit?._id?.toString()
      );
      
      const poojaAttendance = record.studentAttendance?.find(att => 
        att.studentName?.toLowerCase().includes('pooja') || 
        att.studentId?.toString() === pooja?._id?.toString()
      );

      if (rohitAttendance || poojaAttendance) {
        console.log(`📋 Record ${index + 1}:`);
        console.log(`   Date: ${record.date.toDateString()}`);
        console.log(`   Subject: ${record.subjectCode} - ${record.subjectName}`);
        console.log(`   Department: ${record.department}, Year: ${record.academicYear}`);
        console.log(`   Total Students: ${record.studentAttendance?.length || 0}`);
        
        if (rohitAttendance) {
          rohitFound = true;
          console.log(`   ✅ Rohit: ${rohitAttendance.isPresent ? 'Present' : 'Absent'}`);
        }
        
        if (poojaAttendance) {
          poojaFound = true;
          console.log(`   ✅ Pooja: ${poojaAttendance.isPresent ? 'Present' : 'Absent'}`);
        }
        
        console.log('');
      }
    });

    if (!rohitFound && rohit) {
      console.log('❌ Rohit not found in any attendance records');
    }
    
    if (!poojaFound && pooja) {
      console.log('❌ Pooja not found in any attendance records');
    }

    // Show all unique students in attendance records
    console.log('\n👥 All Students in Attendance Records:');
    const uniqueStudents = new Set();
    allRecords.forEach(record => {
      record.studentAttendance?.forEach(att => {
        uniqueStudents.add(`${att.studentName} (${att.studentId})`);
      });
    });

    Array.from(uniqueStudents).forEach((student, index) => {
      console.log(`   ${index + 1}. ${student}`);
    });

    // Show sample record details
    if (allRecords.length > 0) {
      console.log('\n📋 Latest Attendance Record Details:');
      const latest = allRecords[0];
      console.log(`   Date: ${latest.date.toDateString()}`);
      console.log(`   Subject: ${latest.subjectCode} - ${latest.subjectName}`);
      console.log(`   Department: ${latest.department}, Year: ${latest.academicYear}`);
      console.log(`   Students in this session:`);
      latest.studentAttendance?.forEach((att, index) => {
        console.log(`      ${index + 1}. ${att.studentName} - ${att.isPresent ? '✅ Present' : '❌ Absent'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkDailyAttendanceStudents();
