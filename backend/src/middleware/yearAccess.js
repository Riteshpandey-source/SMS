/**
 * Year Access Control Middleware
 * Validates faculty access to specific academic years based on their assigned accessible years
 */

/**
 * Validates if a user has access to specific academic years
 * @param {Object} user - User object with role and accessibleYears
 * @param {Array|Number} requiredYears - Years that need to be accessed
 * @returns {Object} - Validation result with isValid and details
 */
const validateUserYearAccess = (user, requiredYears) => {
  // Admin has access to all years
  if (user.role === 'admin') {
    return { isValid: true, hasAccess: true, message: 'Admin has full access' };
  }

  // Students can only access their own academic year
  if (user.role === 'student') {
    const years = Array.isArray(requiredYears) ? requiredYears : [requiredYears];
    const hasAccess = years.includes(user.academicYear);
    return {
      isValid: true,
      hasAccess,
      message: hasAccess ? 'Student has access to own year' : 'Student can only access own academic year',
      accessibleYears: [user.academicYear]
    };
  }

  // Faculty validation
  if (user.role === 'faculty') {
    if (!user.accessibleYears || user.accessibleYears.length === 0) {
      return {
        isValid: false,
        hasAccess: false,
        message: 'No accessible years configured for faculty',
        error: 'NO_ACCESSIBLE_YEARS'
      };
    }

    const years = Array.isArray(requiredYears) ? requiredYears : [requiredYears];
    const hasAccess = years.every(year => user.accessibleYears.includes(year));
    
    return {
      isValid: true,
      hasAccess,
      message: hasAccess ? 'Faculty has access to requested years' : 'Faculty does not have access to some requested years',
      accessibleYears: user.accessibleYears,
      requestedYears: years,
      deniedYears: years.filter(year => !user.accessibleYears.includes(year))
    };
  }

  return {
    isValid: false,
    hasAccess: false,
    message: 'Invalid user role for year access validation',
    error: 'INVALID_ROLE'
  };
};

/**
 * Middleware factory to validate year access for specific years
 * @param {Array|Number} requiredYears - Years that need to be accessed
 * @returns {Function} - Express middleware function
 */
const validateYearAccess = (requiredYears) => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for year access validation',
          timestamp: new Date().toISOString()
        }
      });
    }

    const validation = validateUserYearAccess(user, requiredYears);

    if (!validation.isValid) {
      return res.status(403).json({
        success: false,
        error: {
          code: validation.error || 'YEAR_ACCESS_VALIDATION_FAILED',
          message: validation.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!validation.hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'YEAR_ACCESS_DENIED',
          message: validation.message,
          details: {
            userRole: user.role,
            accessibleYears: validation.accessibleYears,
            requestedYears: validation.requestedYears,
            deniedYears: validation.deniedYears
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Add validation result to request for use in controllers
    req.yearAccess = validation;
    next();
  };
};

/**
 * Middleware to automatically filter queries by user's accessible years
 * Adds year filtering to req.query or req.body based on user's permissions
 */
const filterByAccessibleYears = () => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for year filtering',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Admin can access all years - no filtering needed
    if (user.role === 'admin') {
      req.yearFilter = { all: true };
      return next();
    }

    // Student filtering - only their academic year
    if (user.role === 'student') {
      req.yearFilter = {
        academicYear: user.academicYear,
        years: [user.academicYear]
      };
      return next();
    }

    // Faculty filtering - only their accessible years
    if (user.role === 'faculty') {
      if (!user.accessibleYears || user.accessibleYears.length === 0) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_ACCESSIBLE_YEARS',
            message: 'No accessible years configured for your account',
            timestamp: new Date().toISOString()
          }
        });
      }

      req.yearFilter = {
        academicYear: { $in: user.accessibleYears },
        years: user.accessibleYears
      };
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_ROLE',
        message: 'Invalid user role for year filtering',
        timestamp: new Date().toISOString()
      }
    });
  };
};

/**
 * Utility function to check if user has permission to access a specific year
 * @param {String} userId - User ID
 * @param {Number} targetYear - Year to check access for
 * @returns {Promise<Object>} - Permission check result
 */
const checkYearPermission = async (userId, targetYear) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      return {
        hasPermission: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      };
    }

    const validation = validateUserYearAccess(user, targetYear);
    
    return {
      hasPermission: validation.hasAccess,
      user: {
        id: user._id,
        role: user.role,
        accessibleYears: user.accessibleYears,
        academicYear: user.academicYear
      },
      validation
    };
  } catch (error) {
    console.error('Year permission check error:', error);
    return {
      hasPermission: false,
      error: 'PERMISSION_CHECK_ERROR',
      message: 'Failed to check year permission'
    };
  }
};

/**
 * Middleware to validate year parameter in request
 * Checks if the year parameter is valid (1-4) and user has access
 */
const validateYearParameter = () => {
  return (req, res, next) => {
    const year = req.params.year || req.query.year || req.body.year;

    if (year) {
      const yearNum = parseInt(year);
      
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_YEAR_PARAMETER',
            message: 'Academic year must be between 1 and 4',
            providedYear: year,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate user access to this year
      const user = req.user;
      if (user) {
        const validation = validateUserYearAccess(user, yearNum);
        
        if (!validation.hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'YEAR_ACCESS_DENIED',
              message: `You don't have access to ${yearNum}${yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th'} year content`,
              details: {
                requestedYear: yearNum,
                accessibleYears: validation.accessibleYears,
                userRole: user.role
              },
              timestamp: new Date().toISOString()
            }
          });
        }
      }

      req.validatedYear = yearNum;
    }

    next();
  };
};

/**
 * Get user's accessible years for frontend use
 * @param {Object} user - User object
 * @returns {Array} - Array of accessible years
 */
const getUserAccessibleYears = (user) => {
  if (!user) return [];
  
  if (user.role === 'admin') {
    return [1, 2, 3, 4]; // Admin can access all years
  }
  
  if (user.role === 'student') {
    return [user.academicYear]; // Student can only access their year
  }
  
  if (user.role === 'faculty') {
    return user.accessibleYears || []; // Faculty's assigned years
  }
  
  return [];
};

module.exports = {
  validateYearAccess,
  filterByAccessibleYears,
  checkYearPermission,
  validateYearParameter,
  validateUserYearAccess,
  getUserAccessibleYears
};