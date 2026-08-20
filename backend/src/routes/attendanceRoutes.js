const express = require('express');
const { markAttendance } = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorize('faculty'), markAttendance);

module.exports = router;
