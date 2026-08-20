const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Import controllers and middleware
const userController = require('../controllers/userController');
const avatarController = require('../controllers/avatarController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, validateFile } = require('../middleware/validation');
const { apiRateLimiter, uploadRateLimiter } = require('../middleware/rateLimiter');

// Import validation schemas
const {
  updateProfileSchema,
  changePasswordSchema,
  searchUsersSchema
} = require('../validation/userValidation');

// Additional validation schemas
const Joi = require('joi');

const getUserParamsSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid user ID format'
  })
});

const avatarParamsSchema = Joi.object({
  userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid user ID format'
  }),
  size: Joi.string().valid('thumbnail', 'small', 'medium', 'large').default('medium')
});

const deactivateAccountSchema = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': 'Password is required to deactivate account'
  })
});

const preferencesSchema = Joi.object({
  emailNotifications: Joi.boolean(),
  pushNotifications: Joi.boolean(),
  theme: Joi.string().valid('light', 'dark'),
  language: Joi.string().valid('en', 'es', 'fr', 'de'),
  timezone: Joi.string()
});

const adminManagedUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().optional().allow('', null),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .optional()
    .allow('', null),
  role: Joi.string().valid('student', 'faculty', 'admin').required(),
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', 'Administration')
    .when('role', {
      is: Joi.valid('student', 'faculty'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  academicYear: Joi.number().integer().min(1).max(4).when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional().allow(null)
  }),
  section: Joi.string().trim().max(10).when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null)
  }),
  rollNumber: Joi.string().trim().max(30).optional().allow('', null),
  accessibleYears: Joi.array().items(
    Joi.number().integer().min(1).max(4)
  ).when('role', {
    is: 'faculty',
    then: Joi.array().items(Joi.number().integer().min(1).max(4)).min(1).required(),
    otherwise: Joi.optional().allow(null)
  }),
  accessibleSubjects: Joi.array().items(
    Joi.object({
      subjectCode: Joi.string().trim().uppercase().optional().allow(''),
      subjectName: Joi.string().trim().required(),
      academicYears: Joi.array().items(
        Joi.number().integer().min(1).max(4)
      ).min(1).required(),
      isActive: Joi.boolean().optional()
    })
  ).optional(),
  isActive: Joi.boolean().optional()
}).custom((value, helpers) => {
  if (value.role !== 'student' && !value.email) {
    return helpers.error('any.custom', {
      message: 'Email is required for faculty and admin users'
    });
  }

  if (value.role !== 'student' && !value.password) {
    return helpers.error('any.custom', {
      message: 'Password is required for faculty and admin users'
    });
  }

  return value;
}, 'managed user validation').messages({
  'any.custom': '{{#message}}'
});

const adminUpdateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().optional().allow('', null),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .optional()
    .allow('', null),
  role: Joi.string().valid('student', 'faculty', 'admin').required(),
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', 'Administration')
    .when('role', {
      is: Joi.valid('student', 'faculty'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
  academicYear: Joi.number().integer().min(1).max(4).when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional().allow(null)
  }),
  section: Joi.string().trim().max(10).when('role', {
    is: 'student',
    then: Joi.required(),
    otherwise: Joi.optional().allow('', null)
  }),
  rollNumber: Joi.string().trim().max(30).optional().allow('', null),
  accessibleYears: Joi.array().items(
    Joi.number().integer().min(1).max(4)
  ).when('role', {
    is: 'faculty',
    then: Joi.array().items(Joi.number().integer().min(1).max(4)).min(1).required(),
    otherwise: Joi.optional().allow(null)
  }),
  accessibleSubjects: Joi.array().items(
    Joi.object({
      subjectCode: Joi.string().trim().uppercase().optional().allow(''),
      subjectName: Joi.string().trim().required(),
      academicYears: Joi.array().items(
        Joi.number().integer().min(1).max(4)
      ).min(1).required(),
      isActive: Joi.boolean().optional()
    })
  ).optional(),
  isActive: Joi.boolean().required()
}).custom((value, helpers) => {
  if (value.role !== 'student' && !value.email) {
    return helpers.error('any.custom', {
      message: 'Email is required for faculty and admin users'
    });
  }

  return value;
}, 'managed user update validation').messages({
  'any.custom': '{{#message}}'
});

