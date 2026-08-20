const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const examMarksController = require('../controllers/examMarksController');
const Joi = require('joi');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');

const bulkSchema = Joi.object({
  subjectCode: Joi.string().uppercase().required(),
  subjectName: Joi.string().required(),
  academicYear: Joi.number().integer().min(1).max(4).required(),
  examDate: Joi.date().required(),
  assessmentType: Joi.string().required(),
  maxMarks: Joi.number().positive().required(),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  marks: Joi.array().items(Joi.object({
    studentId: Joi.string().required(),
    obtainedMarks: Joi.number().min(0).required(),
    remarks: Joi.string().allow('').max(200).optional()
  })).min(1).required()
});

router.use(authenticate);

router.post('/bulk', validateBody(bulkSchema), examMarksController.createOrUpdateMarks);

router.get('/faculty', validateQuery(Joi.object({
  subjectCode: Joi.string().optional(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  facultyId: Joi.string().optional()
})), examMarksController.getFacultyMarks);

router.get('/student/:studentId', validateParams(Joi.object({
  studentId: Joi.string().required()
})), examMarksController.getStudentMarks);

module.exports = router;
