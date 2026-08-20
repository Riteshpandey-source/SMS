const assignmentService = require('../services/assignmentService');
const User = require('../models/User');
const StudentFacultyAssignment = require('../models/StudentFacultyAssignment');

/**
 * Assignment Controller
 * Handles HTTP endpoints for student-faculty assignment management
 */

/**
 * Get student's assigned faculty members
 * GET /api/assignments/my-faculty
 * Access: Students only
 */
const getMyFaculty = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Verify user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only students can access this endpoint',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get student's assigned faculty
    const assignments = await assignmentService.getStudentAssignments(studentId);
    
    // Format response data
    const facultyList = assignments.map(assignment => ({
      assignmentId: assignment._id,
      faculty: {
        id: assignment.faculty._id,
        name: assignment.faculty.name,
        email: assignment.faculty.email,
        department: assignment.faculty.department,
        accessibleYears: assignment.faculty.accessibleYears,
        avatar: assignment.faculty.avatar,
        lastLogin: assignment.faculty.lastLogin
      },
      assignedAt: assignment.assignedAt,
      academicYear: assignment.academicYear,
      department: assignment.department,
      assignmentSource: assignment.assignmentSource
    }));

    res.json({
      success: true,
      data: {
        facultyCount: facultyList.length,
        faculty: facultyList,
        studentInfo: {
          department: req.user.department,
          academicYear: req.user.academicYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get my faculty error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FACULTY_ERROR',
        message: 'Failed to retrieve assigned faculty',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get faculty's assigned students
 * GET /api/assignments/my-students
 * Access: Faculty only
 */
const getMyStudents = async (req, res) => {
  try {
    const facultyId = req.user._id;
    
    // Verify user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty can access this endpoint',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get faculty's assigned students
    const assignments = await assignmentService.getFacultyAssignments(facultyId);
    
    // Group students by academic year for better organization
    const studentsByYear = {};
    let totalStudents = 0;

    assignments.forEach(assignment => {
      const year = assignment.academicYear;
      if (!studentsByYear[year]) {
        studentsByYear[year] = [];
      }
      
      studentsByYear[year].push({
        assignmentId: assignment._id,
        student: {
          id: assignment.student._id,
          name: assignment.student.name,
          email: assignment.student.email,
          department: assignment.student.department,
          academicYear: assignment.student.academicYear,
          avatar: assignment.student.avatar,
          lastLogin: assignment.student.lastLogin
        },
        assignedAt: assignment.assignedAt,
        assignmentSource: assignment.assignmentSource
      });
      
      totalStudents++;
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        studentsByYear,
        facultyInfo: {
          department: req.user.department,
          accessibleYears: req.user.accessibleYears
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STUDENTS_ERROR',
        message: 'Failed to retrieve assigned students',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Refresh user's assignments
 * POST /api/assignments/refresh
 * Access: Students and Faculty
 */
const refreshAssignments = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    // Only students and faculty can refresh assignments
    if (!['student', 'faculty'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only students and faculty can refresh assignments',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Refresh assignments
    const result = await assignmentService.refreshUserAssignments(userId, userRole);
    
    res.json({
      success: true,
      data: {
        message: 'Assignments refreshed successfully',
        ...result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Refresh assignments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ASSIGNMENTS_ERROR',
        message: 'Failed to refresh assignments',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get assignment statistics
 * GET /api/assignments/stats
 * Access: Admin only
 */
const getAssignmentStats = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access assignment statistics',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get comprehensive assignment statistics
    const stats = await assignmentService.getAssignmentStatistics();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get assignment stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATS_ERROR',
        message: 'Failed to retrieve assignment statistics',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get unassigned students
 * GET /api/assignments/unassigned
 * Access: Admin only
 */
const getUnassignedStudents = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access unassigned students data',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get unassigned students
    const unassignedStudents = await StudentFacultyAssignment.getUnassignedStudents();
    
    // Group by department and year for better organization
    const groupedStudents = {};
    unassignedStudents.forEach(student => {
      const key = `${student.department}-Year${student.academicYear}`;
      if (!groupedStudents[key]) {
        groupedStudents[key] = {
          department: student.department,
          academicYear: student.academicYear,
          students: []
        };
      }
      groupedStudents[key].students.push({
        id: student._id,
        name: student.name,
        email: student.email
      });
    });

    res.json({
      success: true,
      data: {
        totalUnassigned: unassignedStudents.length,
        unassignedByGroup: Object.values(groupedStudents),
        unassignedStudents: unassignedStudents.map(student => ({
          id: student._id,
          name: student.name,
          email: student.email,
          department: student.department,
          academicYear: student.academicYear
        }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get unassigned students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_UNASSIGNED_ERROR',
        message: 'Failed to retrieve unassigned students',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get assignment details by ID
 * GET /api/assignments/:id
 * Access: Students, Faculty, Admin
 */
const getAssignmentById = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Find the assignment
    const assignment = await StudentFacultyAssignment.findById(assignmentId)
      .populate('student', 'name email department academicYear avatar')
      .populate('faculty', 'name email department accessibleYears avatar');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_NOT_FOUND',
          message: 'Assignment not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check access permissions
    const hasAccess = userRole === 'admin' || 
                     (userRole === 'student' && assignment.student._id.equals(userId)) ||
                     (userRole === 'faculty' && assignment.faculty._id.equals(userId));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to view this assignment',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: {
        assignment: {
          id: assignment._id,
          student: assignment.student,
          faculty: assignment.faculty,
          academicYear: assignment.academicYear,
          department: assignment.department,
          assignedAt: assignment.assignedAt,
          isActive: assignment.isActive,
          assignmentSource: assignment.assignmentSource,
          lastUpdated: assignment.lastUpdated,
          notes: assignment.notes
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get assignment by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ASSIGNMENT_ERROR',
        message: 'Failed to retrieve assignment details',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Bulk refresh all assignments
 * POST /api/assignments/bulk-refresh
 * Access: Admin only
 */
const bulkRefreshAssignments = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can perform bulk assignment refresh',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Perform bulk refresh
    const result = await assignmentService.bulkRefreshAssignments();
    
    res.json({
      success: true,
      data: {
        message: 'Bulk assignment refresh completed',
        ...result
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk refresh assignments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_REFRESH_ERROR',
        message: 'Failed to perform bulk assignment refresh',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Validate assignment integrity
 * GET /api/assignments/validate
 * Access: Admin only
 */
const validateAssignments = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can validate assignment integrity',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate assignment integrity
    const validationResult = await assignmentService.validateAssignmentIntegrity();
    
    res.json({
      success: true,
      data: validationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Validate assignments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate assignment integrity',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get all active/inactive assignments (admin only)
 * GET /api/assignments
 */
const getAllAssignments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can access all assignments',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { department, academicYear, search } = req.query;
    const query = {};

    if (req.user.department && req.user.department !== 'Administration') {
      query.department = req.user.department;
    } else if (department && department !== 'all') {
      query.department = department;
    }

    if (academicYear && academicYear !== 'all') {
      query.academicYear = parseInt(academicYear);
    }

    let assignments = await StudentFacultyAssignment.find(query)
      .populate('student', 'name email department academicYear avatar')
      .populate('faculty', 'name email department accessibleYears avatar')
      .sort({ assignedAt: -1 });

    if (search) {
      const searchLower = search.toLowerCase();
      assignments = assignments.filter(a =>
        a.student?.name?.toLowerCase().includes(searchLower) ||
        a.student?.email?.toLowerCase().includes(searchLower) ||
        a.faculty?.name?.toLowerCase().includes(searchLower) ||
        a.faculty?.email?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('Get all assignments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ASSIGNMENTS_ERROR',
        message: 'Failed to retrieve assignments',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Create new manual assignment (admin only)
 * POST /api/assignments
 */
const createAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can create assignments',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { studentId, facultyId, assignmentSource = 'manual', notes } = req.body;

    if (!studentId || !facultyId) {
      return res.status(400).json({
        success: false,
        message: 'Student and Faculty IDs are required'
      });
    }

    // Check if active assignment already exists
    const existing = await StudentFacultyAssignment.findOne({
      student: studentId,
      faculty: facultyId,
      isActive: true
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An active assignment already exists between this student and faculty member'
      });
    }

    const newAssignment = new StudentFacultyAssignment({
      student: studentId,
      faculty: facultyId,
      assignmentSource,
      assignedBy: req.user._id,
      notes
    });

    await newAssignment.save();

    const populatedAssignment = await StudentFacultyAssignment.findById(newAssignment._id)
      .populate('student', 'name email department academicYear avatar')
      .populate('faculty', 'name email department accessibleYears avatar');

    // Create AuditLog entry
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userRole: req.user.role,
        action: `Created manual assignment: Student ${populatedAssignment.student?.name} -> Faculty ${populatedAssignment.faculty?.name}`,
        method: 'POST',
        url: req.originalUrl,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        statusCode: 201,
        auditType: 'CREATION',
        success: true,
        resourceType: 'other',
        metadata: { studentId, facultyId }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for assignment creation:', auditError);
    }

    res.status(201).json({
      success: true,
      assignment: populatedAssignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ASSIGNMENT_ERROR',
        message: 'Failed to create assignment',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Update assignment (admin only)
 * PUT /api/assignments/:id
 */
const updateAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can update assignments',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;
    const { isActive, notes } = req.body;

    const assignment = await StudentFacultyAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    if (isActive !== undefined) assignment.isActive = isActive;
    if (notes !== undefined) assignment.notes = notes;
    assignment.lastUpdated = new Date();

    await assignment.save();

    const populated = await StudentFacultyAssignment.findById(id)
      .populate('student', 'name email department academicYear avatar')
      .populate('faculty', 'name email department accessibleYears avatar');

    res.json({
      success: true,
      assignment: populated
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ASSIGNMENT_ERROR',
        message: 'Failed to update assignment',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Delete assignment (admin only)
 * DELETE /api/assignments/:id
 */
const deleteAssignment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can delete assignments',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;

    const assignment = await StudentFacultyAssignment.findById(id)
      .populate('student', 'name')
      .populate('faculty', 'name');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const studentName = assignment.student?.name || 'Unknown Student';
    const facultyName = assignment.faculty?.name || 'Unknown Faculty';

    await StudentFacultyAssignment.findByIdAndDelete(id);

    // Create AuditLog entry
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        userId: req.user._id,
        userRole: req.user.role,
        action: `Deleted assignment: Student ${studentName} -> Faculty ${facultyName}`,
        method: 'DELETE',
        url: req.originalUrl,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        statusCode: 200,
        auditType: 'DELETION',
        success: true,
        resourceType: 'other',
        metadata: { studentName, facultyName }
      });
    } catch (auditError) {
      console.error('Failed to create audit log for assignment deletion:', auditError);
    }

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ASSIGNMENT_ERROR',
        message: 'Failed to delete assignment',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Bulk assign by department (admin only)
 * POST /api/assignments/bulk-assign-department
 */
const bulkAssignByDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can perform bulk assignment',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { department } = req.body;
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department is required'
      });
    }

    console.log(`Starting bulk assignment for department: ${department}`);

    // Get all active students in this department
    const students = await User.find({
      role: 'student',
      department,
      isActive: true
    }).select('_id name');

    let totalAssignments = 0;
    const errors = [];

    for (const student of students) {
      try {
        const assignments = await assignmentService.assignStudentToFaculty(student._id);
        totalAssignments += assignments.length;
      } catch (error) {
        errors.push({
          studentId: student._id,
          studentName: student.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk assignment for department ${department} completed`,
      studentsProcessed: students.length,
      totalAssignments,
      errorsCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('Bulk assign by department error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_ASSIGN_DEPT_ERROR',
        message: 'Failed to perform bulk assignment by department',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Get assignment audit logs (admin only)
 * GET /api/assignments/audit-logs
 */
const getAssignmentAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can view audit logs',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = {
      action: { $regex: /assignment/i }
    };

    const total = await require('../models/AuditLog').countDocuments(query);
    const populatedLogs = await require('../models/AuditLog').find(query)
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const finalLogs = populatedLogs.map(log => ({
      id: log._id,
      action: log.auditType === 'CREATION' ? 'CREATE_ASSIGNMENT' :
              log.auditType === 'DELETION' ? 'DELETE_ASSIGNMENT' : 'UPDATE_ASSIGNMENT',
      details: log.action,
      performedBy: log.userId?.name || 'System',
      timestamp: log.createdAt.toISOString(),
      metadata: log.metadata
    }));

    res.json({
      success: true,
      logs: finalLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get assignment audit logs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_AUDIT_LOGS_ERROR',
        message: 'Failed to retrieve assignment audit logs',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getMyFaculty,
  getMyStudents,
  refreshAssignments,
  getAssignmentStats,
  getUnassignedStudents,
  getAssignmentById,
  bulkRefreshAssignments,
  validateAssignments,
  getAllAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  bulkAssignByDepartment,
  getAssignmentAuditLogs
};