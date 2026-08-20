const User = require('../models/User');
const tokenBlacklist = require('../utils/tokenBlacklist');
const { verifyAccessToken } = require('../utils/jwt');
const { tenantContext } = require('./tenantContext');
const { tenantGuard } = require('./tenantGuard');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = authHeader.split(' ')[1];
    const blacklisted = await tokenBlacklist.isBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Session has expired. Please log in again.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or inactive',
          timestamp: new Date().toISOString()
        }
      });
    }

    req.user = user;
    req.token = token;
    
    // Setup tenant context (including super admin overrides)
    if (user.role === 'super_admin') {
      req.tenantId = req.headers['x-tenant-id'] || 'platform';
      req.isSuperAdmin = true;
    } else {
      req.tenantId = user.tenantId;
      req.isSuperAdmin = false;
    }
    
    const { tenantStorage } = require('../utils/tenantMongoosePlugin');
    return tenantStorage.run(req.tenantId, () => next());
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const authenticate = [authenticateToken, tenantContext, tenantGuard];

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have permission to access this resource',
        timestamp: new Date().toISOString()
      }
    });
  }

  return next();
};

const facultyOrAdmin = authorize('faculty', 'admin', 'institution_admin', 'super_admin');

const selfOrAdmin = (req, res, next) => {
  const targetId = req.params.studentId || req.params.id || req.params.userId;

  if (req.user?.role === 'admin' || req.user?.role === 'institution_admin' || req.user?.role === 'super_admin') {
    return next();
  }

  if (targetId && req.user?._id?.toString() === targetId.toString()) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'ACCESS_DENIED',
      message: 'You do not have permission to access this resource',
      timestamp: new Date().toISOString()
    }
  });
};

const parentOnly = authorize('parent');

const validateParentChildRelationship = async (req, res, next) => {
  try {
    if (req.user?.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This route is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const User = require('../models/User');
    let child = null;
    if (req.user.childId) {
      child = await User.findById(req.user.childId).select('name email department academicYear isActive');
    }
    if (!child || !child.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CHILD_NOT_FOUND',
          message: 'No linked student found for this parent account. Please contact admin.',
          timestamp: new Date().toISOString()
        }
      });
    }

    req.child = child;
    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'PARENT_RELATIONSHIP_ERROR',
        message: 'Failed to validate parent-child relationship',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const readOnlyForParents = (req, res, next) => {
  const allowedMethods = ['GET', 'HEAD', 'OPTIONS'];

  if (req.user?.role === 'parent' && !allowedMethods.includes(req.method)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'READ_ONLY_ACCESS',
        message: 'Parent access is read-only',
        timestamp: new Date().toISOString()
      }
    });
  }

  return next();
};

const superAdminOnly = authorize('super_admin');
const institutionAdminOrAbove = authorize('institution_admin', 'super_admin');

module.exports = {
  authenticate,
  authorize,
  facultyOrAdmin,
  selfOrAdmin,
  parentOnly,
  superAdminOnly,
  institutionAdminOrAbove,
  readOnlyForParents,
  validateParentChildRelationship
};
