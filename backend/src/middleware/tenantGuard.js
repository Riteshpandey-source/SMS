/**
 * Tenant Guard Middleware
 * 
 * Validates that the tenant exists and is active/not-suspended.
 * Should run AFTER tenantContext middleware.
 * 
 * Usage: router.get('/data', authenticate, tenantContext, tenantGuard, handler)
 */

const Tenant = require('../models/Tenant');

const tenantGuard = async (req, res, next) => {
  // Skip for platform-level super admin operations
  if (req.tenantId === 'platform' && req.isSuperAdmin) {
    return next();
  }

  try {
    const tenant = await Tenant.findOne({ tenantId: req.tenantId });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Institution not found. Please contact support.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!tenant.isActive || tenant.status === 'inactive') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_INACTIVE',
          message: 'This institution account is currently inactive. Please contact the administrator.',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_SUSPENDED',
          message: 'This institution account has been suspended. Please contact CampusBuddy support.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check subscription validity
    if (tenant.subscriptionEndDate && tenant.subscriptionEndDate < new Date()) {
      if (tenant.subscriptionStatus !== 'active') {
        return res.status(402).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_EXPIRED',
            message: 'Your institution\'s subscription has expired. Please renew to continue.',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Attach tenant data to request for downstream use
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error('Tenant guard error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CHECK_FAILED',
        message: 'Unable to verify institution status. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = { tenantGuard };
