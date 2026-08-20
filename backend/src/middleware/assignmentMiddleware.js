const StudentFacultyAssignment = require('../models/StudentFacultyAssignment');
const assignmentService = require('../services/assignmentService');
const { validateUserYearAccess } = require('./yearAccess');

/**
 * Assignment Middleware
 * Handles assignment-based content filtering and access control
 */

/**
 * Middleware to filter content based on student-faculty assignments
 * Students see only content from their assigned faculty
 * Faculty see only content related to their assigned students
 * Admins see all content
 */
const filterByAssignments = () => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required for assignment filtering',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Admin can access all content, but when students/faculty view admin content,
      // it should be filtered by their department and year
      if (user.role === 'admin') {
        req.assignmentFilter = { 
          all: true,
          userRole: 'admin',
          // Admin content is not filtered when admin is viewing
          // But will be filtered when students/faculty view it through query helpers
        };
        return next();
      }

      // Student filtering - only content from assigned faculty
      if (user.role === 'student') {
        console.log('Student assignment filtering for user:', {
          userId: user._id,
          userName: user.name,
          department: user.department,
          academicYear: user.academicYear
        });

        const assignments = await StudentFacultyAssignment.find({
          student: user._id,
          isActive: true
        }).select('faculty');

        const assignedFacultyIds = assignments.map(assignment => assignment.faculty);

        console.log('Student assignments found:', {
          assignmentsCount: assignments.length,
          assignedFacultyIds: assignedFacultyIds
        });

        if (assignedFacultyIds.length === 0) {
          // Student has no assigned faculty - show all content for now (for testing)
          console.log('No faculty assigned to student, showing all content');
          req.assignmentFilter = {
            userRole: 'student',
            hasAssignments: false,
            // For now, don't filter - show all content
            showAll: true,
            message: 'No faculty assigned to your year and department'
          };
        } else {
          req.assignmentFilter = {
            userRole: 'student',
            hasAssignments: true,
            assignedFacultyIds,
            // Include faculty content, admin content, and student's own content
            $or: [
              { createdBy: { $in: assignedFacultyIds } }, // Faculty content (will be transformed to 'organizer' for events)
              { uploaderRole: 'admin' },                   // Admin content
              { createdBy: user._id }                     // Student's own content (will be transformed to 'organizer' for events)
            ]
          };
        }

        console.log('Student assignment filter set:', req.assignmentFilter);
        return next();
      }

      // Faculty filtering - content for their accessible years and department
      if (user.role === 'faculty') {
        // Use existing year access validation
        const yearValidation = validateUserYearAccess(user, user.accessibleYears);
        
        if (!yearValidation.hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'NO_ACCESSIBLE_YEARS',
              message: 'No accessible years configured for your account',
              timestamp: new Date().toISOString()
            }
          });
        }

        // Get assigned students for additional context
        const assignments = await StudentFacultyAssignment.find({
          faculty: user._id,
          isActive: true
        }).select('student');

        const assignedStudentIds = assignments.map(assignment => assignment.student);

        req.assignmentFilter = {
          userRole: 'faculty',
          hasAssignments: assignedStudentIds.length > 0,
          assignedStudentIds,
          department: user.department,
          academicYear: { $in: user.accessibleYears },
          // Faculty can see their own content and content from their assigned students
          $or: [
            { createdBy: user._id },
            { createdBy: { $in: assignedStudentIds } }
          ]
        };

        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_ROLE',
          message: 'Invalid user role for assignment filtering',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Assignment filtering error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_FILTER_ERROR',
          message: 'Failed to apply assignment filtering',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to validate assignment access for specific operations
 * Checks if user has permission to access/modify specific content based on assignments
 */
