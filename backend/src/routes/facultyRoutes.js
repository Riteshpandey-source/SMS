const express = require('express');
const { getFacultySubjects, getStudentsByClass } = require('../controllers/facultyController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('faculty'));
router.get('/subjects', getFacultySubjects);
router.get('/classes/:classId/students', getStudentsByClass);

module.exports = router;
