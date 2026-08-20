const express = require('express');
const router = express.Router();

// Import controllers and middleware
const academicController = require('../controllers/academicController');
const { authenticate, authorize, facultyOrAdmin, selfOrAdmin } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const { apiRateLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const Joi = require('joi');

// Validation schemas
const studentParamsSchema = Joi.object({
  studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid student ID format'
  })
});

const subjectParamsSchema = Joi.object({
  studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  subjectId: Joi.string().required()
});

const academicQuerySchema = Joi.object({
  academicYear: Joi.number().integer().min(1).max(4),
  semester: Joi.string(),
  subjectCode: Joi.string().uppercase()
});

const updateAttendanceSchema = Joi.object({
  attendedClasses: Joi.number().integer().min(0).required(),
  totalClasses: Joi.number().integer().min(0).required(),
  subjectCode: Joi.string().optional(),
  subjectName: Joi.string().optional(),
  academicYear: Joi.number().integer().min(1).max(9999),
  semester: Joi.string()
}).custom((value, helpers) => {
  if (value.attendedClasses > value.totalClasses) {
    return helpers.error('any.invalid', { message: 'Attended classes cannot exceed total classes' });
  }
  return value;
});

const bulkUpdateAttendanceSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      subjectId: Joi.string().required(),
      attendedClasses: Joi.number().integer().min(0).required(),
      totalClasses: Joi.number().integer().min(0).required()
    }).custom((value, helpers) => {
      if (value.attendedClasses > value.totalClasses) {
        return helpers.error('any.invalid', { message: 'Attended classes cannot exceed total classes' });
      }
      return value;
    })
  ).min(1).required(),
  academicYear: Joi.number().integer().min(1).max(9999).optional(),
  semester: Joi.alternatives().try(
    Joi.string().valid('1', '2', '3', '4', '5', '6', '7', '8', 'current', 'odd', 'even'),
    Joi.number().integer().min(1).max(8)
  ).optional()
});

const marksValidationSchema = Joi.object({
  marks: Joi.array().items(
    Joi.object({
      subjectCode: Joi.string().required(),
      subjectName: Joi.string().optional(),
      subjectId: Joi.string().optional(),
      obtainedMarks: Joi.number().min(0).required(),
      maxMarks: Joi.number().min(1).max(1000).required(),
      examDate: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
      remarks: Joi.string().max(200).optional(),
      grade: Joi.string().optional()
    }).custom((value, helpers) => {
      if (value.obtainedMarks > value.maxMarks) {
        return helpers.error('any.invalid', { message: 'Obtained marks cannot exceed maximum marks' });
      }
      return value;
    })
  ).min(1).required(),
  academicYear: Joi.number().integer().min(1).max(9999).optional(),
  semester: Joi.alternatives().try(
    Joi.string().valid('1', '2', '3', '4', '5', '6', '7', '8', 'current', 'odd', 'even'),
    Joi.number().integer().min(1).max(8)
  ).optional()
});

