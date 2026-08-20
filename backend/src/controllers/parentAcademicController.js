const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');
const DailyAttendance = require('../models/DailyAttendance');
const ExamMark = require('../models/ExamMark');

// Get child's academic records (for parents)
const getChildAcademicRecords = async (req, res) => {
  try {
    const parent = req.user;
    const { academicYear } = req.query;

    // Verify parent role
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This endpoint is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get child ID from parent's record
    const child = await resolveChild(parent);
    const childId = child?._id;

    // Build query
    const query = { studentId: childId };
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query)
      .populate('studentId', 'name email department academicYear')
      .sort({ academicYear: -1, semester: -1 });

    res.json({
      success: true,
      data: {
        records,
        total: records.length,
        child: records.length > 0 ? records[0].studentId : child
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get child academic records error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CHILD_ACADEMIC_RECORDS_ERROR',
        message: 'Failed to retrieve child academic records',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get child's attendance (for parents)
const getChildAttendance = async (req, res) => {
  try {
    const parent = req.user;
    const { academicYear, subjectCode } = req.query;

    // Verify parent role
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This endpoint is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const child = await resolveChild(parent);
    if (!child) {
      return res.json({
        success: true,
        data: {
          attendance: [],
          summary: [],
          overallAttendance: 0,
          isDebarred: false,
          debarredSubjects: [],
          child: null
        },
        timestamp: new Date().toISOString()
      });
    }

    const filters = {
      department: child.department,
      academicYear: academicYear ? parseInt(academicYear) : child.academicYear,
      subjectCode: subjectCode ? subjectCode.toUpperCase() : undefined
    };

    const attendanceRecords = await DailyAttendance.getStudentAttendance(child._id, filters);
    const attendanceSummary = await DailyAttendance.getStudentAttendanceSummary(child._id, filters);

    const overallAttendance =
      attendanceSummary && attendanceSummary.length
        ? Math.round(
            (attendanceSummary.reduce((sum, s) => sum + (s.attendancePercentage || 0), 0) /
              attendanceSummary.length) *
              100,
          ) / 100
        : 0;

    res.json({
      success: true,
      data: {
        attendance: attendanceRecords,
        summary: attendanceSummary,
        overallAttendance,
        isDebarred: (attendanceSummary || []).some((s) => s.isDebarred),
        debarredSubjects: (attendanceSummary || []).filter((s) => s.isDebarred).map((s) => s.subjectCode),
        child,
        academicYear: filters.academicYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get child attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CHILD_ATTENDANCE_ERROR',
        message: 'Failed to retrieve child attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get child's marks (for parents)
const getChildMarks = async (req, res) => {
  try {
    const parent = req.user;
    const { academicYear, semester } = req.query;

    // Verify parent role
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This endpoint is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const child = await resolveChild(parent);
    if (!child) {
      return res.json({
        success: true,
        data: {
          marks: [],
          total: 0,
          child: null
        },
        timestamp: new Date().toISOString()
      });
    }

    const query = { studentId: child._id };
    if (academicYear) query.academicYear = parseInt(academicYear);

    const marks = await ExamMark.find({ studentId: child._id })
      .select('subjectCode subjectName assessmentType examDate maxMarks obtainedMarks')
      .sort({ examDate: -1 });

    res.json({
      success: true,
      data: {
        marks,
        total: marks.length,
        child,
        academicYear: academicYear ? parseInt(academicYear) : child.academicYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get child marks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CHILD_MARKS_ERROR',
        message: 'Failed to retrieve child marks',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get child's performance metrics (for parents)
const getChildPerformance = async (req, res) => {
  try {
    const parent = req.user;
    const { academicYear, semester } = req.query;

    // Verify parent role
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This endpoint is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get child ID from parent's record
    const child = await resolveChild(parent);
    if (!child) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CHILD_NOT_FOUND',
          message: 'Child account not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const attFilters = {
      department: child.department,
      academicYear: academicYear ? parseInt(academicYear) : child.academicYear
    };
    const attendanceSummary = await DailyAttendance.getStudentAttendanceSummary(child._id, attFilters);
    const attendanceRecords = await DailyAttendance.getStudentAttendance(child._id, attFilters);

    const marks = await ExamMark.find({ studentId: child._id })
      .select('subjectCode subjectName assessmentType examDate maxMarks obtainedMarks')
      .sort({ examDate: -1 });

    const totalMarksObtained = marks.reduce((sum, m) => sum + (m.obtainedMarks || 0), 0);
    const totalMaxMarks = marks.reduce((sum, m) => sum + (m.maxMarks || 100), 0);
    const averageMarks = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 10000) / 100 : 0;
    const overallAttendance =
      attendanceSummary && attendanceSummary.length
        ? Math.round(
            (attendanceSummary.reduce((sum, s) => sum + (s.attendancePercentage || 0), 0) /
              attendanceSummary.length) *
              100,
          ) / 100
        : 0;

    res.json({
      success: true,
      data: {
        child: {
          id: child._id,
          name: child.name,
          email: child.email,
          department: child.department,
          academicYear: child.academicYear
        },
        performance: {
          overallAttendance,
          isDebarred: (attendanceSummary || []).some((s) => s.isDebarred),
          debarredSubjects: (attendanceSummary || []).filter((s) => s.isDebarred).map((s) => s.subjectCode),
          totalSubjects: attendanceSummary.length,
          averageMarks,
          totalMarks: marks.length,
          gradeDistribution: {} // not computed for now
        },
        attendance: attendanceSummary,
        marks: marks.map((mark) => ({
          subjectCode: mark.subjectCode,
          subjectName: mark.subjectName,
          obtainedMarks: mark.obtainedMarks,
          maxMarks: mark.maxMarks || 100,
          assessmentType: mark.assessmentType,
          examDate: mark.examDate,
          percentage: Math.round((mark.obtainedMarks / (mark.maxMarks || 100)) * 10000) / 100
        })),
        academicYear: attFilters.academicYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get child performance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_CHILD_PERFORMANCE_ERROR',
        message: 'Failed to retrieve child performance metrics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get parent's access logs (for transparency)
const getParentAccessLogs = async (req, res) => {
  try {
    const parent = req.user;
    const { limit = 50, skip = 0 } = req.query;

    // Verify parent role
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This endpoint is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const AuditLog = require('../models/AuditLog');
    
    // Get parent's access logs
    const logs = await AuditLog.getParentAccessLogs(
      parent._id,
      parseInt(limit),
      parseInt(skip)
    );

    // Get total count
    const total = await AuditLog.countDocuments({
      userId: parent._id,
      userRole: 'parent'
    });

    res.json({
      success: true,
      data: {
        logs,
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get parent access logs error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PARENT_ACCESS_LOGS_ERROR',
        message: 'Failed to retrieve access logs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getChildAcademicRecords,
  getChildAttendance,
  getChildMarks,
  getChildPerformance,
  getParentAccessLogs
};
const resolveChild = async (parent) => {
  if (parent.childId) {
    return User.findById(parent.childId).lean();
  }
  // fallback: first active student in same department
  if (parent.department) {
    return User.findOne({ role: 'student', department: parent.department, isActive: true }).lean();
  }
  return null;
};
