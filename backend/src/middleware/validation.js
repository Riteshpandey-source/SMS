const Joi = require('joi');

// Generic validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });

    if (error) {
      console.log('Validation failed:', error.details.map(d => `${d.path.join('.')}: ${d.message}`).join(', '));
      
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Validate request body
const validateBody = (schema) => validate(schema, 'body');

// Validate query parameters
const validateQuery = (schema) => validate(schema, 'query');

// Validate URL parameters
const validateParams = (schema) => validate(schema, 'params');

// Validate headers
const validateHeaders = (schema) => validate(schema, 'headers');

// Common validation schemas
const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('Invalid ObjectId format'),

  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('asc', 'desc', '1', '-1').default('desc'),
    sortBy: Joi.string().default('createdAt')
  }),

  // Search parameters
  search: Joi.object({
    query: Joi.string().trim().min(1).max(100),
    fields: Joi.array().items(Joi.string()).default(['name', 'title', 'description'])
  }),

  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),

  // File upload validation
  fileUpload: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().max(10 * 1024 * 1024) // 10MB max
  })
};

// Sanitization helpers
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

// Sanitization middleware
const sanitize = (source = 'body') => {
  return (req, res, next) => {
    if (req[source]) {
      req[source] = sanitizeInput(req[source]);
    }
    next();
  };
};

// Combined validation and sanitization
const validateAndSanitize = (schema, source = 'body') => {
  return [
    sanitize(source),
    validate(schema, source)
  ];
};

// File validation middleware
const validateFile = (options = {}) => {
  const {
    required = false,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    fieldName = 'file'
  } = options;

  return (req, res, next) => {
    const file = req.file || req.files?.[fieldName];

    if (!file && required) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: `File upload is required for field: ${fieldName}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (file) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    next();
  };
};

// Multiple files validation
const validateFiles = (options = {}) => {
  const {
    required = false,
    maxFiles = 5,
    maxSize = 10 * 1024 * 1024, // 10MB per file
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    fieldName = 'files'
  } = options;

  return (req, res, next) => {
    const files = req.files?.[fieldName] || req.files || [];

    if (files.length === 0 && required) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILES_REQUIRED',
          message: `File uploads are required for field: ${fieldName}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (files.length > maxFiles) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: `Maximum ${maxFiles} files allowed`,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate each file
    for (const file of files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File "${file.originalname}" exceeds maximum size of ${maxSize / (1024 * 1024)}MB`,
            timestamp: new Date().toISOString()
          }
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File "${file.originalname}" has invalid type. Allowed types: ${allowedTypes.join(', ')}`,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    next();
  };
};

// Custom validation for specific business rules
const customValidation = (validatorFn, errorMessage = 'Custom validation failed') => {
  return async (req, res, next) => {
    try {
      const isValid = await validatorFn(req);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CUSTOM_VALIDATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString()
          }
        });
      }
      next();
    } catch (error) {
      console.error('Custom validation error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

// Event validation schemas
const eventSchemas = {
  createEvent: Joi.object({
    title: Joi.string().trim().min(3).max(100).required()
      .messages({
        'string.min': 'Event title must be at least 3 characters long',
        'string.max': 'Event title cannot exceed 100 characters',
        'any.required': 'Event title is required'
      }),
    
    description: Joi.string().trim().min(3).max(1000).required()
      .messages({
        'string.min': 'Event description must be at least 3 characters long',
        'string.max': 'Event description cannot exceed 1000 characters',
        'any.required': 'Event description is required'
      }),
    
    date: Joi.date().iso().required()
      .messages({
        'any.required': 'Event date is required'
      }),
    
    endDate: Joi.date().iso().min(Joi.ref('date')).optional()
      .messages({
        'date.min': 'End date must be after start date'
      }),
    
    location: Joi.string().trim().min(1).max(200).required()
      .messages({
        'string.min': 'Location is required',
        'string.max': 'Location cannot exceed 200 characters',
        'any.required': 'Event location is required'
      }),
    
    category: Joi.string().valid('academic', 'cultural', 'sports', 'technical', 'workshop', 'seminar', 'conference', 'competition', 'other')
      .default('academic'),
    
    targetDepartments: Joi.array().items(
      Joi.string().valid('CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'ALL')
    ).min(1).default(['ALL']),
    
    targetAcademicYears: Joi.array().items(
      Joi.number().integer().min(1).max(4)
    ).min(1).default([1, 2, 3, 4]),
    
    maxAttendees: Joi.number().integer().min(1).max(10000).optional().allow(null, ''),
    
    registrationDeadline: Joi.date().iso().optional().allow(null, ''),
    
    registrationRequired: Joi.boolean().default(true),
    
    contactEmail: Joi.string().email().optional().allow(null, ''),
    
    contactPhone: Joi.string().optional().allow(null, ''),
    
    tags: Joi.array().items(
      Joi.string().trim().max(30)
    ).max(10).default([]),
    
    isPublic: Joi.boolean().default(true),
    
    requiresApproval: Joi.boolean().default(false)
  }),
  
  updateEvent: Joi.object({
    title: Joi.string().trim().min(3).max(100).optional(),
    description: Joi.string().trim().min(10).max(1000).optional(),
    date: Joi.date().iso().min('now').optional(),
    endDate: Joi.date().iso().optional(),
    location: Joi.string().trim().max(200).optional(),
    category: Joi.string().valid('academic', 'cultural', 'sports', 'workshop', 'seminar', 'conference', 'competition', 'other').optional(),
    targetDepartments: Joi.array().items(Joi.string().valid('CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'ALL')).min(1).optional(),
    targetAcademicYears: Joi.array().items(Joi.number().integer().min(1).max(4)).min(1).optional(),
    maxAttendees: Joi.number().integer().min(1).max(10000).optional(),
    registrationDeadline: Joi.date().iso().optional(),
    registrationRequired: Joi.boolean().optional(),
    contactEmail: Joi.string().email().optional(),
    contactPhone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(10).optional(),
    isPublic: Joi.boolean().optional(),
    status: Joi.string().valid('draft', 'published', 'ongoing', 'completed', 'cancelled').optional()
  }).custom((value, helpers) => {
    // Custom validation for date relationships
    if (value.endDate && value.date && new Date(value.endDate) <= new Date(value.date)) {
      return helpers.error('custom.endDateAfterStartDate');
    }
    if (value.registrationDeadline && value.date && new Date(value.registrationDeadline) > new Date(value.date)) {
      return helpers.error('custom.registrationDeadlineBeforeEventDate');
    }
    return value;
  }).messages({
    'custom.endDateAfterStartDate': 'End date must be after start date',
    'custom.registrationDeadlineBeforeEventDate': 'Registration deadline must be before event date'
  })
};

// Event validation middleware
const validateEvent = validateBody(eventSchemas.createEvent);
const validateEventUpdate = validateBody(eventSchemas.updateEvent);

module.exports = {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  validateAndSanitize,
  validateFile,
  validateFiles,
  customValidation,
  sanitize,
  sanitizeInput,
  commonSchemas,
  eventSchemas,
  validateEvent,
  validateEventUpdate
};