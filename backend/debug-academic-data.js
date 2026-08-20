// Debug script to check academic data flow
// Run this with: node debug-academic-data.js

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const AcademicRecord = require('./src/models/AcademicRecord');
const StudentFacultyAssignment = require('./src/models/StudentFacultyAssignment');

async function debugAcademicData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');

    // 1. Find Ritu (faculty) and De (student)
    console.log('\n🔍 Finding users...');
    
    const ritu = await User.findOne({ name: /ritu/i, role: 'faculty' });
    const de = await User.findOne({ name: /de/i, role: 'student' });
    
    console.log('Faculty Ritu:', ritu ? {
      id: ritu._id,
      name: ritu.name,
      department: ritu.department,
      accessibleYears: ritu.accessibleYears
    } : 'NOT FOUND');
    
    console.log('Student De:', de ? {
      id: de._id,
      name: de.name,
      department: de.department,
      academicYear: de.academicYear
    } : 'NOT FOUND');

    if (!ritu || !de) {
      console.log('❌ Users not found. Please check names.');
      return;
    }

    // 2. Check assignment
    console.log('\n🔗 Checking assignment...');
    const assignment = await StudentFacultyAssignment.findOne({
      student: de._id,
      faculty: ritu._id,
      isActive: true
    });
    
    console.log('Assignment:', assignment ? 'EXISTS' : 'NOT FOUND');
    
    if (!assignment) {
      console.log('⚠️ No assignment found. Creating assignment...');
      const newAssignment = new StudentFacultyAssignment({
        student: de._id,
        faculty: ritu._id,
        department: de.department,
        academicYear: de.academicYear,
        assignedAt: new Date(),
        isActive: true
      });
      await newAssignment.save();
      console.log('✅ Assignment created');
    }

    // 3. Check academic records
    console.log('\n📚 Checking academic records...');
    const academicRecords = await AcademicRecord.find({ studentId: de._id });
    
    console.log(`Found ${academicRecords.length} academic records for De:`);
    
    academicRecords.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`);
      console.log('- Academic Year:', record.academicYear);
      console.log('- Semester:', record.semester);
      console.log('- Department:', record.department);
      console.log('- Mid-term Marks:', record.midTermMarks?.length || 0);
      console.log('- Attendance Records:', record.attendance?.length || 0);
      console.log('- Manual Debarments:', record.manualDebarments ? Object.keys(record.manualDebarments).length : 0);
      
      if (record.midTermMarks?.length > 0) {
        console.log('  Marks Details:');
        record.midTermMarks.forEach(mark => {
          console.log(`    - ${mark.subjectCode}: ${mark.obtainedMarks}/${mark.maxMarks}`);
        });
      }
      
      if (record.attendance?.length > 0) {
        console.log('  Attendance Details:');
        record.attendance.forEach(att => {
          console.log(`    - ${att.subjectCode}: ${att.attendedClasses}/${att.totalClasses} (${att.percentage}%)`);
        });
      }
    });

    // 4. Test API endpoints (simulate)
    console.log('\n🧪 Testing API endpoint logic...');
    
    // Simulate getMidTermMarks
    const marksQuery = { studentId: de._id };
    const marksRecord = await AcademicRecord.findOne(marksQuery)
      .populate('studentId', 'name email department academicYear')
      .select('midTermMarks academicYear semester');
    
    console.log('getMidTermMarks result:', marksRecord ? {
      marks: marksRecord.midTermMarks || [],
      total: marksRecord.midTermMarks?.length || 0,
      student: marksRecord.studentId?.name,
      academicYear: marksRecord.academicYear,
      semester: marksRecord.semester
    } : 'NO RECORD FOUND');

    // Simulate getAttendance
    const attendanceQuery = { studentId: de._id };
    const attendanceRecords = await AcademicRecord.find(attendanceQuery)
      .populate('studentId', 'name email department academicYear')
      .select('academicYear semester attendance attendanceSummary overallAttendance isDebarred debarredSubjects');
    
    console.log('getAttendance result:', {
      attendance: attendanceRecords,
      total: attendanceRecords.length
    });

    // Simulate getStudentDebarments
    const debarmentRecord = await AcademicRecord.findOne({
      studentId: de._id,
      academicYear: { $exists: true }
    })
    .populate('studentId', 'name email department academicYear')
    .sort({ academicYear: -1 });

    const manualDebarments = {};
    if (debarmentRecord?.manualDebarments) {
      for (let [key, value] of debarmentRecord.manualDebarments) {
        manualDebarments[key] = value;
      }
    }

    console.log('getStudentDebarments result:', {
      debarments: debarmentRecord?.debarredSubjects || [],
      manualDebarments,
      isDebarred: debarmentRecord?.isDebarred || false,
      student: debarmentRecord?.studentId?.name
    });

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run debug
debugAcademicData();