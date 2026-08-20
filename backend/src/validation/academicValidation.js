const Joi = require('joi');

// Academic record validation schemas
const createAcademicRecordSchema = Joi.object({
  studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid student ID format',
    'string.empty': 'Student ID is required'
  }),
  academicYear: Joi.number().integer().min(1).max(4).required().messages({
    'number.min': 'Academic year must be between 1 and 4',
    'number.max': 'Academic year must be between 1 and 4',
    'any.required': 'Academic year is required'
  }),
  semester: Joi.string().required().messages({
    'string.empty': 'Semester is required'
  }),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').required().messages({
    'any.only': 'Department must be one of: CS, ECE, ME, EE, IT, CSAI, AIDS, CIVIL',
    'any.required': 'Department is required'
  })
});

// Subject validation schema
const subjectSchema = Joi.object({
  subjectId: Joi.string().required().messages({
    'string.empty': 'Subject ID is required'
  }),
  subjectName: Joi.string().trim().required().messages({
    'string.empty': 'Subject name is required'
  }),
  subjectCode: Joi.string().uppercase().trim().required().messages({
    'string.empty': 'Subject code is required'
  }),
  credits: Joi.number().integer().min(1).max(6).required().messages({
    'number.min': 'Credits must be at least 1',
    'number.max': 'Credits cannot exceed 6',
    'any.required': 'Credits are required'
  }),
  faculty: Joi.string().trim().required().messages({
    'string.empty': 'Faculty name is required'
  }),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').required().messages({
    'any.only': 'Department must be one of: CS, ECE, ME, EE, IT, CSAI, AIDS, CIVIL'
  })
});

// Attendance validation schemas
const updateAttendanceSchema = Joi.object({
  attendedClasses: Joi.number().integer().min(0).required().messages({
    'number.min': 'Attended classes cannot be negative',
    'any.required': 'Attended classes is required'
  }),
  totalClasses: Joi.number().integer().min(0).required().messages({
    'number.min': 'Total classes cannot be negative',
    'any.required': 'Total classes is required'
  }),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional(),
  requiredPercentage: Joi.number().min(0).max(100).default(75).messages({
    'number.min': 'Required percentage cannot be negative',
    'number.max': 'Required percentage cannot exceed 100'
  })
}).custom((value, helpers) => {
  if (value.attendedClasses > value.totalClasses) {
    return helpers.error('any.invalid', { 
      message: 'Attended classes cannot exceed total classes' 
    });
  }
  return value;
});

const bulkAttendanceUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      subjectId: Joi.string().required(),
      attendedClasses: Joi.number().integer().min(0).required(),
      totalClasses: Joi.number().integer().min(0).required(),
      requiredPercentage: Joi.number().min(0).max(100).default(75)
    }).custom((value, helpers) => {
      if (value.attendedClasses > value.totalClasses) {
        return helpers.error('any.invalid', { 
          message: 'Attended classes cannot exceed total classes' 
        });
      }
      return value;
    })
  ).min(1).required().messages({
    'array.min': 'At least one update is required'
  }),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional()
});

// Marks validation schemas
const updateMarksSchema = Joi.object({
  obtainedMarks: Joi.number().min(0).required().messages({
    'number.min': 'Obtained marks cannot be negative',
    'any.required': 'Obtained marks is required'
  }),
  maxMarks: Joi.number().min(1).required().messages({
    'number.min': 'Maximum marks must be at least 1',
    'any.required': 'Maximum marks is required'
  }),
  examDate: Joi.date().optional(),
  remarks: Joi.string().trim().max(200).optional().messages({
    'string.max': 'Remarks cannot exceed 200 characters'
  }),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional()
}).custom((value, helpers) => {
  if (value.obtainedMarks > value.maxMarks) {
    return helpers.error('any.invalid', { 
      message: 'Obtained marks cannot exceed maximum marks' 
    });
  }
  return value;
});

const updateFinalMarksSchema = Joi.object({
  internalMarks: Joi.number().min(0).default(0).messages({
    'number.min': 'Internal marks cannot be negative'
  }),
  externalMarks: Joi.number().min(0).default(0).messages({
    'number.min': 'External marks cannot be negative'
  }),
  maxMarks: Joi.number().min(1).required().messages({
    'number.min': 'Maximum marks must be at least 1',
    'any.required': 'Maximum marks is required'
  }),
  examDate: Joi.date().optional(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional()
}).custom((value, helpers) => {
  const totalMarks = value.internalMarks + value.externalMarks;
  if (totalMarks > value.maxMarks) {
    return helpers.error('any.invalid', { 
      message: 'Total marks (internal + external) cannot exceed maximum marks' 
    });
  }
  return value;
});

// Query validation schemas
const academicQuerySchema = Joi.object({
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional(),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  subjectCode: Joi.string().uppercase().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const analyticsQuerySchema = Joi.object({
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional(),
  subjectCode: Joi.string().uppercase().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  groupBy: Joi.string().valid('department', 'academicYear', 'semester', 'subject').default('department')
}).custom((value, helpers) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    return helpers.error('any.invalid', { 
      message: 'Start date cannot be after end date' 
    });
  }
  return value;
});

// Parameter validation schemas
const studentParamsSchema = Joi.object({
  studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid student ID format',
    'string.empty': 'Student ID is required'
  })
});

const subjectParamsSchema = Joi.object({
  studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid student ID format'
  }),
  subjectId: Joi.string().required().messages({
    'string.empty': 'Subject ID is required'
  })
});

const academicRecordParamsSchema = Joi.object({
  recordId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid academic record ID format',
    'string.empty': 'Academic record ID is required'
  })
});

// Bulk operations validation
const bulkMarksUpdateSchema = Joi.object({
  updates: Joi.array().items(
    Joi.object({
      studentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      subjectId: Joi.string().required(),
      obtainedMarks: Joi.number().min(0).required(),
      maxMarks: Joi.number().min(1).required(),
      examDate: Joi.date().optional(),
      remarks: Joi.string().trim().max(200).optional()
    }).custom((value, helpers) => {
      if (value.obtainedMarks > value.maxMarks) {
        return helpers.error('any.invalid', { 
          message: 'Obtained marks cannot exceed maximum marks' 
        });
      }
      return value;
    })
  ).min(1).required().messages({
    'array.min': 'At least one update is required'
  }),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  semester: Joi.string().optional(),
  examType: Joi.string().valid('midterm', 'final').default('midterm')
});

// Academic status update schema
const updateAcademicStatusSchema = Joi.object({
  academicStatus: Joi.string().valid('active', 'probation', 'suspended', 'graduated', 'dropped').required().messages({
    'any.only': 'Academic status must be one of: active, probation, suspended, graduated, dropped',
    'any.required': 'Academic status is required'
  }),
  remarks: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Remarks cannot exceed 500 characters'
  })
});

module.exports = {
  createAcademicRecordSchema,
  subjectSchema,
  updateAttendanceSchema,
  bulkAttendanceUpdateSchema,
  updateMarksSchema,
  updateFinalMarksSchema,
  academicQuerySchema,
  analyticsQuerySchema,
  studentParamsSchema,
  subjectParamsSchema,
  academicRecordParamsSchema,
  bulkMarksUpdateSchema,
  updateAcademicStatusSchema
};