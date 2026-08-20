const Joi = require('joi');

// Note upload validation schema
const uploadNoteSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters'
    }),

  subject: Joi.string()
    .trim()
    .max(50)
    .required()
    .messages({
      'string.empty': 'Subject is required',
      'string.max': 'Subject cannot exceed 50 characters'
    }),

  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL')
    .optional()
    .messages({
      'any.only': 'Invalid department code'
    }),

  academicYear: Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(4),
      Joi.array().items(Joi.number().integer().min(1).max(4)).min(1)
    )
    .required()
    .messages({
      'any.required': 'Academic year is required',
      'number.min': 'Academic year must be between 1 and 4',
      'number.max': 'Academic year must be between 1 and 4',
      'array.min': 'At least one academic year must be specified'
    }),

  category: Joi.string()
    .valid('lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other')
    .default('lecture')
    .messages({
      'any.only': 'Invalid note category'
    }),

  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(30)),
      Joi.string()
    )
    .optional()
    .messages({
      'string.max': 'Tag cannot exceed 30 characters'
    })
});

// Note update validation schema
const updateNoteSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),

  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .optional()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters'
    }),

  subject: Joi.string()
    .trim()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Subject cannot exceed 50 characters'
    }),

  academicYear: Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(4),
      Joi.array().items(Joi.number().integer().min(1).max(4)).min(1)
    )
    .optional()
    .messages({
      'number.min': 'Academic year must be between 1 and 4',
      'number.max': 'Academic year must be between 1 and 4',
      'array.min': 'At least one academic year must be specified'
    }),

  category: Joi.string()
    .valid('lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other')
    .optional()
    .messages({
      'any.only': 'Invalid note category'
    }),

  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(30)),
      Joi.string()
    )
    .optional()
    .messages({
      'string.max': 'Tag cannot exceed 30 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Notes search and filter validation schema
const getNotesQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL')
    .optional()
    .messages({
      'any.only': 'Invalid department code'
    }),

  academicYear: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .optional()
    .messages({
      'number.base': 'Academic year must be a number',
      'number.integer': 'Academic year must be an integer',
      'number.min': 'Academic year must be between 1 and 4',
      'number.max': 'Academic year must be between 1 and 4'
    }),

  subject: Joi.string()
    .trim()
    .optional(),

  category: Joi.string()
    .valid('lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other')
    .optional()
    .messages({
      'any.only': 'Invalid note category'
    }),

  uploaderRole: Joi.string()
    .valid('student', 'faculty', 'admin')
    .optional()
    .messages({
      'any.only': 'Invalid uploader role'
    }),

  search: Joi.string()
    .trim()
    .optional(),

  sortBy: Joi.string()
    .valid('createdAt', 'downloads', 'views', 'rating.average', 'title')
    .default('createdAt')
    .messages({
      'any.only': 'Invalid sort field'
    }),

  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort order must be asc or desc'
    })
});

// Note rating validation schema
const rateNoteSchema = Joi.object({
  rating: Joi.number()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be between 1 and 5',
      'number.max': 'Rating must be between 1 and 5',
      'any.required': 'Rating is required'
    })
});

// Note report validation schema
const reportNoteSchema = Joi.object({
  reason: Joi.string()
    .valid('inappropriate', 'copyright', 'spam', 'incorrect', 'other')
    .required()
    .messages({
      'any.only': 'Invalid report reason',
      'any.required': 'Report reason is required'
    }),

  description: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Report description cannot exceed 200 characters'
    })
});

module.exports = {
  uploadNoteSchema,
  updateNoteSchema,
  getNotesQuerySchema,
  rateNoteSchema,
  reportNoteSchema
};