const bulkStudentCreateSchema = Joi.object({
  department: Joi.string()
    .valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL', 'Administration')
    .required(),
  academicYear: Joi.number().integer().min(1).max(4).required(),
  section: Joi.string().trim().max(10).required(),
  isActive: Joi.boolean().optional(),
  students: Joi.array().items(
    Joi.object({
      name: Joi.string().trim().min(2).max(50).required(),
      rollNumber: Joi.string().trim().max(30).optional().allow('', null)
    })
  ).min(1).required()
});

// Import enhanced file upload middleware
const { createAvatarUpload, handleMulterError } = require('../middleware/fileUpload');

// Configure avatar upload
const avatarUpload = createAvatarUpload();

// Apply rate limiting to all user routes
router.use(apiRateLimiter);

// Protected routes (authentication required)

// GET /api/users/profile - Get current user profile
router.get('/profile',
  authenticate,
  userController.getProfile
);

// PUT /api/users/profile - Update user profile
router.put('/profile',
  authenticate,
  validateBody(updateProfileSchema),
  userController.updateProfile
);
// PATCH /api/users/personal-tracker - Update student personal tracker
router.patch('/personal-tracker',
  authenticate,
  validateBody(Joi.object({
    personalDeadlines: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      dueDate: Joi.date().required(),
      color: Joi.string().optional()
    })).optional(),
    personalProgress: Joi.array().items(Joi.object({
      semester: Joi.string().required(),
      gpa: Joi.number().min(0).max(10).required(),
      max: Joi.number().default(10),
      color: Joi.string().optional()
    })).optional()
  })),
  userController.updatePersonalTracker
);

// POST /api/users/change-password - Change password
router.post('/change-password',
  authenticate,
  validateBody(changePasswordSchema),
  userController.changePassword
);

// GET /api/users/dashboard - Get dashboard data
router.get('/dashboard',
  authenticate,
  userController.getDashboard
);

// POST /api/users/avatar - Upload avatar
router.post('/avatar',
  authenticate,
  uploadRateLimiter,
  avatarUpload.single('avatar'),
  handleMulterError,
  userController.uploadAvatar
);

// DELETE /api/users/avatar - Delete avatar
router.delete('/avatar',
  authenticate,
  userController.deleteAvatar
);

// GET /api/users/avatar/:userId/:size? - Get user avatar
router.get('/avatar/:userId/:size?',
  validateParams(avatarParamsSchema),
  avatarController.getAvatar
);

// GET /api/users/avatar-info/:userId - Get avatar information
router.get('/avatar-info/:userId',
  validateParams(Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })),
  avatarController.getAvatarInfo
);

// POST /api/users/deactivate - Deactivate account
router.post('/deactivate',
  authenticate,
  validateBody(deactivateAccountSchema),
  userController.deactivateAccount
);

// GET /api/users/preferences - Get user preferences
router.get('/preferences',
  authenticate,
  userController.getPreferences
);

// PUT /api/users/preferences - Update user preferences
router.put('/preferences',
  authenticate,
  validateBody(preferencesSchema),
  userController.updatePreferences
);

// Public routes (no authentication required, but may have optional auth)

// GET /api/users/search - Search users (requires authentication)
router.get('/search',
  authenticate,
  validateQuery(searchUsersSchema),
  userController.searchUsers
);

// GET /api/users/students - Get faculty's assigned students (or all active students if admin)
router.get('/students',
  authenticate,
  authorize('faculty', 'admin'),
  userController.getAssignedStudents
);

// GET /api/users/faculty - Get student's assigned faculty (or all active faculty if admin)
router.get('/faculty',
  authenticate,
  authorize('student', 'admin'),
  userController.getAssignedFaculty
);

