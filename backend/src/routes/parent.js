const express = require('express');
const router = express.Router();

// Import controllers and middleware
const parentAcademicController = require('../controllers/parentAcademicController');
const { 
  authenticate, 
  parentOnly, 
  readOnlyForParents,
  validateParentChildRelationship 
} = require('../middleware/auth');

// All parent routes require authentication and parent role
router.use(authenticate);
router.use(parentOnly);
router.use(validateParentChildRelationship);
router.use(readOnlyForParents);

// Parent academic data routes

// GET /api/parent/child/academic-records - Get child's academic records
router.get('/child/academic-records',
  parentAcademicController.getChildAcademicRecords
);

// GET /api/parent/child/attendance - Get child's attendance data
router.get('/child/attendance',
  parentAcademicController.getChildAttendance
);

// GET /api/parent/child/marks - Get child's marks and grades
router.get('/child/marks',
  parentAcademicController.getChildMarks
);

// GET /api/parent/child/performance - Get child's performance metrics
router.get('/child/performance',
  parentAcademicController.getChildPerformance
);

// GET /api/parent/access-logs - Get parent's access logs (for transparency)
router.get('/access-logs',
  parentAcademicController.getParentAccessLogs
);

// Health check for parent service
router.get('/health',
  (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'Parent Portal Service',
        status: 'operational',
        features: {
          academicRecords: true,
          attendance: true,
          marks: true,
          performance: true,
          auditLogs: true
        },
        parentInfo: {
          id: req.user._id,
          childId: req.user.childId,
          hasValidRelationship: !!req.child
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;