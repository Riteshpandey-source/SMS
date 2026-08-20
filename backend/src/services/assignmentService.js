const User = require('../models/User');
const StudentFacultyAssignment = require('../models/StudentFacultyAssignment');
const AcademicRecord = require('../models/AcademicRecord');

/**
 * Assignment Service
 * Handles core business logic for student-faculty assignments
 */
class AssignmentService {
  
  /**
   * Automatically assign a student to matching faculty members
   * Called when student logs in or profile is updated
   * @param {string} studentId - MongoDB ObjectId of the student
   * @returns {Promise<Array>} Array of created assignments
   */
  async assignStudentToFaculty(studentId) {
    try {
      // Get student details
      const student = await User.findById(studentId);
      if (!student || student.role !== 'student') {
        throw new Error('Invalid student ID or user is not a student');
      }

      if (!student.isActive) {
        throw new Error('Student account is not active');
      }

      // Find matching faculty members
      const matchingFaculty = await User.find({
        role: 'faculty',
        department: student.department,
        accessibleYears: { $in: [student.academicYear] },
        isActive: true
      }).select('_id name email department accessibleYears');

      console.log(`Found ${matchingFaculty.length} matching faculty for student ${student.name} (${student.department}, Year ${student.academicYear})`);

      // Deactivate existing assignments for this student
      await StudentFacultyAssignment.deactivateAssignments({ 
        student: studentId 
      });

      // Create new assignments
      const assignments = [];
      for (const faculty of matchingFaculty) {
        try {
          const assignment = new StudentFacultyAssignment({
            student: studentId,
            faculty: faculty._id,
            academicYear: student.academicYear,
            department: student.department,
            assignmentSource: 'automatic'
          });

          await assignment.save();
          assignments.push(assignment);
        } catch (error) {
          console.error(`Failed to create assignment for faculty ${faculty.name}:`, error.message);
        }
      }

      console.log(`✅ Created ${assignments.length} assignments for student ${student.name} (${student.department}, Year ${student.academicYear})`);

      // Create academic record for the student if it doesn't exist
      const academicRecord = await this.createAcademicRecordForStudent(student);
      console.log(`📊 Academic record ${academicRecord ? 'created/verified' : 'failed'} for student ${student.name}`);

      return assignments;

    } catch (error) {
      console.error('Error in assignStudentToFaculty:', error.message);
      throw error;
    }
  }

  /**
   * Create academic record for a student
   * @param {Object} student - Student object
   * @returns {Promise<Object>} Created academic record or existing one
   */
  async createAcademicRecordForStudent(student) {
    try {
      // Check if academic record already exists for current academic year
      const currentSemester = this.getCurrentSemester();
      const existingRecord = await AcademicRecord.findOne({
        studentId: student._id,
        academicYear: student.academicYear,
        semester: currentSemester
      });

      if (existingRecord) {
        console.log(`Academic record already exists for student ${student.name}`);
        return existingRecord;
      }

      // Create default subjects based on department and academic year
      const defaultSubjects = this.getDefaultSubjects(student.department, student.academicYear);

      // Create new academic record
      const academicRecord = new AcademicRecord({
        studentId: student._id,
        academicYear: student.academicYear,
        semester: currentSemester,
        department: student.department,
        subjects: defaultSubjects,
        attendance: defaultSubjects.map(subject => ({
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          attendedClasses: 0,
          totalClasses: 0,
          percentage: 0
        })),
        midTermMarks: [],
        finalMarks: [],
        cgpa: 0,
        sgpa: 0,
        totalCredits: defaultSubjects.reduce((sum, subject) => sum + subject.credits, 0),
        earnedCredits: 0,
        overallAttendance: 0,
        isDebarred: false,
        debarredSubjects: [],
        academicStatus: 'active'
      });

      await academicRecord.save();
      console.log(`📊 Created academic record for student ${student.name} (${student.department}, Year ${student.academicYear})`);
      console.log(`📚 Academic record includes ${defaultSubjects.length} subjects and attendance tracking`);
      
      return academicRecord;

    } catch (error) {
      console.error('Error creating academic record:', error.message);
      throw error;
    }
  }

