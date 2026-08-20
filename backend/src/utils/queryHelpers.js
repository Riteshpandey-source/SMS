/**
 * Database Query Helpers for Year-Based Access Control
 * Centralizes query building with year filtering for different content types
 */

const { validateUserYearAccess } = require('../middleware/yearAccess');

/**
 * Builds a MongoDB query with year filtering based on user's accessible years
 * @param {Object} user - User object with role and accessibleYears
 * @param {Object} baseQuery - Base MongoDB query object
 * @param {Object} options - Additional options for query building
 * @returns {Object} - Enhanced query with year filtering
 */
const buildYearFilterQuery = (user, baseQuery = {}, options = {}) => {
  const {
    yearField = 'academicYear', // Field name for academic year in the model
    allowMultipleYears = true,   // Whether content can belong to multiple years
    includeGlobal = false,       // Whether to include content marked as global/all years
    filterAdminContent = true    // Whether to filter admin content based on viewing user
  } = options;

  // Start with base query
  const query = { ...baseQuery };

  // For content viewing (not admin management), filter based on viewer's access
  if (filterAdminContent) {
    console.log('Applying admin content filtering for user:', user.role);
    
    // Student filtering - only their academic year and department
    if (user.role === 'student') {
      console.log('Student year filtering - user year:', user.academicYear);
      
      // Don't apply strict filtering here - let assignment middleware handle it
      // Only apply year filtering for admin content that specifically targets years
      if (allowMultipleYears) {
        // Content can belong to multiple years, check if student's year is included
        // But also allow content that doesn't specify years (global content)
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { [yearField]: { $in: [user.academicYear] } },
            { [yearField]: { $exists: false } },
            { [yearField]: { $size: 0 } }
          ]
        });
      } else {
        // Content belongs to single year
        query[yearField] = user.academicYear;
      }
      
      console.log('Student query after year filtering:', query);
      return query;
    }

    // Faculty filtering - only their accessible years and department
    if (user.role === 'faculty') {
      if (!user.accessibleYears || user.accessibleYears.length === 0) {
        // For backward compatibility, if faculty has no accessibleYears set, allow access to all years
        console.log('Faculty user has no accessibleYears set, allowing access to all years for backward compatibility');
        // Still apply department filtering even if no year filtering
        if (!query.department) {
          query.department = user.department;
        }
        return query;
      }

      if (allowMultipleYears) {
        // Content can belong to multiple years, check intersection with accessible years
        query[yearField] = { $in: user.accessibleYears };
      } else {
        // Content belongs to single year
        query[yearField] = { $in: user.accessibleYears };
      }
      
      // Ensure department matching for faculty - CRITICAL for admin content filtering
      if (!query.department) {
        query.department = user.department;
      }
      
      if (includeGlobal) {
        // Include content marked for all years
        query.$or = [
          { [yearField]: query[yearField] },
          { [yearField]: 'all' },
          { [yearField]: { $exists: false } }
        ];
        delete query[yearField];
      }
      
      return query;
    }
  }

  // Admin can access all content when managing (filterAdminContent = false)
  // or when viewing with no restrictions
  if (user.role === 'admin') {
    return query;
  }

  // Unknown role - return empty results
  query._id = { $in: [] };
  return query;
};

/**
 * Validates if user has access to specific target years
 * @param {Object} user - User object with role and accessibleYears
 * @param {Array|Number} targetYears - Years to validate access for
 * @returns {Object} - Validation result
 */
const validateYearAccess = (user, targetYears) => {
  return validateUserYearAccess(user, targetYears);
};

/**
 * Builds query for Notes collection with year filtering
 * @param {Object} user - User object
 * @param {Object} filters - Additional filters (subject, category, etc.)
 * @returns {Object} - MongoDB query for Notes
 */
