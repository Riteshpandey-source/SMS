const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const AcademicRecord = require('./src/models/AcademicRecord');
const DailyAttendance = require('./src/models/DailyAttendance');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createSampleData() {
  try {
    console.log('🚀 Creating Sample Data for Testing...\n');

    // Clear existing data
    await User.deleteMany({});
    await AcademicRecord.deleteMany({});
    await DailyAttendance.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create sample users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create faculty
    const faculty1 = await User.create({
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh.faculty@college.edu',
      password: hashedPassword,
      role: 'faculty',
      department: 'CS',
      academicYear: null,
      accessibleYears: [1, 2, 3, 4]
    });

    const faculty2 = await User.create({
      name: 'Prof. Priya Sharma',
      email: 'priya.faculty@college.edu',
      password: hashedPassword,
      role: 'faculty',
      department: 'ECE',
      academicYear: null,
      accessibleYears: [1, 2, 3, 4]
    });

    console.log('👨‍🏫 Created faculty members');

    // Create students - CS Department
    const csStudents = [];
    const csNames = [
      'Amit Sharma', 'Priya Patel', 'Rahul Singh', 'Sneha Gupta', 'Vikash Kumar',
      'Anita Yadav', 'Rohit Verma', 'Kavya Reddy', 'Arjun Mehta', 'Pooja Jain'
    ];

    for (let i = 0; i < csNames.length; i++) {
      const student = await User.create({
        name: csNames[i],
        email: `cs.student${i + 1}@college.edu`,
        password: hashedPassword,
        role: 'student',
        department: 'CS',
        academicYear: Math.floor(i / 3) + 1, // Mix of 1st, 2nd, 3rd year
        rollNumber: `CS2024${String(i + 1).padStart(3, '0')}`
      });
      csStudents.push(student);
    }

    // Create students - ECE Department
    const eceStudents = [];
    const eceNames = [
      'Ravi Kumar', 'Sita Devi', 'Manoj Tiwari', 'Geeta Sharma', 'Suresh Yadav',
      'Meera Gupta', 'Ajay Singh', 'Rekha Patel', 'Deepak Verma', 'Sunita Jain'
    ];

    for (let i = 0; i < eceNames.length; i++) {
      const student = await User.create({
        name: eceNames[i],
        email: `ece.student${i + 1}@college.edu`,
        password: hashedPassword,
        role: 'student',
        department: 'ECE',
        academicYear: Math.floor(i / 3) + 1,
        rollNumber: `ECE2024${String(i + 1).padStart(3, '0')}`
      });
      eceStudents.push(student);
    }

    console.log('👨‍🎓 Created students (CS: 10, ECE: 10)');

    // Create Academic Records (Regular Attendance)
    const subjects = {
      CS: [
        { code: 'CS101', name: 'Programming Fundamentals' },
        { code: 'CS102', name: 'Data Structures' },
        { code: 'CS103', name: 'Database Systems' },
        { code: 'CS104', name: 'Web Development' }
      ],
      ECE: [
        { code: 'ECE101', name: 'Circuit Analysis' },
        { code: 'ECE102', name: 'Digital Electronics' },
        { code: 'ECE103', name: 'Signal Processing' },
        { code: 'ECE104', name: 'Communication Systems' }
      ]
    };

    // Create academic records for CS students
    for (const student of csStudents) {
      const attendanceData = subjects.CS.map(subject => {
        const totalClasses = Math.floor(Math.random() * 20) + 30; // 30-50 classes
        const attendedClasses = Math.floor(totalClasses * (0.6 + Math.random() * 0.4)); // 60-100% attendance
        const percentage = Math.round((attendedClasses / totalClasses) * 100);
        
        return {
          subjectId: subject.code, // Using subject code as ID
          subjectCode: subject.code,
          subjectName: subject.name,
          attendedClasses,
          totalClasses,
          percentage
        };
      });

      const midTermMarks = subjects.CS.map(subject => ({
        subjectCode: subject.code,
        subjectName: subject.name,
        obtainedMarks: Math.floor(Math.random() * 40) + 40, // 40-80 marks
        maxMarks: 100,
        examDate: new Date()
      }));

      await AcademicRecord.create({
        studentId: student._id,
        department: student.department, // Add department
        academicYear: student.academicYear,
        semester: 'current',
        attendance: attendanceData,
        midTermMarks: midTermMarks
      });
    }

    // Create academic records for ECE students
    for (const student of eceStudents) {
      const attendanceData = subjects.ECE.map(subject => {
        const totalClasses = Math.floor(Math.random() * 20) + 30;
        const attendedClasses = Math.floor(totalClasses * (0.6 + Math.random() * 0.4));
        const percentage = Math.round((attendedClasses / totalClasses) * 100);
        
        return {
          subjectId: subject.code, // Using subject code as ID
          subjectCode: subject.code,
          subjectName: subject.name,
          attendedClasses,
          totalClasses,
          percentage
        };
      });

      const midTermMarks = subjects.ECE.map(subject => ({
        subjectCode: subject.code,
        subjectName: subject.name,
        obtainedMarks: Math.floor(Math.random() * 40) + 40,
        maxMarks: 100,
        examDate: new Date()
      }));

      await AcademicRecord.create({
        studentId: student._id,
        department: student.department, // Add department
        academicYear: student.academicYear,
        semester: 'current',
        attendance: attendanceData,
        midTermMarks: midTermMarks
      });
    }

    console.log('📚 Created academic records with attendance data');

    // Skip daily attendance for now - focus on regular attendance
    console.log('⏭️ Skipping daily attendance creation for now');

    // Summary
    const userCount = await User.countDocuments();
    const academicCount = await AcademicRecord.countDocuments();
    // const dailyCount = await DailyAttendance.countDocuments();

    console.log('\n✅ Sample Data Created Successfully!');
    console.log(`👥 Users: ${userCount}`);
    console.log(`📚 Academic Records: ${academicCount}`);
    // console.log(`📅 Daily Attendance Sessions: ${dailyCount}`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('Students:');
    console.log('  Email: cs.student1@college.edu');
    console.log('  Email: ece.student1@college.edu');
    console.log('Faculty:');
    console.log('  Email: rajesh.faculty@college.edu');
    console.log('  Email: priya.faculty@college.edu');
    console.log('Password for all: password123');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    mongoose.connection.close();
  }
}

createSampleData();