const validateAssignmentAccess = (operation = 'read') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const resourceId = req.params.id;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required for assignment access validation',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Admin has full access
      if (user.role === 'admin') {
        req.assignmentAccess = {
          hasAccess: true,
          userRole: 'admin',
          operation
        };
        return next();
      }

      // For create operations, we don't need to check existing resource
      if (operation === 'create') {
        req.assignmentAccess = {
          hasAccess: true,
          userRole: user.role,
          operation: 'create'
        };
        return next();
      }

      // For other operations, we need to check the resource
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'RESOURCE_ID_REQUIRED',
            message: 'Resource ID is required for assignment access validation',
            timestamp: new Date().toISOString()
          }
        });
      }

      // The actual resource access check will be done in the controller
      // since we don't know the resource type here
      req.assignmentAccess = {
        hasAccess: true, // Will be validated in controller
        userRole: user.role,
        operation,
        resourceId,
        needsValidation: true
      };

      next();

    } catch (error) {
      console.error('Assignment access validation error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_ACCESS_ERROR',
          message: 'Failed to validate assignment access',
          details: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Middleware to automatically assign students to faculty on login
 * This is called after successful authentication
 */
const autoAssignOnLogin = () => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return next(); // No user, skip assignment
      }

      // Only trigger for students and faculty
      if (user.role === 'student') {
        // Trigger assignment in background - don't wait for completion
        assignmentService.assignStudentToFaculty(user._id).catch(error => {
          console.error('Background assignment failed for student:', error.message);
        });
      } else if (user.role === 'faculty') {
        // Trigger assignment update in background
        assignmentService.updateFacultyAssignments(user._id).catch(error => {
          console.error('Background assignment update failed for faculty:', error.message);
        });
      }

      next();

    } catch (error) {
      // Don't fail the request if assignment fails
      console.error('Auto assignment error:', error);
      next();
    }
  };
};

/**
 * Utility function to build assignment-aware database query
 * Combines assignment filtering with other query parameters
 */
const buildAssignmentQuery = (baseQuery, assignmentFilter, additionalFilters = {}, options = {}) => {
  let query = { ...baseQuery, ...additionalFilters };

  console.log('buildAssignmentQuery called with:', {
    baseQuery,
    assignmentFilter,
    additionalFilters,
    options
  });

  if (!assignmentFilter) {
    console.log('No assignment filter, returning base query');
    return query;
  }

  // Admin sees everything when they are viewing content
  // But admin-created content will be filtered by query helpers based on viewing user
  if (assignmentFilter.all) {
    console.log('Admin user, returning query without assignment filtering');
    return query;
  }

  // Apply assignment-based filtering for students and faculty
  if (assignmentFilter.showAll) {
    console.log('ShowAll flag set, not applying assignment filtering');
    return query;
  }

  if (assignmentFilter.$or) {
    // Map createdBy to appropriate field based on model
    // Events use 'organizer', Notes use 'createdBy'
    const creatorField = options.creatorField || 'createdBy';
    
    if (creatorField !== 'createdBy') {
      // Transform the $or conditions to use the correct field
      query.$or = assignmentFilter.$or.map(condition => {
        const newCondition = {};
        Object.keys(condition).forEach(key => {
          if (key === 'createdBy') {
            newCondition[creatorField] = condition[key];
          } else {
            newCondition[key] = condition[key];
          }
        });
        return newCondition;
      });
      console.log(`Transformed $or filter to use '${creatorField}':`, query.$or);
    } else {
      // Use the $or condition directly from assignment filter
      query.$or = assignmentFilter.$or;
      console.log('Applied $or filter:', query.$or);
    }
  }

  if (assignmentFilter.department) {
    // For Events, department filtering is already handled by buildEventsQuery
    // Don't override it here
    if (!options.skipDepartmentFilter) {
      query.department = assignmentFilter.department;
    }
  }

  if (assignmentFilter.academicYear) {
    // For Events, year filtering is already handled by buildEventsQuery with targetAcademicYears
    // Don't add academicYear field for Events
    if (!options.skipYearFilter) {
      query.academicYear = assignmentFilter.academicYear;
    }
  }

  console.log('Final assignment query:', query);
  return query;
};

