const Joi = require('joi');

/**
 * Validation schemas for assignment-related operations
 */

// Schema for assignment ID parameter validation
const assignmentIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid assignment ID format',
      'string.empty': 'Assignment ID is required'
    })
});

// Schema for refresh assignments request
const refreshAssignmentsSchema = Joi.object({
  force: Joi.boolean()
    .default(false)
    .description('Force refresh even if assignments are recent')
});

// Schema for bulk refresh confirmation
const bulkRefreshSchema = Joi.object({
  confirm: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Confirmation required for bulk refresh operation',
      'boolean.base': 'Confirmation must be a boolean value'
    }),
  reason: Joi.string()
    .max(200)
    .optional()
    .description('Optional reason for bulk refresh')
});

// Schema for assignment query parameters
const assignmentQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .description('Page number for pagination'),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .description('Number of items per page'),
  
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'Administration')
    .optional()
    .description('Filter by department'),
  
  academicYear: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .optional()
    .description('Filter by academic year'),
  
  assignmentSource: Joi.string()
    .valid('automatic', 'manual', 'admin')
    .optional()
    .description('Filter by assignment source'),
  
  isActive: Joi.boolean()
    .default(true)
    .description('Filter by assignment status'),
  
  sortBy: Joi.string()
    .valid('assignedAt', 'lastUpdated', 'academicYear', 'department')
    .default('assignedAt')
    .description('Field to sort by'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .description('Sort order')
});

// Schema for manual assignment creation (admin only)
const createAssignmentSchema = Joi.object({
  studentId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid student ID format',
      'string.empty': 'Student ID is required'
    }),
  
  facultyId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid faculty ID format',
      'string.empty': 'Faculty ID is required'
    }),
  
  assignmentSource: Joi.string()
    .valid('manual', 'admin')
    .default('admin')
    .description('Source of the assignment'),
  
  notes: Joi.string()
    .max(500)
    .optional()
    .description('Optional notes about the assignment')
});

// Schema for assignment update (admin only)
const updateAssignmentSchema = Joi.object({
  isActive: Joi.boolean()
    .optional()
    .description('Update assignment status'),
  
  notes: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .description('Update assignment notes'),
  
  assignmentSource: Joi.string()
    .valid('manual', 'admin')
    .optional()
    .description('Update assignment source')
});

// Schema for assignment statistics query
const assignmentStatsQuerySchema = Joi.object({
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'Administration')
    .optional()
    .description('Filter statistics by department'),
  
  academicYear: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .optional()
    .description('Filter statistics by academic year'),
  
  dateRange: Joi.string()
    .valid('week', 'month', 'semester', 'year', 'all')
    .default('month')
    .description('Date range for statistics'),
  
  includeInactive: Joi.boolean()
    .default(false)
    .description('Include inactive assignments in statistics')
});

// Schema for unassigned students query
const unassignedStudentsQuerySchema = Joi.object({
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'Administration')
    .optional()
    .description('Filter by department'),
  
  academicYear: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .optional()
    .description('Filter by academic year'),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .default(100)
    .description('Maximum number of unassigned students to return')
});

// Schema for assignment validation request
const validateAssignmentsQuerySchema = Joi.object({
  fixIssues: Joi.boolean()
    .default(false)
    .description('Automatically fix detected issues'),
  
  includeDetails: Joi.boolean()
    .default(true)
    .description('Include detailed information about issues'),
  
  checkType: Joi.string()
    .valid('all', 'references', 'departments', 'years', 'duplicates')
    .default('all')
    .description('Type of validation checks to perform')
});

module.exports = {
  assignmentIdSchema,
  refreshAssignmentsSchema,
  bulkRefreshSchema,
  assignmentQuerySchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  assignmentStatsQuerySchema,
  unassignedStudentsQuerySchema,
  validateAssignmentsQuerySchema
};