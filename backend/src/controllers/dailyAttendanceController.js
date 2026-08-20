const DailyAttendance = require('../models/DailyAttendance');
const User = require('../models/User');
const StudentFacultyAssignment = require('../models/StudentFacultyAssignment');
const { formatUserForPrivate } = require('../utils/userUtils');

const normalizeFacultySubject = (subject = {}) => ({
  subjectCode: (subject.subjectCode || '').toUpperCase().trim(),
  subjectName: (subject.subjectName || '').trim(),
  academicYears: [...new Set((subject.academicYears || []).map(Number).filter(year => year >= 1 && year <= 4))].sort((a, b) => a - b),
  isActive: subject.isActive !== false
});

const generateAttendanceSubjectCode = (subjectName = '') => {
  const normalized = subjectName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!normalized.length) {
    return '';
  }

  if (normalized.length === 1) {
    return normalized[0].slice(0, 6);
  }

  return normalized.map(word => word[0]).join('').slice(0, 6);
};

const getFacultyAttendanceAccessConfig = async (facultyUser) => {
  const faculty = await User.findById(facultyUser._id)
    .select('name department accessibleYears accessibleSubjects')
    .lean();

  if (!faculty) {
    throw new Error('Faculty not found');
  }

  const assignments = await StudentFacultyAssignment.find({
    faculty: facultyUser._id,
    isActive: true
  })
    .populate('student', 'name email department academicYear rollNumber')
    .lean();

  let studentsByYear = assignments.reduce((acc, assignment) => {
    if (!assignment.student) return acc;
    const year = assignment.student.academicYear;
    if (!acc[year]) {
      acc[year] = [];
    }

      acc[year].push({
        id: assignment.student._id,
        name: assignment.student.name,
        email: assignment.student.email,
        department: assignment.student.department,
        academicYear: assignment.student.academicYear,
        rollNumber: assignment.student.rollNumber,
        assignmentId: assignment._id
      });

    return acc;
  }, {});

  // Always merge in fallback students for accessible years to ensure full roster is available
  if (faculty.accessibleYears?.length) {
    const fallbackStudents = await User.find({
      role: 'student',
      department: faculty.department,
      academicYear: { $in: faculty.accessibleYears },
      isActive: true
    })
      .select('name email department academicYear rollNumber')
      .lean();

    fallbackStudents.forEach((student) => {
      const year = student.academicYear;
      if (!studentsByYear[year]) {
        studentsByYear[year] = [];
      }
      const exists = studentsByYear[year].some((s) => s.id?.toString() === student._id.toString());
      if (!exists) {
        studentsByYear[year].push({
          id: student._id,
          name: student.name,
          email: student.email,
          department: student.department,
          academicYear: student.academicYear,
          rollNumber: student.rollNumber,
          assignmentId: null
        });
      }
    });
  }

  Object.keys(studentsByYear).forEach((year) => {
    studentsByYear[year].sort((a, b) => a.name.localeCompare(b.name));
  });

  return {
    faculty: {
      id: faculty._id,
      name: faculty.name,
      department: faculty.department,
      accessibleYears: faculty.accessibleYears || [],
      accessibleSubjects: (faculty.accessibleSubjects || [])
        .map(normalizeFacultySubject)
        .filter(subject => subject.subjectCode && subject.subjectName && subject.isActive)
    },
    studentsByYear,
    studentCountsByYear: Object.fromEntries(
      Object.entries(studentsByYear).map(([year, students]) => [year, students.length])
    )
  };
};

