const express = require('express');
const router = express.Router();

// Import controllers and middleware
const authController = require('../controllers/authController');
const parentController = require('../controllers/parentController');
const { authenticate } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { 
  authRateLimiter, 
  registerRateLimiter, 
  passwordResetRateLimiter 
} = require('../middleware/rateLimiter');

// Import validation schemas
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validation/userValidation');

// Validation schemas for auth-specific endpoints
const Joi = require('joi');

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required'
  })
});

const logoutSchema = Joi.object({
  sessionId: Joi.string().optional()
});

const verifyEmailParamsSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Verification token is required'
  })
});

const revokeSessionParamsSchema = Joi.object({
  sessionId: Joi.string().required().messages({
    'string.empty': 'Session ID is required'
  })
});

// Parent-specific validation schemas
const parentRegisterSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address'
  }),
  password: Joi.string().min(8).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long'
  }),
  childEmail: Joi.string().email().required().messages({
    'string.empty': 'Child email is required',
    'string.email': 'Please provide a valid child email address'
  })
});

const parentLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Please provide a valid email address'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

const verifyChildSchema = Joi.object({
  childEmail: Joi.string().email().required().messages({
    'string.empty': 'Child email is required',
    'string.email': 'Please provide a valid child email address'
  })
});

// Public routes (no authentication required)

// POST /api/auth/identify-tenant - Identify tenant by email, domain, or subdomain
router.post('/identify-tenant',
  authRateLimiter,
  authController.identifyTenant
);

// POST /api/auth/institution/register - Institution registration
router.post('/institution/register',
  registerRateLimiter,
  authController.registerInstitution
);

// POST /api/auth/register - User registration
router.post('/register', 
  registerRateLimiter,
  validateBody(registerSchema),
  authController.register
);

// POST /api/auth/login - User login
router.post('/login',
  authRateLimiter,
  validateBody(loginSchema),
  authController.login
);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh',
  validateBody(refreshTokenSchema),
  authController.refresh
);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password',
  passwordResetRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password',
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

// GET /api/auth/verify-email/:token - Verify email address
router.get('/verify-email/:token',
  validateParams(verifyEmailParamsSchema),
  authController.verifyEmail
);

// Parent authentication routes

// POST /api/auth/parent/register - Parent registration
router.post('/parent/register',
  registerRateLimiter,
  validateBody(parentRegisterSchema),
  parentController.registerParent
);

// POST /api/auth/parent/login - Parent login
router.post('/parent/login',
  authRateLimiter,
  validateBody(parentLoginSchema),
  parentController.loginParent
);

// POST /api/auth/parent/verify-child - Verify child relationship
router.post('/parent/verify-child',
  validateBody(verifyChildSchema),
  parentController.verifyChildRelationship
);

// Protected routes (authentication required)

// POST /api/auth/logout - Logout current session
router.post('/logout',
  authenticate,
  validateBody(logoutSchema),
  authController.logout
);

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all',
  authenticate,
  authController.logoutAll
);

// POST /api/auth/resend-verification - Resend email verification
router.post('/resend-verification',
  authenticate,
  authController.resendVerification
);

// GET /api/auth/sessions - Get user's active sessions
router.get('/sessions',
  authenticate,
  authController.getSessions
);

// DELETE /api/auth/sessions/:sessionId - Revoke specific session
router.delete('/sessions/:sessionId',
  authenticate,
  validateParams(revokeSessionParamsSchema),
  authController.revokeSession
);

// GET /api/auth/me - Get current user info (alternative to /users/profile)
router.get('/me',
  authenticate,
  (req, res) => {
    const { formatUserForPrivate } = require('../utils/userUtils');
    res.json({
      success: true,
      data: {
        user: formatUserForPrivate(req.user)
      },
      timestamp: new Date().toISOString()
    });
  }
);

// GET /api/auth/parent/profile - Get parent profile with child info
router.get('/parent/profile',
  authenticate,
  parentController.getParentProfile
);

// GET /api/auth/status - Check authentication status
router.get('/status',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      data: {
        authenticated: true,
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          isEmailVerified: req.user.isEmailVerified,
          lastActivity: req.user.lastActivity
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

// Health check for auth service
router.get('/health',
  (req, res) => {
    const emailUtils = require('../utils/email');
    
    res.json({
      success: true,
      data: {
        service: 'Authentication Service',
        status: 'operational',
        features: {
          registration: true,
          login: true,
          passwordReset: true,
          emailVerification: emailUtils.isConfigured(),
          sessionManagement: true,
          tokenRefresh: true
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;