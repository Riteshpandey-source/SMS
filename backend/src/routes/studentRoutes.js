const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getStudentAttendance, getAttendanceSummary } = require('../controllers/attendanceController');

const router = express.Router();

router.use(authenticate);
router.get('/:studentId/attendance', authorize('student', 'faculty'), getStudentAttendance);
router.get('/:studentId/summary', authorize('student', 'faculty'), getAttendanceSummary);

module.exports = router;
