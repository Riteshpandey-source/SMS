const Joi = require('joi');

// User registration validation schema
const registerSchema = Joi.object({
  name: Joi.any(),
  email: Joi.any(),
  password: Joi.any(),
  confirmPassword: Joi.any(),
  role: Joi.any(),
  department: Joi.any(),
  childEmail: Joi.any(),
  academicYear: Joi.any(),
  accessibleYears: Joi.any()
}).custom((_value, helpers) =>
  helpers.error('any.custom', {
    message: 'Student self-registration is disabled. Please contact admin for your account.'
  })
).messages({
  'any.custom': '{{#message}}'
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

// User profile update validation schema
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', 'Administration')
    .messages({
      'any.only': 'Invalid department code'
    }),
  
  academicYear: Joi.number()
    .integer()
    .min(1)
    .max(4)
    .messages({
      'number.base': 'Academic year must be a number',
      'number.integer': 'Academic year must be an integer',
      'number.min': 'Academic year must be between 1 and 4',
      'number.max': 'Academic year must be between 1 and 4'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'string.empty': 'New password confirmation is required'
    })
});

// Password reset request validation schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address'
    })
});

// Password reset validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'string.empty': 'Password confirmation is required'
    })
});

// User search validation schema
const searchUsersSchema = Joi.object({
  query: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'string.max': 'Search query cannot exceed 50 characters'
    }),
  
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', 'Administration')
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
  
  role: Joi.string()
    .valid('student', 'faculty', 'admin', 'parent')
    .optional()
    .messages({
      'any.only': 'Role must be either student, faculty, admin, or parent'
    }),
  
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
  
  sortBy: Joi.string()
    .valid('name', 'email', 'createdAt', 'reputation', 'academicYear')
    .default('reputation')
    .optional(),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  searchUsersSchema
};
