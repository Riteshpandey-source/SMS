/**
 * Tenant Context Middleware
 * 
 * Extracts and attaches tenantId to the request object after authentication.
 * NEVER trusts frontend-supplied tenantId for non-super-admin users.
 * 
 * Usage: router.get('/data', authenticate, tenantContext, handler)
 */

const tenantContext = (req, res, next) => {
  // Must run AFTER authenticate middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication is required before tenant context can be established',
        timestamp: new Date().toISOString()
      }
    });
  }

  if (req.user.role === 'super_admin') {
    // Super Admin can specify a target tenant via header for management operations
    // Default to 'platform' scope if no tenant specified
    req.tenantId = req.headers['x-tenant-id'] || 'platform';
    req.isSuperAdmin = true;
  } else {
    // All other roles: derive tenantId from the authenticated user's data
    req.tenantId = req.user.tenantId;
    req.isSuperAdmin = false;
  }

  if (!req.tenantId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TENANT_CONTEXT_MISSING',
        message: 'Unable to determine institution context. Please log in again.',
        timestamp: new Date().toISOString()
      }
    });
  }

  const { tenantStorage } = require('../utils/tenantMongoosePlugin');
  tenantStorage.run(req.tenantId, () => {
    next();
  });
};

/**
 * Optional: Require a specific tenant context (not 'platform')
 * Use when an endpoint must operate within an institution scope.
 */
const requireTenantScope = (req, res, next) => {
  if (!req.tenantId || req.tenantId === 'platform') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TENANT_SCOPE_REQUIRED',
        message: 'This operation requires an institution context. Super Admins must specify X-Tenant-Id header.',
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

module.exports = { tenantContext, requireTenantScope };
