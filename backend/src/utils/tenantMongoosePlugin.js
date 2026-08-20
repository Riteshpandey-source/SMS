const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

/**
 * Middleware to initialize the AsyncLocalStorage context with tenantId
 * This runs AFTER authenticate and tenantContext middlewares
 */
const tenantStorageMiddleware = (req, res, next) => {
  if (!req.tenantId) {
    return next();
  }
  
  tenantStorage.run(req.tenantId, () => {
    next();
  });
};

/**
 * Get the current tenant ID from AsyncLocalStorage
 */
const getCurrentTenantId = () => {
  return tenantStorage.getStore();
};

/**
 * Mongoose Plugin to automatically scope queries by tenantId
 */
const tenantMongoosePlugin = (schema, options = {}) => {
  const { tenantField = 'tenantId' } = options;

  // Add tenant field to schema if it doesn't exist
  if (!schema.path(tenantField)) {
    schema.add({
      [tenantField]: {
        type: String,
        index: true,
        trim: true
      }
    });
  }

  // Pre-validate hook to inject tenantId before required checks
  schema.pre('validate', function (next) {
    if (this.isNew) {
      const tenantId = getCurrentTenantId();
      // Allow overriding tenantId (e.g., in migration or super admin tasks)
      if (tenantId && !this[tenantField]) {
        this[tenantField] = tenantId;
      }
    }
    next();
  });

  // Pre-query hooks to inject tenantId filter
  const queryHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'update',
    'updateOne',
    'updateMany',
    'count',
    'countDocuments',
    'deleteMany',
    'deleteOne'
  ];

  queryHooks.forEach((hook) => {
    schema.pre(hook, function (next) {
      const tenantId = getCurrentTenantId();
      
      // If we're in a request context with a specific tenant
      if (tenantId && tenantId !== 'platform') {
        // Force the tenant filter
        this.where({ [tenantField]: tenantId });
      }
      
      next();
    });
  });

  // Handle aggregate queries
  schema.pre('aggregate', function (next) {
    const tenantId = getCurrentTenantId();
    if (tenantId && tenantId !== 'platform') {
      this.pipeline().unshift({ $match: { [tenantField]: tenantId } });
    }
    next();
  });
};

module.exports = {
  tenantStorage,
  tenantStorageMiddleware,
  getCurrentTenantId,
  tenantMongoosePlugin
};
