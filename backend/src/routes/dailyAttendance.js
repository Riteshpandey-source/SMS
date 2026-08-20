const express = require('express');
const router = express.Router();

// Import controllers and middleware
const dailyAttendanceController = require('../controllers/dailyAttendanceController');
const { authenticate } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const Joi = require('joi');

// Validation schemas
const createAttendanceSessionSchema = Joi.object({
  date: Joi.date().required().messages({
    'date.base': 'Please provide a valid date',
    'any.required': 'Date is required'
  }),
  subjectId: Joi.string().optional(),
  subjectCode: Joi.string().optional().uppercase(),
  subjectName: Joi.string().required().messages({
    'string.empty': 'Subject name is required',
    'any.required': 'Subject name is required'
  }),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional().default('current'),
  classStartTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Please provide valid time format (HH:MM)',
    'any.required': 'Class start time is required'
  }),
  classEndTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
    'string.pattern.base': 'Please provide valid time format (HH:MM)',
    'any.required': 'Class end time is required'
  }),
  classType: Joi.string().valid('lecture', 'practical', 'tutorial', 'seminar', 'exam').optional().default('lecture'),
  location: Joi.string().max(50).optional(),
  studentIds: Joi.array().items(Joi.string()).optional(),
  remarks: Joi.string().max(200).optional()
});

const updateStudentAttendanceSchema = Joi.object({
  studentId: Joi.string().required().messages({
    'string.empty': 'Student ID is required',
    'any.required': 'Student ID is required'
  }),
  isPresent: Joi.boolean().required().messages({
    'boolean.base': 'isPresent must be true or false',
    'any.required': 'Attendance status is required'
  }),
  remarks: Joi.string().max(100).optional().allow('')
});

const bulkUpdateAttendanceSchema = Joi.object({
  attendanceData: Joi.array().items(
    Joi.object({
      entryId: Joi.string().optional().allow(''),
      studentId: Joi.string().required(),
      studentEmail: Joi.string().email().optional().allow(''),
      isPresent: Joi.boolean().required(),
      remarks: Joi.string().max(100).optional().allow('')
    })
  ).min(1).required().messages({
    'array.min': 'At least one student attendance record is required',
    'any.required': 'Attendance data is required'
  })
});

const sessionIdParamsSchema = Joi.object({
  sessionId: Joi.string().required().messages({
    'string.empty': 'Session ID is required',
    'any.required': 'Session ID is required'
  })
});

const studentIdParamsSchema = Joi.object({
  studentId: Joi.string().required().messages({
    'string.empty': 'Student ID is required',
    'any.required': 'Student ID is required'
  })
});

const attendanceQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  subjectCode: Joi.string().optional(),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  status: Joi.string().valid('draft', 'submitted', 'locked').optional(),
  facultyId: Joi.string().optional()
});

// All routes require authentication except health check and public routes
// Health check for daily attendance service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Daily Attendance Service',
      status: 'operational',
      features: {
        createSessions: true,
        markAttendance: true,
        bulkUpdate: true,
        studentView: true,
        facultyManagement: true,
        statistics: true
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Public route - Get department daily attendance without authentication
router.get('/public/department',
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getDepartmentDailyAttendance
);

router.use(authenticate);

// Faculty/Admin routes for managing attendance sessions

// POST /api/daily-attendance/sessions - Create new attendance session
router.post('/sessions',
  authRateLimiter,
  validateBody(createAttendanceSessionSchema),
  dailyAttendanceController.createAttendanceSession
);

// GET /api/daily-attendance/sessions/:sessionId - Get attendance session details
router.get('/sessions/:sessionId',
  validateParams(sessionIdParamsSchema),
  dailyAttendanceController.getAttendanceSession
);

// PUT /api/daily-attendance/sessions/:sessionId/student - Update individual student attendance
router.put('/sessions/:sessionId/student',
  validateParams(sessionIdParamsSchema),
  validateBody(updateStudentAttendanceSchema),
  dailyAttendanceController.updateStudentAttendance
);

// PUT /api/daily-attendance/sessions/:sessionId/bulk - Bulk update student attendance
router.put('/sessions/:sessionId/bulk',
  validateParams(sessionIdParamsSchema),
  validateBody(bulkUpdateAttendanceSchema),
  dailyAttendanceController.bulkUpdateAttendance
);

// POST /api/daily-attendance/sessions/:sessionId/submit - Submit attendance session
router.post('/sessions/:sessionId/submit',
  validateParams(sessionIdParamsSchema),
  dailyAttendanceController.submitAttendanceSession
);

// POST /api/daily-attendance/sessions/:sessionId/guest - Add guest student to session
router.post('/sessions/:sessionId/guest',
  validateParams(sessionIdParamsSchema),
  validateBody(Joi.object({
    studentName: Joi.string().required().messages({
      'string.empty': 'Student name is required',
      'any.required': 'Student name is required'
    }),
    studentEmail: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email',
      'string.empty': 'Student email is required',
      'any.required': 'Student email is required'
    }),
    rollNumber: Joi.string().optional().allow(''),
    isPresent: Joi.boolean().optional().default(true),
    remarks: Joi.string().max(100).optional().allow('')
  })),
  dailyAttendanceController.addGuestStudent
);

// DELETE /api/daily-attendance/sessions/:sessionId/student/:studentEmail - Remove student from session
router.delete('/sessions/:sessionId/student/:studentEmail',
  validateParams(Joi.object({
    sessionId: Joi.string().required(),
    studentEmail: Joi.string().email().required()
  })),
  dailyAttendanceController.removeStudentFromSession
);

// GET /api/daily-attendance/faculty/sessions - Get faculty attendance sessions
router.get('/faculty/sessions',
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getFacultyAttendanceSessions
);

router.get('/faculty/access-config',
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getFacultyAttendanceAccess
);

router.get('/faculty/summary',
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getFacultySubjectSummary
);

// Student routes for viewing attendance

// GET /api/daily-attendance/student/:studentId - Get student attendance records
router.get('/student/:studentId',
  validateParams(studentIdParamsSchema),
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getStudentAttendance
);

// GET /api/daily-attendance/department - Get department daily attendance (all students)
router.get('/department',
  authenticate,
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getDepartmentDailyAttendance
);

// Admin routes for statistics and analytics

// GET /api/daily-attendance/statistics - Get attendance statistics
router.get('/statistics',
  validateQuery(attendanceQuerySchema),
  dailyAttendanceController.getAttendanceStatistics
);

module.exports = router;
