/**
 * Tenant Query Utility
 * 
 * Provides helpers to inject tenantId into database queries,
 * ensuring data isolation between institutions.
 */

/**
 * Add tenantId to a query filter object
 * @param {Object} query - The existing query filter
 * @param {string} tenantId - The tenant ID to scope by
 * @returns {Object} The scoped query
 */
const scopeQuery = (query, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for scoped queries');
  }
  return { ...query, tenantId };
};

/**
 * Add tenantId to a document being created
 * @param {Object} doc - The document data
 * @param {string} tenantId - The tenant ID to attach
 * @returns {Object} The document with tenantId
 */
const scopeDocument = (doc, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for scoped documents');
  }
  return { ...doc, tenantId };
};

/**
 * Add tenantId to an aggregation pipeline's $match stage
 * @param {Object} matchStage - The existing $match conditions
 * @param {string} tenantId - The tenant ID to scope by
 * @returns {Object} The scoped $match conditions
 */
const scopeAggregation = (matchStage, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for scoped aggregations');
  }
  return { ...matchStage, tenantId };
};

/**
 * Extract tenantId from request (set by auth middleware)
 * @param {Object} req - Express request object
 * @returns {string} The tenant ID
 */
const getTenantId = (req) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context not available. Ensure authenticate middleware runs first.');
  }
  return tenantId;
};

module.exports = {
  scopeQuery,
  scopeDocument,
  scopeAggregation,
  getTenantId
};
