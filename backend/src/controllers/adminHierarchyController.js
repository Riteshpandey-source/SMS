const User = require('../models/User');
const StudentFacultyAssignment = require('../models/StudentFacultyAssignment');
const AcademicRecord = require('../models/AcademicRecord');

/**
 * Admin Hierarchy Controller
 * Handles faculty-student hierarchy endpoints for admin panel
 */

/**
 * Get all faculty with student counts, grouped by department
 * GET /api/admin/faculty-hierarchy
 * Query params: ?department=CSE&year=1
 * Access: Admin only
 */
const getFacultyHierarchy = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access faculty hierarchy',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { department, year } = req.query;

    // Build faculty query
    const facultyQuery = { 
      role: 'faculty', 
      isActive: true 
    };

    if (department) {
      facultyQuery.department = department;
    }

    if (year) {
      facultyQuery.accessibleYears = parseInt(year);
    }

    // Get all faculty members
    const faculty = await User.find(facultyQuery)
      .select('name email department accessibleYears avatar lastLogin')
      .sort({ department: 1, name: 1 })
      .lean();

    // Get student counts for each faculty
    const facultyWithCounts = await Promise.all(
      faculty.map(async (fac) => {
        const studentCount = await StudentFacultyAssignment.countDocuments({
          faculty: fac._id,
          isActive: true
        });

        return {
          id: fac._id,
          name: fac.name,
          email: fac.email,
          department: fac.department,
          accessibleYears: fac.accessibleYears,
          avatar: fac.avatar,
          lastLogin: fac.lastLogin,
          studentCount
        };
      })
    );

    // Group faculty by department
    const groupedByDepartment = {};
    facultyWithCounts.forEach(fac => {
      if (!groupedByDepartment[fac.department]) {
        groupedByDepartment[fac.department] = [];
      }
      groupedByDepartment[fac.department].push(fac);
    });

    res.json({
      success: true,
      data: {
        faculty: facultyWithCounts,
        groupedByDepartment,
        totalFaculty: facultyWithCounts.length,
        filters: {
          department: department || null,
          year: year ? parseInt(year) : null
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get faculty hierarchy error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FACULTY_HIERARCHY_ERROR',
        message: 'Failed to retrieve faculty hierarchy',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get students assigned to a specific faculty
 * GET /api/admin/faculty/:facultyId/students
 * Access: Admin only
 */
const getFacultyStudents = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access faculty students',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { facultyId } = req.params;

    // Verify faculty exists
    const faculty = await User.findOne({
      _id: facultyId,
      role: 'faculty',
      isActive: true
    }).select('name email department accessibleYears avatar');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FACULTY_NOT_FOUND',
          message: 'Faculty member not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get all assignments for this faculty
    const assignments = await StudentFacultyAssignment.find({
      faculty: facultyId,
      isActive: true
    })
      .populate('student', 'name email department academicYear avatar lastLogin')
      .sort({ academicYear: 1, 'student.name': 1 })
      .lean();

    // Format student data
    const students = assignments.map(assignment => ({
      id: assignment.student._id,
      name: assignment.student.name,
      email: assignment.student.email,
      department: assignment.student.department,
      academicYear: assignment.student.academicYear,
      avatar: assignment.student.avatar,
      lastLogin: assignment.student.lastLogin,
      assignedAt: assignment.assignedAt,
      assignmentId: assignment._id
    }));

    // Group students by academic year
    const groupedByYear = {};
    students.forEach(student => {
      if (!groupedByYear[student.academicYear]) {
        groupedByYear[student.academicYear] = [];
      }
      groupedByYear[student.academicYear].push(student);
    });

    res.json({
      success: true,
      data: {
        faculty: {
          id: faculty._id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
          accessibleYears: faculty.accessibleYears,
          avatar: faculty.avatar
        },
        students,
        groupedByYear,
        totalStudents: students.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get faculty students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FACULTY_STUDENTS_ERROR',
        message: 'Failed to retrieve faculty students',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get student details with academic records and parent information
 * GET /api/admin/students/:studentId/details
 * Access: Admin only
 */
const getStudentDetails = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access student details',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { studentId } = req.params;

    // Get student information
    const student = await User.findOne({
      _id: studentId,
      role: 'student',
      isActive: true
    }).select('name email department academicYear avatar lastLogin academicInfo parentEmails');

    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get academic records
    const academicRecord = await AcademicRecord.findOne({
      studentId: studentId
    }).lean();

    // Format academic data
    const academicData = academicRecord ? {
      midTermMarks: (academicRecord.midTermMarks || []).map(mark => ({
        subject: mark.subjectName || mark.subjectCode,
        marksObtained: mark.obtainedMarks,
        totalMarks: mark.maxMarks,
        grade: mark.grade || calculateGrade(mark.obtainedMarks, mark.maxMarks)
      })),
      endTermMarks: (academicRecord.finalMarks || []).map(mark => ({
        subject: mark.subjectName || mark.subjectCode,
        marksObtained: mark.totalMarks,
        totalMarks: mark.maxMarks,
        grade: mark.grade || calculateGrade(mark.totalMarks, mark.maxMarks)
      })),
      attendance: academicRecord.attendance && academicRecord.attendance.length > 0 ? {
        present: academicRecord.attendance.reduce((sum, att) => sum + att.attendedClasses, 0),
        total: academicRecord.attendance.reduce((sum, att) => sum + att.totalClasses, 0),
        percentage: academicRecord.overallAttendance || 0
      } : {
        present: 0,
        total: 0,
        percentage: 0
      }
    } : {
      midTermMarks: [],
      endTermMarks: [],
      attendance: {
        present: 0,
        total: 0,
        percentage: 0
      }
    };

    // Get parent information from student's parentEmails
    let parentInfo = {
      name: 'Not provided',
      email: 'Not provided',
      phone: 'Not provided',
      relationship: 'Parent/Guardian'
    };

    // Check if student has registered parents
    if (student.parentEmails && student.parentEmails.length > 0) {
      // Get the first registered parent
      const parentEmail = student.parentEmails[0];
      
      if (parentEmail.parentId) {
        // Fetch parent user details
        const parentUser = await User.findById(parentEmail.parentId)
          .select('name email')
          .lean();
        
        if (parentUser) {
          parentInfo = {
            name: parentUser.name,
            email: parentUser.email,
            phone: 'Not provided', // Phone not stored in User model
            relationship: 'Parent/Guardian',
            verified: parentEmail.verified
          };
        }
      } else {
        // Parent email exists but not registered yet
        parentInfo = {
          name: 'Not registered',
          email: parentEmail.email,
          phone: 'Not provided',
          relationship: 'Parent/Guardian',
          verified: parentEmail.verified
        };
      }
    }

    // Get assigned faculty
    const facultyAssignment = await StudentFacultyAssignment.findOne({
      student: studentId,
      isActive: true
    }).populate('faculty', 'name email department');

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          department: student.department,
          academicYear: student.academicYear,
          avatar: student.avatar,
          lastLogin: student.lastLogin
        },
        academicData,
        parentInfo,
        assignedFaculty: facultyAssignment ? {
          id: facultyAssignment.faculty._id,
          name: facultyAssignment.faculty.name,
          email: facultyAssignment.faculty.email,
          department: facultyAssignment.faculty.department
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get student details error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STUDENT_DETAILS_ERROR',
        message: 'Failed to retrieve student details',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Helper function to calculate grade based on marks
 */
function calculateGrade(obtained, total) {
  if (!obtained || !total || total === 0) return 'N/A';
  
  const percentage = (obtained / total) * 100;
  
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

module.exports = {
  getFacultyHierarchy,
  getFacultyStudents,
  getStudentDetails
};
