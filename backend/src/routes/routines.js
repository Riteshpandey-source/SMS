const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createRoutineUpload, handleMulterError } = require('../middleware/fileUpload');
const { uploadRoutine, listRoutines } = require('../controllers/routineController');

const routineUpload = createRoutineUpload();

// List routines for current user (students/faculty/parents/admin)
router.get('/', authenticate, listRoutines);

// Admin uploads a routine file
router.post(
  '/',
  authenticate,
  authorize('admin'),
  routineUpload.single('file'),
  handleMulterError,
  uploadRoutine
);

module.exports = router;
