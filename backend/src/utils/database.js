const mongoose = require('mongoose');

/**
 * Database utility functions
 */

// Check if ObjectId is valid
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Convert string to ObjectId
const toObjectId = (id) => {
  if (!isValidObjectId(id)) {
    throw new Error('Invalid ObjectId format');
  }
  return new mongoose.Types.ObjectId(id);
};

// Pagination helper
const getPaginationOptions = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    skip
  };
};

// Build pagination response
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// Build sort options from query string
const buildSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};

// Build filter options for text search
const buildTextSearchFilter = (searchTerm, fields = []) => {
  if (!searchTerm || fields.length === 0) {
    return {};
  }
  
  const searchRegex = new RegExp(searchTerm, 'i');
  return {
    $or: fields.map(field => ({
      [field]: searchRegex
    }))
  };
};

// Transaction helper
const withTransaction = async (operations) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const result = await operations(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Aggregation pipeline helpers
const buildMatchStage = (filters) => {
  const matchConditions = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        matchConditions[key] = { $in: value };
      } else if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
        matchConditions[key] = toObjectId(value);
      } else {
        matchConditions[key] = value;
      }
    }
  });
  
  return matchConditions;
};

// Build lookup stage for population
const buildLookupStage = (from, localField, foreignField, as, pipeline = []) => {
  const lookupStage = {
    $lookup: {
      from,
      localField,
      foreignField,
      as
    }
  };
  
  if (pipeline.length > 0) {
    lookupStage.$lookup.pipeline = pipeline;
  }
  
  return lookupStage;
};

// Error handling for database operations
const handleDBError = (error, operation = 'Database operation') => {
  console.error(`❌ ${operation} error:`, error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    throw new Error(`Validation failed: ${messages.join(', ')}`);
  }
  
  if (error.name === 'CastError') {
    throw new Error('Invalid ID format');
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    throw new Error(`${field} already exists`);
  }
  
  throw error;
};

module.exports = {
  isValidObjectId,
  toObjectId,
  getPaginationOptions,
  buildPaginationResponse,
  buildSortOptions,
  buildTextSearchFilter,
  withTransaction,
  buildMatchStage,
  buildLookupStage,
  handleDBError
};