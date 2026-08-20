// Quick script to check student De's data
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const AcademicRecord = require('./src/models/AcademicRecord');

async function checkStudentDeData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find student De
    const student = await User.findOne({ email: 'test@college.edu', role: 'student' });
    
    if (!student) {
      console.log('❌ Student De not found!');
      return;
    }

    console.log('👤 Student Found:');
    console.log('   ID:', student._id.toString());
    console.log('   Name:', student.name);
    console.log('   Email:', student.email);
    console.log('   Department:', student.department);
    console.log('   Academic Year:', student.academicYear);
    console.log('');

    // Find academic records
    const records = await AcademicRecord.find({ studentId: student._id });
    
    console.log(`📚 Academic Records: ${records.length} found\n`);

    if (records.length === 0) {
      console.log('❌ NO ACADEMIC RECORDS FOUND!');
      console.log('   This is why student dashboard is empty.');
      console.log('   Faculty needs to add data for this student.');
      return;
    }

    records.forEach((record, index) => {
      console.log(`\n📋 Record ${index + 1}:`);
      console.log('   Academic Year:', record.academicYear);
      console.log('   Semester:', record.semester);
      console.log('   Department:', record.department);
      
      console.log('\n   📊 Mid-term Marks:');
      if (record.midTermMarks && record.midTermMarks.length > 0) {
        record.midTermMarks.forEach(mark => {
          console.log(`      ✓ ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks} (${mark.percentage}%)`);
        });
      } else {
        console.log('      ❌ No marks data');
      }

      console.log('\n   📈 Attendance:');
      if (record.attendance && record.attendance.length > 0) {
        record.attendance.forEach(att => {
          console.log(`      ✓ ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
        });
        console.log(`      Overall: ${record.overallAttendance}%`);
      } else {
        console.log('      ❌ No attendance data');
      }

      console.log('\n   ⚠️ Debarment:');
      console.log('      Is Debarred:', record.isDebarred);
      if (record.debarredSubjects && record.debarredSubjects.length > 0) {
        console.log('      Debarred Subjects:', record.debarredSubjects);
      }
      if (record.manualDebarments && record.manualDebarments.size > 0) {
        console.log('      Manual Debarments:', Object.fromEntries(record.manualDebarments));
      }
    });

    console.log('\n\n🧪 Testing API Response Format:\n');

    // Simulate getMidTermMarks API
    const marksRecord = await AcademicRecord.findOne({ 
      studentId: student._id,
      academicYear: student.academicYear 
    });

    if (marksRecord) {
      console.log('✅ Marks API would return:');
      console.log(JSON.stringify({
        success: true,
        data: {
          midTermMarks: marksRecord.midTermMarks || [],
          total: marksRecord.midTermMarks?.length || 0
        }
      }, null, 2));
    } else {
      console.log('❌ No marks record found for academicYear:', student.academicYear);
    }

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStudentDeData();