// GET /api/users/:id - Get user by ID (public info)
router.get('/:id',
  validateParams(getUserParamsSchema),
  userController.getUserById
);

// Admin routes

// POST /api/users - Create user (admin only)
router.post('/',
  authenticate,
  authorize('admin'),
  validateBody(adminManagedUserSchema),
  userController.createUser
);

router.post('/bulk-students',
  authenticate,
  authorize('admin'),
  validateBody(bulkStudentCreateSchema),
  userController.bulkCreateStudents
);

// GET /api/users - Get all users (admin only)
router.get('/',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        department,
        isActive,
        sortBy = 'createdAt',
        sort = 'desc'
      } = req.query;

      // Build filter criteria
      const filter = {};
      if (role) filter.role = role;
      if (req.user.department && req.user.department !== 'Administration') {
        filter.department = req.user.department;
      } else if (department) {
        filter.department = department;
      }
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const limitNum = parseInt(limit);

      // Sort
      const sortOrder = sort === 'asc' ? 1 : -1;
      const sortObj = { [sortBy]: sortOrder };

      // Execute query
      const [users, total] = await Promise.all([
        require('../models/User').find(filter)
          .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum),
        require('../models/User').countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            hasNext: skip + limitNum < total,
            hasPrev: page > 1
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USERS_ERROR',
          message: 'Failed to retrieve users',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// PUT /api/users/:facultyId/accessible-years - Update faculty accessible years (admin only)
router.put('/:facultyId/accessible-years',
  authenticate,
  authorize('admin'),
  validateParams(Joi.object({
    facultyId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid faculty ID format'
    })
  })),
  validateBody(Joi.object({
    accessibleYears: Joi.array().items(
      Joi.number().integer().min(1).max(4)
    ).min(1).required().messages({
      'array.min': 'At least one accessible year must be specified',
      'any.required': 'Accessible years are required'
    }),
    accessibleSubjects: Joi.array().items(
      Joi.object({
        subjectCode: Joi.string().trim().uppercase().optional(),
        subjectName: Joi.string().trim().required(),
        academicYears: Joi.array().items(
          Joi.number().integer().min(1).max(4)
        ).min(1).required(),
        isActive: Joi.boolean().optional()
      })
    ).optional()
  })),
  userController.updateFacultyAccessibleYears
);

// PUT /api/users/:id - Update user (admin only)
router.put('/:id',
  authenticate,
  authorize('admin'),
  validateParams(getUserParamsSchema),
  validateBody(adminUpdateUserSchema),
  userController.updateUser
);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id',
  authenticate,
  authorize('admin'),
  validateParams(getUserParamsSchema),
  userController.deleteUser
);

// PUT /api/users/:id/status - Update user status (admin only)
router.put('/:id/status',
  authenticate,
  authorize('admin'),
  validateParams(getUserParamsSchema),
  validateBody(Joi.object({
    isActive: Joi.boolean().required()
  })),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await require('../models/User').findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      if (req.user.department && req.user.department !== 'Administration' && user.department !== req.user.department && user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEPARTMENT_ACCESS_DENIED',
            message: 'You can only update users from your own department',
            timestamp: new Date().toISOString()
          }
        });
      }

      user.isActive = isActive;
      await user.save();

      // If deactivating, invalidate all sessions
      if (!isActive) {
        const sessionManager = require('../utils/sessionManager');
        await sessionManager.invalidateAllUserSessions(user._id);
      }

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isActive: user.isActive
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_USER_STATUS_ERROR',
          message: 'Failed to update user status',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
);

// POST /api/users/batch-process-avatars - Batch process old avatars (admin only)
router.post('/batch-process-avatars',
  authenticate,
  authorize('admin'),
  avatarController.batchProcessAvatars
);

// Health check for user service
router.get('/health/check',
  (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'User Management Service',
        status: 'operational',
        features: {
          profileManagement: true,
          avatarUpload: true,
          userSearch: true,
          preferences: true,
          accountDeactivation: true,
          assignmentAware: true,
          studentFacultyMapping: true
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;