  /**
   * Get current semester based on date
   * @returns {string} Current semester
   */
  getCurrentSemester() {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    
    // Assuming academic year starts in July
    // July-December: Odd semester (1st, 3rd, 5th, 7th)
    // January-June: Even semester (2nd, 4th, 6th, 8th)
    if (month >= 7) {
      return 'Odd';
    } else {
      return 'Even';
    }
  }

  /**
   * Get default subjects for a department and academic year
   * @param {string} department - Department code
   * @param {number} academicYear - Academic year (1-4)
   * @returns {Array} Array of default subjects
   */
  getDefaultSubjects(department, academicYear) {
    // Default subjects mapping - this should ideally come from a database
    const subjectsMap = {
      'CS': {
        1: [
          { subjectId: 'CS101', subjectName: 'Programming Fundamentals', subjectCode: 'CS101', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS102', subjectName: 'Digital Logic Design', subjectCode: 'CS102', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'CS' }
        ],
        2: [
          { subjectId: 'CS201', subjectName: 'Data Structures', subjectCode: 'CS201', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS202', subjectName: 'Object Oriented Programming', subjectCode: 'CS202', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS203', subjectName: 'Computer Organization', subjectCode: 'CS203', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'MATH201', subjectName: 'Discrete Mathematics', subjectCode: 'MATH201', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'STAT201', subjectName: 'Probability and Statistics', subjectCode: 'STAT201', credits: 3, faculty: 'TBD', department: 'CS' }
        ],
        3: [
          { subjectId: 'CS301', subjectName: 'Algorithms', subjectCode: 'CS301', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS302', subjectName: 'Database Systems', subjectCode: 'CS302', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS303', subjectName: 'Operating Systems', subjectCode: 'CS303', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS304', subjectName: 'Computer Networks', subjectCode: 'CS304', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS305', subjectName: 'Software Engineering', subjectCode: 'CS305', credits: 3, faculty: 'TBD', department: 'CS' }
        ],
        4: [
          { subjectId: 'CS401', subjectName: 'Machine Learning', subjectCode: 'CS401', credits: 4, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS402', subjectName: 'Compiler Design', subjectCode: 'CS402', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS403', subjectName: 'Distributed Systems', subjectCode: 'CS403', credits: 3, faculty: 'TBD', department: 'CS' },
          { subjectId: 'CS404', subjectName: 'Capstone Project', subjectCode: 'CS404', credits: 6, faculty: 'TBD', department: 'CS' }
        ]
      },
      'ECE': {
        1: [
          { subjectId: 'ECE101', subjectName: 'Circuit Analysis', subjectCode: 'ECE101', credits: 4, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'ECE102', subjectName: 'Electronic Devices', subjectCode: 'ECE102', credits: 3, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 4, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'ECE' }
        ],
        2: [
          { subjectId: 'ECE201', subjectName: 'Analog Electronics', subjectCode: 'ECE201', credits: 4, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'ECE202', subjectName: 'Digital Electronics', subjectCode: 'ECE202', credits: 4, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'ECE203', subjectName: 'Signals and Systems', subjectCode: 'ECE203', credits: 3, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'MATH201', subjectName: 'Engineering Mathematics II', subjectCode: 'MATH201', credits: 3, faculty: 'TBD', department: 'ECE' },
          { subjectId: 'CS201', subjectName: 'Programming in C', subjectCode: 'CS201', credits: 3, faculty: 'TBD', department: 'ECE' }
        ]
      },
      'ME': {
        1: [
          { subjectId: 'ME101', subjectName: 'Engineering Mechanics', subjectCode: 'ME101', credits: 4, faculty: 'TBD', department: 'ME' },
          { subjectId: 'ME102', subjectName: 'Engineering Drawing', subjectCode: 'ME102', credits: 3, faculty: 'TBD', department: 'ME' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 4, faculty: 'TBD', department: 'ME' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'ME' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'ME' }
        ]
      },
      'EE': {
        1: [
          { subjectId: 'EE101', subjectName: 'Electrical Circuits', subjectCode: 'EE101', credits: 4, faculty: 'TBD', department: 'EE' },
          { subjectId: 'EE102', subjectName: 'Electrical Machines', subjectCode: 'EE102', credits: 3, faculty: 'TBD', department: 'EE' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 4, faculty: 'TBD', department: 'EE' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'EE' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'EE' }
        ]
      },
      'IT': {
        1: [
          { subjectId: 'IT101', subjectName: 'Programming Fundamentals', subjectCode: 'IT101', credits: 4, faculty: 'TBD', department: 'IT' },
          { subjectId: 'IT102', subjectName: 'Computer Systems', subjectCode: 'IT102', credits: 3, faculty: 'TBD', department: 'IT' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 4, faculty: 'TBD', department: 'IT' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'IT' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'IT' }
        ]
      },
      'CSAI': {
        1: [
          { subjectId: 'CSAI101', subjectName: 'Programming for AI', subjectCode: 'CSAI101', credits: 4, faculty: 'TBD', department: 'CSAI' },
          { subjectId: 'CSAI102', subjectName: 'Mathematics for AI', subjectCode: 'CSAI102', credits: 4, faculty: 'TBD', department: 'CSAI' },
          { subjectId: 'CSAI103', subjectName: 'Introduction to AI', subjectCode: 'CSAI103', credits: 3, faculty: 'TBD', department: 'CSAI' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'CSAI' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'CSAI' }
        ]
      },
      'AIDS': {
        1: [
          { subjectId: 'AIDS101', subjectName: 'Data Science Fundamentals', subjectCode: 'AIDS101', credits: 4, faculty: 'TBD', department: 'AIDS' },
          { subjectId: 'AIDS102', subjectName: 'Statistics for Data Science', subjectCode: 'AIDS102', credits: 4, faculty: 'TBD', department: 'AIDS' },
          { subjectId: 'AIDS103', subjectName: 'Programming for Data Science', subjectCode: 'AIDS103', credits: 3, faculty: 'TBD', department: 'AIDS' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 3, faculty: 'TBD', department: 'AIDS' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'AIDS' }
        ]
      },
      'CIVIL': {
        1: [
          { subjectId: 'CIVIL101', subjectName: 'Engineering Mechanics', subjectCode: 'CIVIL101', credits: 4, faculty: 'TBD', department: 'CIVIL' },
          { subjectId: 'CIVIL102', subjectName: 'Building Materials', subjectCode: 'CIVIL102', credits: 3, faculty: 'TBD', department: 'CIVIL' },
          { subjectId: 'MATH101', subjectName: 'Engineering Mathematics I', subjectCode: 'MATH101', credits: 4, faculty: 'TBD', department: 'CIVIL' },
          { subjectId: 'PHY101', subjectName: 'Engineering Physics', subjectCode: 'PHY101', credits: 3, faculty: 'TBD', department: 'CIVIL' },
          { subjectId: 'ENG101', subjectName: 'Technical Communication', subjectCode: 'ENG101', credits: 2, faculty: 'TBD', department: 'CIVIL' }
        ]
      }
    };

    // Get subjects for the department and year, fallback to empty array
    const departmentSubjects = subjectsMap[department] || {};
    return departmentSubjects[academicYear] || [];
  }

  /**
   * Update assignments when faculty's accessible years change
   * Called when faculty profile is updated
   * @param {string} facultyId - MongoDB ObjectId of the faculty
   * @returns {Promise<Object>} Summary of assignment changes
   */
  async updateFacultyAssignments(facultyId) {
    try {
      // Get faculty details
      const faculty = await User.findById(facultyId);
      if (!faculty || faculty.role !== 'faculty') {
        throw new Error('Invalid faculty ID or user is not faculty');
      }

      if (!faculty.isActive) {
        throw new Error('Faculty account is not active');
      }

      // Find all students that should be assigned to this faculty
      const eligibleStudents = await User.find({
        role: 'student',
        department: faculty.department,
        academicYear: { $in: faculty.accessibleYears },
        isActive: true
      }).select('_id name email academicYear');

      // Deactivate assignments for years no longer accessible
      const deactivatedCount = await StudentFacultyAssignment.updateMany(
        {
          faculty: facultyId,
          academicYear: { $nin: faculty.accessibleYears },
          isActive: true
        },
        { 
          isActive: false, 
          lastUpdated: new Date() 
        }
      );

      console.log(`Deactivated ${deactivatedCount.modifiedCount} assignments for faculty ${faculty.name}`);

      // Create missing assignments for eligible students
      const newAssignments = [];
      for (const student of eligibleStudents) {
        try {
          // Check if assignment already exists
          const existingAssignment = await StudentFacultyAssignment.findOne({
            student: student._id,
            faculty: facultyId,
            isActive: true
          });

          if (!existingAssignment) {
            const assignment = new StudentFacultyAssignment({
              student: student._id,
              faculty: facultyId,
              academicYear: student.academicYear,
              department: student.department,
              assignmentSource: 'automatic'
            });

            await assignment.save();
            newAssignments.push(assignment);
          }
        } catch (error) {
          console.error(`Failed to create assignment for student ${student.name}:`, error.message);
        }
      }

      console.log(`Created ${newAssignments.length} new assignments for faculty ${faculty.name}`);

      return {
        facultyName: faculty.name,
        deactivatedCount: deactivatedCount.modifiedCount,
        newAssignmentsCount: newAssignments.length,
        totalEligibleStudents: eligibleStudents.length,
        newAssignments
      };

    } catch (error) {
      console.error('Error in updateFacultyAssignments:', error.message);
      throw error;
    }
  }

  /**
   * Get all active assignments for a student
   * @param {string} studentId - MongoDB ObjectId of the student
   * @returns {Promise<Array>} Array of assignments with populated faculty data
   */
  async getStudentAssignments(studentId) {
    try {
      const assignments = await StudentFacultyAssignment.getStudentFaculty(studentId);
      return assignments;
    } catch (error) {
      console.error('Error in getStudentAssignments:', error.message);
      throw error;
    }
  }

  /**
   * Get all active assignments for a faculty member
   * @param {string} facultyId - MongoDB ObjectId of the faculty
   * @returns {Promise<Array>} Array of assignments with populated student data
   */
  async getFacultyAssignments(facultyId) {
    try {
      const assignments = await StudentFacultyAssignment.getFacultyStudents(facultyId);
      return assignments;
    } catch (error) {
      console.error('Error in getFacultyAssignments:', error.message);
      throw error;
    }
  }

  /**
   * Remove all assignments for a user (cleanup when user is deactivated)
   * @param {string} userId - MongoDB ObjectId of the user
   * @param {string} userRole - Role of the user ('student' or 'faculty')
   * @returns {Promise<Object>} Summary of removed assignments
   */
  async removeAssignments(userId, userRole) {
    try {
      let query = {};
      
      if (userRole === 'student') {
        query.student = userId;
      } else if (userRole === 'faculty') {
        query.faculty = userId;
      } else {
        throw new Error('Invalid user role for assignment removal');
      }

      const result = await StudentFacultyAssignment.deactivateAssignments(query);
      
      console.log(`Removed ${result.modifiedCount} assignments for ${userRole} ${userId}`);
      
      return {
        userId,
        userRole,
        removedCount: result.modifiedCount
      };

    } catch (error) {
      console.error('Error in removeAssignments:', error.message);
      throw error;
    }
  }

  /**
   * Refresh assignments for a user (force update)
   * @param {string} userId - MongoDB ObjectId of the user
   * @param {string} userRole - Role of the user ('student' or 'faculty')
   * @returns {Promise<Object>} Summary of refresh operation
   */
  async refreshUserAssignments(userId, userRole) {
    try {
      if (userRole === 'student') {
        const assignments = await this.assignStudentToFaculty(userId);
        return {
          userId,
          userRole,
          assignmentsCount: assignments.length,
          assignments
        };
      } else if (userRole === 'faculty') {
        const result = await this.updateFacultyAssignments(userId);
        return {
          userId,
          userRole,
          ...result
        };
      } else {
        throw new Error('Invalid user role for assignment refresh');
      }
    } catch (error) {
      console.error('Error in refreshUserAssignments:', error.message);
      throw error;
    }
  }

  /**
   * Get assignment statistics for admin dashboard
   * @returns {Promise<Object>} Assignment statistics
   */
  async getAssignmentStatistics() {
    try {
      const [
        totalAssignments,
        assignmentsByDept,
        unassignedStudents,
        recentAssignments,
        totalStudents,
        totalFaculty
      ] = await Promise.all([
        StudentFacultyAssignment.countDocuments({ isActive: true }),
        StudentFacultyAssignment.getAssignmentStats(),
        StudentFacultyAssignment.getUnassignedStudents(),
        StudentFacultyAssignment.find({ isActive: true })
          .sort({ assignedAt: -1 })
          .limit(10)
          .populate('student', 'name email department academicYear')
          .populate('faculty', 'name email department'),
        User.countDocuments({ role: 'student', isActive: true }),
        User.countDocuments({ role: 'faculty', isActive: true })
      ]);

      // Calculate department breakdown
      const departmentBreakdown = {};
      assignmentsByDept.forEach(stat => {
        if (!departmentBreakdown[stat.department]) {
          departmentBreakdown[stat.department] = {
            students: 0,
            faculty: 0,
            assignments: 0
          };
        }
        departmentBreakdown[stat.department].students += stat.studentCount;
        departmentBreakdown[stat.department].faculty += stat.facultyCount;
        departmentBreakdown[stat.department].assignments += stat.totalAssignments;
      });

      // Calculate year breakdown
      const yearBreakdown = {};
      assignmentsByDept.forEach(stat => {
        if (!yearBreakdown[stat.academicYear]) {
          yearBreakdown[stat.academicYear] = {
            students: 0,
            assigned: 0,
            coverage: 0
          };
        }
        yearBreakdown[stat.academicYear].students += stat.studentCount;
        yearBreakdown[stat.academicYear].assigned += stat.studentCount;
      });

      // Calculate coverage for each year
      const studentsByYear = await User.aggregate([
        { $match: { role: 'student', isActive: true } },
        { $group: { _id: '$academicYear', count: { $sum: 1 } } }
      ]);
      
      studentsByYear.forEach(({ _id, count }) => {
        if (yearBreakdown[_id]) {
          yearBreakdown[_id].students = count;
          yearBreakdown[_id].coverage = Math.round((yearBreakdown[_id].assigned / count) * 100);
        } else {
          yearBreakdown[_id] = {
            students: count,
            assigned: 0,
            coverage: 0
          };
        }
      });

      // Calculate overall coverage
      const assignedStudents = totalAssignments;
      const coveragePercentage = totalStudents > 0 
        ? Math.round((assignedStudents / totalStudents) * 100) 
        : 0;

      // Format recent activity
      const recentActivity = recentAssignments.map(assignment => ({
        description: `${assignment.student?.name || 'Student'} assigned to ${assignment.faculty?.name || 'Faculty'}`,
        timestamp: assignment.assignedAt?.toLocaleString() || new Date().toLocaleString()
      }));

      return {
        totalAssignments,
        totalStudents,
        totalFaculty,
        assignedStudents,
        unassignedStudents: unassignedStudents.length,
        coveragePercentage,
        averageStudentsPerFaculty: totalFaculty > 0 ? Math.round(assignedStudents / totalFaculty) : 0,
        departmentBreakdown,
        yearBreakdown,
        recentActivity,
        activeAssignments: totalAssignments,
        inactiveAssignments: 0,
        activeFaculty: totalFaculty,
        inactiveFaculty: 0,
        systemHealth: coveragePercentage >= 80 ? 'Good' : 'Needs Attention',
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error in getAssignmentStatistics:', error.message);
      throw error;
    }
  }

  /**
   * Get faculty utilization statistics
   * @returns {Promise<Array>} Faculty utilization data
   */
  async getFacultyUtilizationStats() {
    try {
      const utilization = await User.aggregate([
        {
          $match: { role: 'faculty', isActive: true }
        },
        {
          $lookup: {
            from: 'studentfacultyassignments',
            localField: '_id',
            foreignField: 'faculty',
            as: 'assignments',
            pipeline: [
              { $match: { isActive: true } }
            ]
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            department: 1,
            accessibleYears: 1,
            assignmentCount: { $size: '$assignments' },
            assignments: {
              $map: {
                input: '$assignments',
                as: 'assignment',
                in: {
                  academicYear: '$$assignment.academicYear',
                  assignedAt: '$$assignment.assignedAt'
                }
              }
            }
          }
        },
        {
          $sort: { department: 1, name: 1 }
        }
      ]);

      return utilization;

    } catch (error) {
      console.error('Error in getFacultyUtilizationStats:', error.message);
      throw error;
    }
  }

  /**
   * Bulk refresh assignments for all users
   * Used for system maintenance or after major changes
   * @returns {Promise<Object>} Summary of bulk refresh operation
   */
  async bulkRefreshAssignments() {
    try {
      console.log('Starting bulk assignment refresh...');

      // Get all active students and faculty
      const [students, faculty] = await Promise.all([
        User.find({ role: 'student', isActive: true }).select('_id name department academicYear'),
        User.find({ role: 'faculty', isActive: true }).select('_id name department accessibleYears')
      ]);

      console.log(`Found ${students.length} students and ${faculty.length} faculty members`);

      // Deactivate all existing assignments
      await StudentFacultyAssignment.updateMany(
        { isActive: true },
        { isActive: false, lastUpdated: new Date() }
      );

      let totalAssignments = 0;
      const errors = [];

      // Recreate assignments for all students
      for (const student of students) {
        try {
          const assignments = await this.assignStudentToFaculty(student._id);
          totalAssignments += assignments.length;
        } catch (error) {
          errors.push({
            studentId: student._id,
            studentName: student.name,
            error: error.message
          });
        }
      }

      console.log(`Bulk refresh completed. Created ${totalAssignments} assignments with ${errors.length} errors`);

      return {
        studentsProcessed: students.length,
        facultyCount: faculty.length,
        totalAssignments,
        errorsCount: errors.length,
        errors: errors.slice(0, 10), // Limit errors in response
        completedAt: new Date()
      };

    } catch (error) {
      console.error('Error in bulkRefreshAssignments:', error.message);
      throw error;
    }
  }

  /**
   * Handle assignment errors gracefully during authentication flows
   * @param {Error} error - The assignment error
   * @param {string} context - Context where error occurred (login, profile_update, etc.)
   * @param {Object} user - User object for logging
   */
  handleAssignmentError(error, context, user) {
    const errorInfo = {
      context,
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    console.error(`Assignment error in ${context}:`, errorInfo);

    // In production, you might want to send this to a monitoring service
    // or store in a dedicated error log collection
    
    // For now, we just log and continue - assignment failures shouldn't
    // prevent successful authentication or profile updates
  }

  /**
   * Validate assignment integrity
   * Check for inconsistencies in assignments
   * @returns {Promise<Object>} Validation report
   */
  async validateAssignmentIntegrity() {
    try {
      const issues = [];

      // Find assignments with invalid student references
      const invalidStudentAssignments = await StudentFacultyAssignment.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'student',
            foreignField: '_id',
            as: 'studentData'
          }
        },
        {
          $match: {
            isActive: true,
            $or: [
              { studentData: { $size: 0 } },
              { 'studentData.role': { $ne: 'student' } },
              { 'studentData.isActive': false }
            ]
          }
        }
      ]);

      if (invalidStudentAssignments.length > 0) {
        issues.push({
          type: 'invalid_student_references',
          count: invalidStudentAssignments.length,
          assignments: invalidStudentAssignments.slice(0, 5)
        });
      }

      // Find assignments with invalid faculty references
      const invalidFacultyAssignments = await StudentFacultyAssignment.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'faculty',
            foreignField: '_id',
            as: 'facultyData'
          }
        },
        {
          $match: {
            isActive: true,
            $or: [
              { facultyData: { $size: 0 } },
              { 'facultyData.role': { $ne: 'faculty' } },
              { 'facultyData.isActive': false }
            ]
          }
        }
      ]);

      if (invalidFacultyAssignments.length > 0) {
        issues.push({
          type: 'invalid_faculty_references',
          count: invalidFacultyAssignments.length,
          assignments: invalidFacultyAssignments.slice(0, 5)
        });
      }

      // Find department mismatches
      const departmentMismatches = await StudentFacultyAssignment.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'student',
            foreignField: '_id',
            as: 'studentData'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'faculty',
            foreignField: '_id',
            as: 'facultyData'
          }
        },
        {
          $match: {
            isActive: true,
            $expr: {
              $ne: [
                { $arrayElemAt: ['$studentData.department', 0] },
                { $arrayElemAt: ['$facultyData.department', 0] }
              ]
            }
          }
        }
      ]);

      if (departmentMismatches.length > 0) {
        issues.push({
          type: 'department_mismatches',
          count: departmentMismatches.length,
          assignments: departmentMismatches.slice(0, 5)
        });
      }

      return {
        isValid: issues.length === 0,
        issuesCount: issues.length,
        issues,
        checkedAt: new Date()
      };

    } catch (error) {
      console.error('Error in validateAssignmentIntegrity:', error.message);
      throw error;
    }
  }
}

module.exports = new AssignmentService();