const express = require('express');
const router = express.Router();

// Import controllers and middleware
const adminHierarchyController = require('../controllers/adminHierarchyController');
const { authenticate, authorize } = require('../middleware/auth');
const { apiRateLimiter } = require('../middleware/rateLimiter');

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Apply authentication to all routes
router.use(authenticate);

// Apply admin authorization to all routes
router.use(authorize('admin'));

/**
 * GET /api/admin/faculty-hierarchy
 * Get all faculty with student counts, grouped by department
 * Query params: ?department=CSE&year=1
 */
router.get('/faculty-hierarchy', adminHierarchyController.getFacultyHierarchy);

/**
 * GET /api/admin/faculty/:facultyId/students
 * Get students assigned to a specific faculty
 */
router.get('/faculty/:facultyId/students', adminHierarchyController.getFacultyStudents);

/**
 * GET /api/admin/students/:studentId/details
 * Get student details with academic records and parent information
 */
router.get('/students/:studentId/details', adminHierarchyController.getStudentDetails);

module.exports = router;