// Create new daily attendance session
const createAttendanceSession = async (req, res) => {
  try {
    const {
      date,
      subjectId,
      subjectCode,
      subjectName,
      department,
      academicYear,
      semester,
      classStartTime,
      classEndTime,
      classType,
      location,
      studentIds
    } = req.body;

    const resolvedSubjectName = (subjectName || '').trim();
    const resolvedSubjectCode = (subjectCode || generateAttendanceSubjectCode(resolvedSubjectName)).toUpperCase().trim();

    // Only faculty and admin can create attendance sessions
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can create attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate required fields
    if (!date || !resolvedSubjectName || !resolvedSubjectCode || !classStartTime || !classEndTime) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Date, subject information, and class timings are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if attendance already exists for this date, subject, and time (scoped to faculty)
    const duplicateFilter = {
      date: new Date(date),
      classStartTime,
      facultyId: req.user._id
    };

    if (subjectId) {
      duplicateFilter.subjectId = subjectId;
    } else {
      duplicateFilter.subjectCode = resolvedSubjectCode;
    }

    const existingAttendance = await DailyAttendance.findOne(duplicateFilter);

    if (existingAttendance) {
      // Return the existing session instead of blocking, so UI can open it
      return res.json({
        success: true,
        message: 'Attendance session already exists; using existing session.',
        data: {
          attendanceSession: {
            id: existingAttendance._id,
            date: existingAttendance.date,
            subjectCode: existingAttendance.subjectCode,
            subjectName: existingAttendance.subjectName,
            classStartTime: existingAttendance.classStartTime,
            classEndTime: existingAttendance.classEndTime,
            totalStudents: existingAttendance.totalStudents,
            presentCount: existingAttendance.presentCount,
            absentCount: existingAttendance.absentCount,
            attendancePercentage: existingAttendance.attendancePercentage,
            status: existingAttendance.status,
            classType: existingAttendance.classType,
            location: existingAttendance.location
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    let resolvedAcademicYear = academicYear ? Number(academicYear) : undefined;
    let resolvedDepartment = department || req.user.department;
    let students = [];

    if (req.user.role === 'faculty') {
      const accessConfig = await getFacultyAttendanceAccessConfig(req.user);
      const facultyYears = accessConfig.faculty.accessibleYears || [];
      const facultySubjects = accessConfig.faculty.accessibleSubjects || [];

      if (!resolvedAcademicYear) {
        resolvedAcademicYear = facultyYears[0];
      }

      if (!resolvedAcademicYear || !facultyYears.includes(resolvedAcademicYear)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: 'Admin has not granted this academic year to the faculty',
            timestamp: new Date().toISOString()
          }
        });
      }

      const matchedSubject = facultySubjects.find(subject =>
        subject.subjectCode === resolvedSubjectCode &&
        subject.academicYears.includes(resolvedAcademicYear)
      );

      if (!matchedSubject) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'SUBJECT_ACCESS_DENIED',
            message: 'Admin has not granted this subject to the faculty for the selected year',
            timestamp: new Date().toISOString()
          }
        });
      }

      students = accessConfig.studentsByYear[resolvedAcademicYear] || [];
      if (!students.length) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_ASSIGNED_STUDENTS',
            message: 'No registered students are assigned to this faculty for the selected year',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Get students for the attendance session
    if (studentIds && studentIds.length > 0) {
      // Use provided student IDs
      students = await User.find({
        _id: { $in: studentIds },
        role: 'student',
        isActive: true
      }).select('name email department academicYear rollNumber');
    } else {
      // Auto-fetch students based on department and academic year
      if (req.user.role === 'admin') {
        students = await User.find({
          role: 'student',
          department: resolvedDepartment,
          academicYear: resolvedAcademicYear || req.user.accessibleYears?.[0],
          isActive: true
        }).select('name email department academicYear rollNumber');
      }
    }

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_STUDENTS_FOUND',
          message: 'No students found for the specified criteria',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create student attendance records (all present by default)
    const studentAttendance = students.map(student => ({
      studentId: student._id || student.id || null,
      studentName: student.name,
      studentEmail: student.email,
      rollNumber: student.rollNumber || '',
      isPresent: true, // Default present
      markedBy: req.user._id,
      remarks: ''
    }));

    // Create attendance session
    const attendanceSession = new DailyAttendance({
      tenantId: req.user.tenantId,
      date: new Date(date),
      subjectId: subjectId || `${resolvedSubjectCode}-${resolvedAcademicYear || 'GEN'}`,
      subjectCode: resolvedSubjectCode,
      subjectName: resolvedSubjectName,
      facultyId: req.user._id,
      facultyName: req.user.name,
      department: resolvedDepartment,
      academicYear: resolvedAcademicYear || req.user.accessibleYears?.[0],
      semester: semester || 'current',
      classStartTime,
      classEndTime,
      studentAttendance,
      classType: classType || 'lecture',
      location: location || '',
      status: 'draft',
      lastModifiedBy: req.user._id
    });

    await attendanceSession.save();

    res.status(201).json({
      success: true,
      message: 'Attendance session created successfully',
      data: {
        attendanceSession: {
          id: attendanceSession._id,
          date: attendanceSession.date,
          subjectCode: attendanceSession.subjectCode,
          subjectName: attendanceSession.subjectName,
          classStartTime: attendanceSession.classStartTime,
          classEndTime: attendanceSession.classEndTime,
          totalStudents: attendanceSession.totalStudents,
          presentCount: attendanceSession.presentCount,
          absentCount: attendanceSession.absentCount,
          attendancePercentage: attendanceSession.attendancePercentage,
          status: attendanceSession.status,
          classType: attendanceSession.classType,
          location: attendanceSession.location
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Handle duplicate key from Mongo unique index (date+subjectId+classStartTime)
    if (error?.code === 11000) {
      try {
        const existing = await DailyAttendance.findOne({
          date: new Date(req.body.date),
          subjectId: req.body.subjectId || (req.body.subjectCode || '').toUpperCase().trim(),
          classStartTime: req.body.classStartTime,
          facultyId: req.user._id
        });

        if (existing) {
          return res.json({
            success: true,
            message: 'Attendance session already exists; using existing session (unique index hit).',
            data: {
              attendanceSession: {
                id: existing._id,
                date: existing.date,
                subjectCode: existing.subjectCode,
                subjectName: existing.subjectName,
                classStartTime: existing.classStartTime,
                classEndTime: existing.classEndTime,
                totalStudents: existing.totalStudents,
                presentCount: existing.presentCount,
                absentCount: existing.absentCount,
                attendancePercentage: existing.attendancePercentage,
                status: existing.status,
                classType: existing.classType,
                location: existing.location
              }
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (lookupError) {
        console.error('Duplicate key lookup failed:', lookupError);
      }
    }

    console.error('Create attendance session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_ATTENDANCE_ERROR',
        message: error.message || 'Failed to create attendance session',
        details: {
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get attendance session details
const getAttendanceSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const attendanceSession = await DailyAttendance.findById(sessionId)
      .populate('facultyId', 'name email')
      .populate('studentAttendance.studentId', 'name email department academicYear rollNumber')
      .populate('studentAttendance.markedBy', 'name');

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_SESSION_NOT_FOUND',
          message: 'Attendance session not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.user.role === 'faculty' && attendanceSession.facultyId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only view your own attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Auto-heal missing students in session for faculty: merge assigned roster for that year
    if (req.user.role === 'faculty') {
      const accessConfig = await getFacultyAttendanceAccessConfig(req.user);
      const expectedStudents = accessConfig.studentsByYear[attendanceSession.academicYear] || [];
      if (expectedStudents.length) {
        const existingKeys = new Set(
          (attendanceSession.studentAttendance || []).map((s) =>
            s.studentId ? s.studentId.toString() : (s.studentEmail || '').toLowerCase()
          )
        );
        let added = 0;
        expectedStudents.forEach((stu) => {
          const key = stu.id ? stu.id.toString() : (stu.email || '').toLowerCase();
          if (!existingKeys.has(key)) {
            attendanceSession.studentAttendance.push({
              studentId: stu.id || null,
              studentName: stu.name,
              studentEmail: stu.email || '',
              rollNumber: stu.rollNumber || '',
              isGuest: false,
              isPresent: true,
              markedBy: req.user._id
            });
            added += 1;
          }
        });
        if (added > 0) {
          await attendanceSession.save();
        }
      }
    }

    // Check access permissions
    if (req.user.role === 'student') {
      // Students can only see their own attendance
      const studentRecord = attendanceSession.studentAttendance.find(
        s => s.studentId._id.toString() === req.user._id.toString()
      );
      
      if (!studentRecord) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only view your own attendance',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Return limited data for students
      return res.json({
        success: true,
        data: {
          attendanceSession: {
            id: attendanceSession._id,
            date: attendanceSession.date,
            subjectCode: attendanceSession.subjectCode,
            subjectName: attendanceSession.subjectName,
            facultyName: attendanceSession.facultyName,
            classStartTime: attendanceSession.classStartTime,
            classEndTime: attendanceSession.classEndTime,
            classType: attendanceSession.classType,
            location: attendanceSession.location,
            myAttendance: {
              isPresent: studentRecord.isPresent,
              markedAt: studentRecord.markedAt,
              remarks: studentRecord.remarks
            }
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Faculty and admin can see full details
    res.json({
      success: true,
      data: {
        attendanceSession
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get attendance session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ATTENDANCE_ERROR',
        message: 'Failed to retrieve attendance session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update student attendance in a session
const updateStudentAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId, isPresent, remarks } = req.body;

    // Only faculty and admin can update attendance
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can update attendance',
          timestamp: new Date().toISOString()
        }
      });
    }

    const attendanceSession = await DailyAttendance.findById(sessionId);

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_SESSION_NOT_FOUND',
          message: 'Attendance session not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.user.role === 'faculty' && attendanceSession.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only update your own attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if session is locked
    if (attendanceSession.status === 'locked') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ATTENDANCE_LOCKED',
          message: 'Cannot modify locked attendance session',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update student attendance
    await attendanceSession.markStudentAttendance(studentId, isPresent, req.user._id, remarks);

    res.json({
      success: true,
      message: 'Student attendance updated successfully',
      data: {
        sessionId: attendanceSession._id,
        studentId,
        isPresent,
        totalStudents: attendanceSession.totalStudents,
        presentCount: attendanceSession.presentCount,
        absentCount: attendanceSession.absentCount,
        attendancePercentage: attendanceSession.attendancePercentage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update student attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ATTENDANCE_ERROR',
        message: 'Failed to update student attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Bulk update attendance for multiple students
const bulkUpdateAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { attendanceData } = req.body; // Array of { studentId, isPresent, remarks }

    // Only faculty and admin can bulk update attendance
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can bulk update attendance',
          timestamp: new Date().toISOString()
        }
      });
    }

    const attendanceSession = await DailyAttendance.findById(sessionId);

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_SESSION_NOT_FOUND',
          message: 'Attendance session not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.user.role === 'faculty' && attendanceSession.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only update your own attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if session is locked
    if (attendanceSession.status === 'locked') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ATTENDANCE_LOCKED',
          message: 'Cannot modify locked attendance session',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Bulk update attendance
    await attendanceSession.bulkMarkAttendance(attendanceData, req.user._id);

    res.json({
      success: true,
      message: 'Bulk attendance update completed successfully',
      data: {
        sessionId: attendanceSession._id,
        updatedCount: attendanceData.length,
        totalStudents: attendanceSession.totalStudents,
        presentCount: attendanceSession.presentCount,
        absentCount: attendanceSession.absentCount,
        attendancePercentage: attendanceSession.attendancePercentage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk update attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_UPDATE_ATTENDANCE_ERROR',
        message: 'Failed to bulk update attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Submit attendance session
const submitAttendanceSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Only faculty and admin can submit attendance
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can submit attendance',
          timestamp: new Date().toISOString()
        }
      });
    }

    const attendanceSession = await DailyAttendance.findById(sessionId);

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_SESSION_NOT_FOUND',
          message: 'Attendance session not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.user.role === 'faculty' && attendanceSession.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only submit your own attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Submit attendance
    await attendanceSession.submitAttendance(req.user._id);

    res.json({
      success: true,
      message: 'Attendance session submitted successfully',
      data: {
        sessionId: attendanceSession._id,
        status: attendanceSession.status,
        submittedAt: attendanceSession.submittedAt
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Submit attendance session error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SUBMIT_ATTENDANCE_ERROR',
        message: 'Failed to submit attendance session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get faculty attendance sessions
const getFacultyAttendanceSessions = async (req, res) => {
  try {
    const { startDate, endDate, subjectCode, status } = req.query;
    const facultyId = req.user.role === 'admin' ? req.query.facultyId : req.user._id;

    const filters = { facultyId };
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    if (subjectCode) filters.subjectCode = subjectCode;
    if (status) filters.status = status;

    if (req.user.role === 'faculty') {
      const accessConfig = await getFacultyAttendanceAccessConfig(req.user);
      filters.academicYears = accessConfig.faculty.accessibleYears || [];
      filters.subjectCodes = (accessConfig.faculty.accessibleSubjects || []).map(subject => subject.subjectCode);
    }

    const sessions = await DailyAttendance.getFacultyAttendanceRecords(facultyId, filters);

    res.json({
      success: true,
      data: {
        sessions,
        total: sessions.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get faculty attendance sessions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FACULTY_SESSIONS_ERROR',
        message: 'Failed to retrieve faculty attendance sessions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

const getFacultyAttendanceAccess = async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can view attendance access configuration',
          timestamp: new Date().toISOString()
        }
      });
    }

    const facultyId = req.user.role === 'admin' && req.query.facultyId ? req.query.facultyId : req.user._id;
    const config = await getFacultyAttendanceAccessConfig({ _id: facultyId });

    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get faculty attendance access error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FACULTY_ATTENDANCE_ACCESS_ERROR',
        message: 'Failed to retrieve faculty attendance access',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

const getFacultySubjectSummary = async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can view attendance summary',
          timestamp: new Date().toISOString()
        }
      });
    }

    const facultyId = req.user.role === 'admin' && req.query.facultyId ? req.query.facultyId : req.user._id;
    const filters = {};
    if (req.query.academicYear) filters.academicYear = parseInt(req.query.academicYear, 10);
    if (req.query.subjectCode) filters.subjectCode = req.query.subjectCode;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;

    if (req.user.role === 'faculty') {
      const accessConfig = await getFacultyAttendanceAccessConfig(req.user);
      const allowedSubjectCodes = (accessConfig.faculty.accessibleSubjects || []).map(subject => subject.subjectCode);

      if (filters.subjectCode && !allowedSubjectCodes.includes(filters.subjectCode.toUpperCase())) {
        return res.json({
          success: true,
          data: {
            subjects: []
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    const summary = await DailyAttendance.getFacultySubjectSummary(facultyId, filters);

    res.json({
      success: true,
      data: {
        subjects: summary
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get faculty subject summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FACULTY_SUBJECT_SUMMARY_ERROR',
        message: 'Failed to retrieve faculty attendance summary',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get student attendance records
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, subjectCode, department, academicYear } = req.query;
    const effectiveStudentId = req.user.role === 'student'
      ? req.user._id.toString()
      : studentId;

    // Students can only access their own records
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Students can only access their own attendance records',
          timestamp: new Date().toISOString()
        }
      });
    }

    const filters = {};
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    if (subjectCode) filters.subjectCode = subjectCode;
    if (department) filters.department = department;
    if (academicYear) filters.academicYear = parseInt(academicYear);
    filters.studentEmail = req.user?.email;

    const attendanceRecords = await DailyAttendance.getStudentAttendance(effectiveStudentId, filters);
    const attendanceSummary = await DailyAttendance.getStudentAttendanceSummary(effectiveStudentId, filters);

    res.json({
      success: true,
      data: {
        attendanceRecords,
        attendanceSummary,
        totalRecords: attendanceRecords.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STUDENT_ATTENDANCE_ERROR',
        message: 'Failed to retrieve student attendance records',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get attendance statistics
const getAttendanceStatistics = async (req, res) => {
  try {
    const { startDate, endDate, department, academicYear, facultyId } = req.query;

    const filters = {};
    if (startDate || endDate) {
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
    }
    if (department) filters.department = department;
    if (academicYear) filters.academicYear = parseInt(academicYear);
    if (facultyId) filters.facultyId = facultyId;

    const statistics = await DailyAttendance.getAttendanceStatistics(filters);

    res.json({
      success: true,
      data: {
        statistics: statistics[0] || {
          totalClasses: 0,
          totalStudentRecords: 0,
          totalPresentRecords: 0,
          totalAbsentRecords: 0,
          averageAttendance: 0,
          overallAttendancePercentage: 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get attendance statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATISTICS_ERROR',
        message: 'Failed to retrieve attendance statistics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get department daily attendance (all students in department)
const getDepartmentDailyAttendance = async (req, res) => {
  try {
    const { department, academicYear, startDate, endDate, subjectCode } = req.query;

    if (!department) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_REQUIRED',
          message: 'Department parameter is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query
    const query = { 
      department,
      status: 'submitted' // Only show submitted sessions to students
    };
    
    if (academicYear) {
      query.academicYear = parseInt(academicYear);
    }
    
    if (subjectCode) {
      query.subjectCode = subjectCode;
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log('📊 Getting department daily attendance with query:', query);

    // Get all attendance sessions for the department
    const attendanceRecords = await DailyAttendance.find(query)
      .sort({ date: -1, classStartTime: -1 })
      .lean();

    console.log('📊 Found attendance records:', attendanceRecords.length);

    res.json({
      success: true,
      data: {
        attendanceRecords,
        total: attendanceRecords.length,
        department,
        academicYear: academicYear ? parseInt(academicYear) : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get department daily attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DEPARTMENT_DAILY_ATTENDANCE_ERROR',
        message: 'Failed to retrieve department daily attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Add guest student to attendance session (manually added by faculty)
const addGuestStudent = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentName, studentEmail, rollNumber, isPresent, remarks } = req.body;

    // Only faculty and admin can add guest students
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can add guest students',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate required fields
    if (!studentName || !studentEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Student name and email are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find the attendance session
    const attendanceSession = await DailyAttendance.findById(sessionId);

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_SESSION_NOT_FOUND',
          message: 'Attendance session not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if faculty owns this session
    if (req.user.role === 'faculty' && attendanceSession.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only modify your own attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if student already exists in session (by email)
    const existingStudent = attendanceSession.studentAttendance.find(
      s => s.studentEmail.toLowerCase() === studentEmail.toLowerCase()
    );

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'STUDENT_ALREADY_EXISTS',
          message: 'Student with this email already exists in the session',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Add guest student to attendance
    attendanceSession.studentAttendance.push({
      studentId: null,  // No studentId for guest students
      studentName: studentName.trim(),
      studentEmail: studentEmail.toLowerCase().trim(),
      rollNumber: rollNumber?.trim() || '',
      isGuest: true,  // Mark as guest student
      isPresent: isPresent !== undefined ? isPresent : true,
      markedBy: req.user._id,
      markedAt: new Date(),
      remarks: remarks?.trim() || ''
    });

    // Save the session (pre-save hook will recalculate statistics)
    await attendanceSession.save();

    res.json({
      success: true,
      data: {
        message: 'Guest student added successfully',
        attendanceSession
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add guest student error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADD_GUEST_STUDENT_ERROR',
        message: 'Failed to add guest student',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Remove student from attendance session
const removeStudentFromSession = async (req, res) => {
  try {
    const { sessionId, studentEmail } = req.params;

    // Only faculty and admin can remove students
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can remove students',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find the attendance session
    const attendanceSession = await DailyAttendance.findById(sessionId);

    if (!attendanceSession) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ATTENDANCE_SESSION_NOT_FOUND',
          message: 'Attendance session not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if faculty owns this session
    if (req.user.role === 'faculty' && attendanceSession.facultyId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only modify your own attendance sessions',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Remove student from attendance
    const initialLength = attendanceSession.studentAttendance.length;
    attendanceSession.studentAttendance = attendanceSession.studentAttendance.filter(
      s => s.studentEmail.toLowerCase() !== studentEmail.toLowerCase()
    );

    if (attendanceSession.studentAttendance.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found in this session',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Save the session (pre-save hook will recalculate statistics)
    await attendanceSession.save();

    res.json({
      success: true,
      data: {
        message: 'Student removed successfully',
        attendanceSession
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REMOVE_STUDENT_ERROR',
        message: 'Failed to remove student',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  createAttendanceSession,
  getFacultyAttendanceAccess,
  getAttendanceSession,
  updateStudentAttendance,
  bulkUpdateAttendance,
  submitAttendanceSession,
  getFacultyAttendanceSessions,
  getFacultySubjectSummary,
  getStudentAttendance,
  getAttendanceStatistics,
  getDepartmentDailyAttendance,
  addGuestStudent,
  removeStudentFromSession
};