const buildNotesQuery = (user, filters = {}) => {
  console.log('buildNotesQuery called for user:', {
    userId: user?._id,
    role: user?.role,
    department: user?.department,
    academicYear: user?.academicYear,
    filters
  });

  // If no user (unauthenticated), return basic query without user-specific filtering
  if (!user) {
    console.log('No user provided, returning basic query');
    const baseQuery = {};
    
    // Add basic filters
    if (filters.subject && filters.subject !== 'all') {
      baseQuery.subject = new RegExp(filters.subject, 'i');
    }
    
    if (filters.category && filters.category !== 'all') {
      baseQuery.category = filters.category;
    }
    
    if (filters.uploaderRole && filters.uploaderRole !== 'all') {
      baseQuery.uploaderRole = filters.uploaderRole;
    }
    
    if (filters.search) {
      baseQuery.$or = [
        { title: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
        { subject: new RegExp(filters.search, 'i') },
        { tags: { $in: [new RegExp(filters.search, 'i')] } }
      ];
    }
    
    return baseQuery;
  }

  const baseQuery = {};
  
  // Add basic filters
  if (filters.subject && filters.subject !== 'all') {
    baseQuery.subject = new RegExp(filters.subject, 'i');
  }
  
  if (filters.category && filters.category !== 'all') {
    baseQuery.category = filters.category;
  }
  
  if (filters.uploaderRole && filters.uploaderRole !== 'all') {
    baseQuery.uploaderRole = filters.uploaderRole;
  }
  
  if (filters.search) {
    baseQuery.$or = [
      { title: new RegExp(filters.search, 'i') },
      { description: new RegExp(filters.search, 'i') },
      { subject: new RegExp(filters.search, 'i') },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }

  console.log('Base query before department/year filtering:', baseQuery);

  // Add department filtering for students and faculty
  if (user.role === 'student' || user.role === 'faculty') {
    baseQuery.department = user.department;
    console.log('Added department filter for user:', user.department);
  }
  
  // For admin, add department filter if specified
  if (user.role === 'admin' && filters.department && filters.department !== 'all') {
    baseQuery.department = filters.department;
  }

  // Add year filtering for students
  if (user.role === 'student') {
    baseQuery.academicYear = { $in: [user.academicYear] };
    console.log('Added year filter for student:', user.academicYear);
  }
  
  // Add year filtering for faculty
  if (user.role === 'faculty' && user.accessibleYears && user.accessibleYears.length > 0) {
    baseQuery.academicYear = { $in: user.accessibleYears };
    console.log('Added year filter for faculty:', user.accessibleYears);
  }

  const finalQuery = baseQuery;
  
  // Apply year filtering - but be more lenient for students
  // const finalQuery = buildYearFilterQuery(user, baseQuery, {
  //   yearField: 'academicYear',
  //   allowMultipleYears: true,
  //   includeGlobal: false,
  //   filterAdminContent: user.role !== 'admin' // Only filter admin content when viewed by non-admin
  // });

  console.log('Final notes query:', finalQuery);
  return finalQuery;
};

/**
 * Builds query for Events collection with year filtering
 * @param {Object} user - User object
 * @param {Object} filters - Additional filters (category, status, etc.)
 * @returns {Object} - MongoDB query for Events
 */
const buildEventsQuery = (user, filters = {}) => {
  const baseQuery = {};
  
  // Add basic filters
  if (filters.category && filters.category !== 'all') {
    baseQuery.category = filters.category;
  }
  
  if (filters.status && filters.status !== 'all') {
    baseQuery.status = filters.status;
  }
  
  if (filters.search) {
    baseQuery.$or = [
      { title: new RegExp(filters.search, 'i') },
      { description: new RegExp(filters.search, 'i') },
      { location: new RegExp(filters.search, 'i') },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }

  // Add date filtering
  if (filters.startDate || filters.endDate) {
    baseQuery.date = {};
    if (filters.startDate) {
      baseQuery.date.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      baseQuery.date.$lte = new Date(filters.endDate);
    }
  }

  // Add department filtering - IMPORTANT: Filter admin content by department
  if (user.role === 'faculty' || user.role === 'student') {
    baseQuery.$or = [
      { targetDepartments: { $in: [user.department, 'ALL'] } },
      { targetDepartments: { $exists: false } },
      { targetDepartments: { $size: 0 } } // Empty array means all departments
    ];
  } else if (user.role === 'admin') {
    // Admin events should be filtered by department when viewed by students/faculty
    if (filters.department && filters.department !== 'all') {
      baseQuery.$or = [
        { targetDepartments: { $in: [filters.department, 'ALL'] } },
        { targetDepartments: { $exists: false } },
        { targetDepartments: { $size: 0 } }
      ];
    }
    // If no department filter, admin can see all events (for management)
  }

  // Add year filtering - IMPORTANT: Filter admin content by year for students
  if (user.role === 'student') {
    // Students can only see events targeting their year or all years
    baseQuery.$and = baseQuery.$and || [];
    baseQuery.$and.push({
      $or: [
        { targetAcademicYears: { $in: [user.academicYear] } },
        { targetAcademicYears: { $exists: false } },
        { targetAcademicYears: { $size: 0 } } // Empty array means all years
      ]
    });
  } else if (user.role === 'faculty') {
    // Faculty can see events for their accessible years
    if (user.accessibleYears && user.accessibleYears.length > 0) {
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { targetAcademicYears: { $in: user.accessibleYears } },
          { targetAcademicYears: { $exists: false } },
          { targetAcademicYears: { $size: 0 } }
        ]
      });
    }
  }
  // Admin can see all events (no year filtering for management)

  return baseQuery;
};

/**
 * Builds query for Users (students) collection with year filtering
 * @param {Object} user - Current user object
 * @param {Object} filters - Additional filters (role, department, etc.)
 * @returns {Object} - MongoDB query for Users
 */
