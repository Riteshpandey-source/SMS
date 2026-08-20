const express = require('express');
const router = express.Router();

// Import controllers and middleware
const assignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { filterByAssignments, addAssignmentContext, logAssignmentActivity } = require('../middleware/assignmentMiddleware');

// Import validation schemas
const {
  assignmentIdSchema,
  refreshAssignmentsSchema,
  bulkRefreshSchema,
  assignmentStatsQuerySchema,
  unassignedStudentsQuerySchema,
  validateAssignmentsQuerySchema
} = require('../validation/assignmentValidation');

// Apply rate limiting to all assignment routes
router.use(apiRateLimiter);

// Apply authentication to all routes
router.use(authenticate);

// Add assignment context to all routes
router.use(addAssignmentContext());

// GET /api/assignments/my-faculty - Get student's assigned faculty
router.get('/my-faculty', 
  authorize('student'),
  logAssignmentActivity('get_my_faculty'),
  assignmentController.getMyFaculty
);

// GET /api/assignments/my-students - Get faculty's assigned students
router.get('/my-students',
  authorize('faculty'),
  logAssignmentActivity('get_my_students'),
  assignmentController.getMyStudents
);

// POST /api/assignments/refresh - Refresh user's assignments
router.post('/refresh',
  authorize('student', 'faculty'),
  validateBody(refreshAssignmentsSchema),
  logAssignmentActivity('refresh_assignments'),
  assignmentController.refreshAssignments
);

// GET /api/assignments/stats - Get assignment statistics (admin only)
router.get('/stats',
  authorize('admin'),
  validateQuery(assignmentStatsQuerySchema),
  logAssignmentActivity('get_assignment_stats'),
  assignmentController.getAssignmentStats
);

// GET /api/assignments/unassigned - Get unassigned students (admin only)
router.get('/unassigned',
  authorize('admin'),
  validateQuery(unassignedStudentsQuerySchema),
  logAssignmentActivity('get_unassigned_students'),
  assignmentController.getUnassignedStudents
);

// GET /api/assignments/audit-logs - Get assignment audit logs (admin only)
router.get('/audit-logs',
  authorize('admin'),
  logAssignmentActivity('get_assignment_audit_logs'),
  assignmentController.getAssignmentAuditLogs
);

// POST /api/assignments/bulk-assign - Bulk refresh/assign students (admin only)
router.post('/bulk-assign',
  authorize('admin'),
  logAssignmentActivity('bulk_assign_students'),
  assignmentController.bulkRefreshAssignments
);

// POST /api/assignments/bulk-assign-department - Bulk assign by department (admin only)
router.post('/bulk-assign-department',
  authorize('admin'),
  logAssignmentActivity('bulk_assign_by_department'),
  assignmentController.bulkAssignByDepartment
);

// GET /api/assignments - Get all assignments (admin only)
router.get('/',
  authorize('admin'),
  logAssignmentActivity('get_all_assignments'),
  assignmentController.getAllAssignments
);

// POST /api/assignments - Create manual assignment (admin only)
router.post('/',
  authorize('admin'),
  logAssignmentActivity('create_assignment'),
  assignmentController.createAssignment
);

// PUT /api/assignments/:id - Update assignment (admin only)
router.put('/:id',
  authorize('admin'),
  logAssignmentActivity('update_assignment'),
  assignmentController.updateAssignment
);

// DELETE /api/assignments/:id - Delete assignment (admin only)
router.delete('/:id',
  authorize('admin'),
  logAssignmentActivity('delete_assignment'),
  assignmentController.deleteAssignment
);

// GET /api/assignments/:id - Get assignment details by ID
router.get('/:id',
  authorize('student', 'faculty', 'admin'),
  validateParams(assignmentIdSchema),
  logAssignmentActivity('get_assignment_by_id'),
  assignmentController.getAssignmentById
);

// POST /api/assignments/bulk-refresh - Bulk refresh all assignments (admin only)
router.post('/bulk-refresh',
  authorize('admin'),
  validateBody(bulkRefreshSchema),
  logAssignmentActivity('bulk_refresh_assignments'),
  assignmentController.bulkRefreshAssignments
);

// GET /api/assignments/validate - Validate assignment integrity (admin only)
router.get('/validate',
  authorize('admin'),
  validateQuery(validateAssignmentsQuerySchema),
  logAssignmentActivity('validate_assignments'),
  assignmentController.validateAssignments
);

// Health check for assignment service
router.get('/health/check',
  (req, res) => {
    res.json({
      success: true,
      service: 'assignments',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      features: {
        studentFacultyMapping: true,
        automaticAssignment: true,
        assignmentFiltering: true,
        adminManagement: true
      }
    });
  }
);

module.exports = router;