/**
 * Utility function to check if user can access specific resource based on assignments
 */
const canAccessResource = async (userId, userRole, resourceCreatorId, resourceData = {}) => {
  try {
    // Admin can access everything
    if (userRole === 'admin') {
      return { canAccess: true, reason: 'admin_access' };
    }

    // Users can always access their own content
    if (resourceCreatorId && resourceCreatorId.equals(userId)) {
      return { canAccess: true, reason: 'own_content' };
    }

    // Student access check
    if (userRole === 'student') {
      // Check if the resource creator is an assigned faculty
      const assignment = await StudentFacultyAssignment.findOne({
        student: userId,
        faculty: resourceCreatorId,
        isActive: true
      });

      if (assignment) {
        return { canAccess: true, reason: 'assigned_faculty_content' };
      }

      return { canAccess: false, reason: 'not_assigned_faculty' };
    }

    // Faculty access check
    if (userRole === 'faculty') {
      // Check if the resource creator is an assigned student
      const assignment = await StudentFacultyAssignment.findOne({
        faculty: userId,
        student: resourceCreatorId,
        isActive: true
      });

      if (assignment) {
        return { canAccess: true, reason: 'assigned_student_content' };
      }

      // Check if it's content for their accessible years and department
      if (resourceData.academicYear && resourceData.department) {
        const User = require('../models/User');
        const faculty = await User.findById(userId);
        
        if (faculty && 
            faculty.accessibleYears.includes(resourceData.academicYear) &&
            faculty.department === resourceData.department) {
          return { canAccess: true, reason: 'year_department_access' };
        }
      }

      return { canAccess: false, reason: 'not_assigned_student' };
    }

    return { canAccess: false, reason: 'invalid_role' };

  } catch (error) {
    console.error('Resource access check error:', error);
    return { canAccess: false, reason: 'access_check_error', error: error.message };
  }
};

/**
 * Middleware to add assignment context to request
 * Provides assignment information for use in controllers and views
 */
const addAssignmentContext = () => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return next();
      }

      const assignmentContext = {
        userRole: user.role,
        userId: user._id
      };

      if (user.role === 'student') {
        const assignments = await assignmentService.getStudentAssignments(user._id);
        assignmentContext.assignedFaculty = assignments.map(a => ({
          id: a.faculty._id,
          name: a.faculty.name,
          department: a.faculty.department,
          assignedAt: a.assignedAt
        }));
        assignmentContext.hasAssignedFaculty = assignments.length > 0;
      } else if (user.role === 'faculty') {
        const assignments = await assignmentService.getFacultyAssignments(user._id);
        assignmentContext.assignedStudents = assignments.map(a => ({
          id: a.student._id,
          name: a.student.name,
          academicYear: a.student.academicYear,
          assignedAt: a.assignedAt
        }));
        assignmentContext.hasAssignedStudents = assignments.length > 0;
        assignmentContext.accessibleYears = user.accessibleYears || [];
      }

      req.assignmentContext = assignmentContext;
      next();

    } catch (error) {
      console.error('Assignment context error:', error);
      // Don't fail the request, just continue without context
      req.assignmentContext = { userRole: req.user?.role || 'unknown' };
      next();
    }
  };
};

/**
 * Middleware to log assignment-related activities
 * Useful for debugging and monitoring assignment system
 */
const logAssignmentActivity = (activity) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (user) {
      console.log(`Assignment Activity: ${activity}`, {
        userId: user._id,
        userRole: user.role,
        userName: user.name,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    next();
  };
};

module.exports = {
  filterByAssignments,
  validateAssignmentAccess,
  autoAssignOnLogin,
  buildAssignmentQuery,
  canAccessResource,
  addAssignmentContext,
  logAssignmentActivity
};