const attendanceValidationSchema = Joi.object({
  attendedClasses: Joi.number().integer().min(0).required(),
  totalClasses: Joi.number().integer().min(0).required(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional()
}).custom((value, helpers) => {
  if (value.attendedClasses > value.totalClasses) {
    return helpers.error('any.invalid', { message: 'Attended classes cannot exceed total classes' });
  }
  return value;
});

const analyticsQuerySchema = Joi.object({
  department: Joi.string().valid('CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE'),
  academicYear: Joi.number().integer().min(1).max(4),
  semester: Joi.string(),
  subjectCode: Joi.string().uppercase()
});

// Apply rate limiting to all academic routes
router.use(apiRateLimiter);

// Public Routes (No Authentication Required)

// GET /api/academic/public/regular-attendance - Get public regular attendance
router.get('/public/regular-attendance',
  validateQuery(Joi.object({
    department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').required(),
    academicYear: Joi.number().integer().min(1).max(4).required()
  })),
  academicController.getPublicRegularAttendance
);

// Student Academic Records Routes

// GET /api/academic/records/:studentId - Get student's academic records
router.get('/records/:studentId',
  authenticate,
  validateParams(studentParamsSchema),
  validateQuery(academicQuerySchema),
  academicController.getAcademicRecords
);

// GET /api/academic/attendance/:studentId - Get student's attendance records
router.get('/attendance/:studentId',
  authenticate,
  validateParams(studentParamsSchema),
  validateQuery(academicQuerySchema),
  academicController.getAttendance
);

// Faculty/Admin Attendance Management Routes

// PUT /api/academic/attendance/:studentId/:subjectId - Update student attendance
router.put('/attendance/:studentId/:subjectId',
  authenticate,
  facultyOrAdmin,
  validateParams(subjectParamsSchema),
  validateBody(attendanceValidationSchema),
  academicController.updateAttendance
);

// DELETE /api/academic/attendance/:studentId/:subjectId - Delete student attendance
router.delete('/attendance/:studentId/:subjectId',
  authenticate,
  facultyOrAdmin,
  validateParams(subjectParamsSchema),
  academicController.deleteAttendance
);

// POST /api/academic/attendance/bulk - Bulk update attendance
router.post('/attendance/bulk',
  authenticate,
  facultyOrAdmin,
  validateBody(bulkUpdateAttendanceSchema),
  academicController.bulkUpdateAttendance
);

// Analytics and Reporting Routes

// GET /api/academic/analytics/attendance - Get attendance analytics
router.get('/analytics/attendance',
  authenticate,
  facultyOrAdmin,
  validateQuery(analyticsQuerySchema),
  academicController.getAttendanceAnalytics
);

// GET /api/academic/debarred - Get list of debarred students
router.get('/debarred',
  authenticate,
  facultyOrAdmin,
  validateQuery(analyticsQuerySchema),
  academicController.getDebarredStudents
);

// Mid-term Marks Management Routes

// PUT /api/academic/midterm/:studentId - Update student's mid-term marks
router.put('/midterm/:studentId',
  authenticate,
  facultyOrAdmin,
  validateParams(studentParamsSchema),
  validateBody(marksValidationSchema),
  academicController.updateMidTermMarks
);

// GET /api/academic/midterm/:studentId - Get student's mid-term marks
router.get('/midterm/:studentId',
  authenticate,
  validateParams(studentParamsSchema),
  validateQuery(academicQuerySchema),
  academicController.getMidTermMarks
);

// Debarment Management Routes

// PUT /api/academic/debarment/:studentId - Update student debarment status
router.put('/debarment/:studentId',
  authenticate,
  facultyOrAdmin,
  validateParams(studentParamsSchema),
  validateBody(Joi.object({
    subject: Joi.string().required(),
    isDebarred: Joi.boolean().required(),
    reason: Joi.string().max(200).optional()
  })),
  academicController.updateStudentDebarment
);

// GET /api/academic/debarment/:studentId - Get student's debarment status
router.get('/debarment/:studentId',
  authenticate,
  validateParams(studentParamsSchema),
  academicController.getStudentDebarments
);

// Utility Routes

// GET /api/academic/subjects - Get available subjects (placeholder for now)
router.get('/subjects',
  authenticate,
  async (req, res) => {
    try {
      // This would typically come from a subjects collection
      // For now, returning common subjects by department
      const subjectsByDepartment = {
        CS: [
          { id: 'CS101', code: 'CS101', name: 'Programming Fundamentals', credits: 4 },
          { id: 'CS102', code: 'CS102', name: 'Data Structures', credits: 4 },
          { id: 'CS201', code: 'CS201', name: 'Database Systems', credits: 3 },
          { id: 'CS202', code: 'CS202', name: 'Computer Networks', credits: 3 },
          { id: 'CS301', code: 'CS301', name: 'Software Engineering', credits: 4 },
          { id: 'CS302', code: 'CS302', name: 'Machine Learning', credits: 3 }
        ],
        ECE: [
          { id: 'ECE101', code: 'ECE101', name: 'Circuit Analysis', credits: 4 },
          { id: 'ECE102', code: 'ECE102', name: 'Digital Electronics', credits: 4 },
          { id: 'ECE201', code: 'ECE201', name: 'Signals and Systems', credits: 3 },
          { id: 'ECE202', code: 'ECE202', name: 'Communication Systems', credits: 3 }
        ],
        ME: [
          { id: 'ME101', code: 'ME101', name: 'Engineering Mechanics', credits: 4 },
          { id: 'ME102', code: 'ME102', name: 'Thermodynamics', credits: 4 },
          { id: 'ME201', code: 'ME201', name: 'Fluid Mechanics', credits: 3 },
          { id: 'ME202', code: 'ME202', name: 'Machine Design', credits: 3 }
        ]
      };

      const { department } = req.query;
      const subjects = department ? 
        subjectsByDepartment[department] || [] : 
        Object.values(subjectsByDepartment).flat();

      res.json({
        success: true,
        data: {
          subjects,
          total: subjects.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get subjects error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_SUBJECTS_ERROR',
          message: 'Failed to retrieve subjects',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// GET /api/academic/dashboard - Academic dashboard data
router.get('/dashboard',
  authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      let dashboardData = {};

      if (user.role === 'student') {
        // Student dashboard
        const academicRecord = await require('../models/AcademicRecord')
          .findOne({ 
            studentId: user._id,
            academicYear: user.academicYear 
          })
          .sort({ createdAt: -1 });

        dashboardData = {
          role: 'student',
          currentRecord: academicRecord,
          attendanceSummary: academicRecord?.attendanceSummary || null,
          isDebarred: academicRecord?.isDebarred || false,
          debarredSubjects: academicRecord?.debarredSubjects || [],
          overallAttendance: academicRecord?.overallAttendance || 0,
          cgpa: academicRecord?.cgpa || 0,
          sgpa: academicRecord?.sgpa || 0
        };

      } else if (user.role === 'faculty' || user.role === 'admin') {
        // Faculty/Admin dashboard
        const stats = await require('../models/AcademicRecord').aggregate([
          ...(user.role === 'faculty' ? [{ $match: { department: user.department } }] : []),
          {
            $group: {
              _id: null,
              totalStudents: { $sum: 1 },
              averageAttendance: { $avg: '$overallAttendance' },
              debarredCount: { $sum: { $cond: ['$isDebarred', 1, 0] } },
              averageCGPA: { $avg: '$cgpa' }
            }
          }
        ]);

        dashboardData = {
          role: user.role,
          statistics: stats[0] || {
            totalStudents: 0,
            averageAttendance: 0,
            debarredCount: 0,
            averageCGPA: 0
          },
          department: user.department
        };
      }

      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get academic dashboard error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ACADEMIC_DASHBOARD_ERROR',
          message: 'Failed to retrieve academic dashboard data',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// Department and All Students Attendance Routes

// GET /api/academic/department/attendance - Get department attendance
router.get('/department/attendance',
  authenticate,
  validateQuery(Joi.object({
    department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').required(),
    academicYear: Joi.number().integer().min(1).max(4).optional(),
    semester: Joi.string().optional()
  })),
  academicController.getDepartmentAttendance
);

// GET /api/academic/all-students/attendance - Get all students attendance (admin/faculty only)
router.get('/all-students/attendance',
  authenticate,
  facultyOrAdmin,
  validateQuery(Joi.object({
    academicYear: Joi.number().integer().min(1).max(4).optional(),
    semester: Joi.string().optional()
  })),
  academicController.getAllStudentsAttendance
);

// Health check for academic service
router.get('/health',
  (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'Academic Management Service',
        status: 'operational',
        features: {
          attendanceTracking: true,
          marksManagement: true,
          debarmentCalculation: true,
          analytics: true,
          bulkOperations: true
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;