const buildUsersQuery = (user, filters = {}) => {
  const baseQuery = { isActive: true };

  try {
    console.log('buildUsersQuery called with user:', { id: user?._id, role: user?.role, department: user?.department });
    console.log('buildUsersQuery called with filters:', filters);

    // Add basic filters
    if (filters.role && filters.role !== 'all') {
      baseQuery.role = filters.role;
    }
    
    if (filters.search) {
      baseQuery.$or = [
        { name: new RegExp(filters.search, 'i') },
        { email: new RegExp(filters.search, 'i') }
      ];
    }

    // Check if user exists and has role
    if (!user || !user.role) {
      console.error('buildUsersQuery: User object is missing or has no role');
      return baseQuery; // Return basic query without role-based filtering
    }
  } catch (error) {
    console.error('Error in buildUsersQuery:', error);
    console.error('Error stack:', error.stack);
    return baseQuery; // Return basic query on error
  }

  // Department filtering based on user role
  if (user.role === 'faculty') {
    // Faculty can only see users from their own department
    if (user.department) {
      baseQuery.department = user.department;
    } else {
      console.warn('Faculty user has no department set:', user._id);
    }
  } else if (user.role === 'student') {
    // Students can see users from their own department
    if (user.department) {
      baseQuery.department = user.department;
    } else {
      console.warn('Student user has no department set:', user._id);
    }
  } else if (user.role === 'admin') {
    // Admin can filter by specific department or see all
    if (filters.department && filters.department !== 'all') {
      baseQuery.department = filters.department;
    }
  }

  // Apply year filtering for student users
  if (filters.role === 'student' || !filters.role || filters.role === 'all') {
    return buildYearFilterQuery(user, baseQuery, {
      yearField: 'academicYear',
      allowMultipleYears: false,
      includeGlobal: false
    });
  }

  return baseQuery;
};

/**
 * Builds aggregation pipeline with year filtering
 * @param {Object} user - User object
 * @param {Array} basePipeline - Base aggregation pipeline
 * @param {Object} options - Options for year filtering
 * @returns {Array} - Enhanced aggregation pipeline
 */
const buildYearFilterPipeline = (user, basePipeline = [], options = {}) => {
  const {
    yearField = 'academicYear',
    allowMultipleYears = true,
    includeGlobal = false
  } = options;

  // Admin can access all content - no filtering needed
  if (user.role === 'admin') {
    return basePipeline;
  }

  const matchStage = {};

  // Student filtering
  if (user.role === 'student') {
    if (allowMultipleYears) {
      matchStage[yearField] = { $in: [user.academicYear] };
    } else {
      matchStage[yearField] = user.academicYear;
    }
  }

  // Faculty filtering
  if (user.role === 'faculty') {
    if (!user.accessibleYears || user.accessibleYears.length === 0) {
      // For backward compatibility, if faculty has no accessibleYears, don't filter by year
      console.log('Faculty user has no accessibleYears set in pipeline, allowing all years for backward compatibility');
      // Don't add year filtering
    } else {
      matchStage[yearField] = { $in: user.accessibleYears };
    }
  }

  // Add global content inclusion if requested
  if (includeGlobal && Object.keys(matchStage).length > 0) {
    const yearCondition = matchStage[yearField];
    matchStage.$or = [
      { [yearField]: yearCondition },
      { [yearField]: 'all' },
      { [yearField]: { $exists: false } }
    ];
    delete matchStage[yearField];
  }

  // Add match stage at the beginning of pipeline if we have conditions
  if (Object.keys(matchStage).length > 0) {
    return [{ $match: matchStage }, ...basePipeline];
  }

  return basePipeline;
};

/**
 * Helper to get sort options with year-aware sorting
 * @param {String} sortBy - Field to sort by
 * @param {String} sortOrder - Sort order (asc/desc)
 * @param {Object} user - User object for context
 * @returns {Object} - MongoDB sort object
 */
const buildSortOptions = (sortBy = 'createdAt', sortOrder = 'desc', user = null) => {
  const sortObj = {};
  const order = sortOrder === 'asc' ? 1 : -1;

  // Default sorting
  if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
    sortObj[sortBy] = order;
  } else if (sortBy === 'name' || sortBy === 'title') {
    sortObj[sortBy] = order;
  } else if (sortBy === 'academicYear') {
    sortObj.academicYear = order;
    sortObj.createdAt = -1; // Secondary sort
  } else if (sortBy === 'relevance' && user) {
    // Sort by relevance to user's context
    if (user.role === 'student') {
      sortObj.academicYear = user.academicYear === 1 ? 1 : -1;
      sortObj.createdAt = -1;
    } else if (user.role === 'faculty') {
      sortObj.createdAt = -1; // Most recent first for faculty
    }
  } else {
    // Default fallback
    sortObj.createdAt = -1;
  }

  return sortObj;
};

/**
 * Helper to build pagination options
 * @param {Number} page - Page number (1-based)
 * @param {Number} limit - Items per page
 * @returns {Object} - Pagination options with skip and limit
 */
const buildPaginationOptions = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
  const skip = (pageNum - 1) * limitNum;

  return {
    skip,
    limit: limitNum,
    page: pageNum
  };
};

module.exports = {
  buildYearFilterQuery,
  validateYearAccess,
  buildNotesQuery,
  buildEventsQuery,
  buildUsersQuery,
  buildYearFilterPipeline,
  buildSortOptions,
  buildPaginationOptions
};
