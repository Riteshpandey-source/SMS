// Service for filtering content based on user's branch and year
export const filterService = {
  // Filter content based on user's academic info
  filterByUserContext: (items, user, options = {}) => {
    if (!user || !items || !Array.isArray(items)) {
      return items || [];
    }

    const {
      respectDepartment = true,
      respectAcademicYear = true,
      allowGlobal = true,
      allowAdminContent = true
    } = options;

    return items.filter(item => {
      // Always show global content if allowed
      if (allowGlobal && item.isGlobal) {
        return true;
      }

      // Always show admin content if user is admin and allowed
      if (allowAdminContent && user.role === 'admin') {
        return true;
      }

      // Faculty can see content from their department
      if (user.role === 'faculty') {
        if (respectDepartment && item.department && item.department !== user.department) {
          return false;
        }
        return true;
      }

      // For students, apply both department and year filtering
      if (user.role === 'student') {
        // Check department filter
        if (respectDepartment && item.department) {
          if (Array.isArray(item.department)) {
            if (!item.department.includes(user.department)) {
              return false;
            }
          } else if (item.department !== user.department) {
            return false;
          }
        }

        // Check academic year filter
        if (respectAcademicYear && item.academicYear) {
          if (Array.isArray(item.academicYear)) {
            if (!item.academicYear.includes(user.academicYear)) {
              return false;
            }
          } else if (item.academicYear !== user.academicYear) {
            return false;
          }
        }

        return true;
      }

      return true;
    });
  },

  // Filter events based on user context
  filterEvents: (events, user) => {
    return filterService.filterByUserContext(events, user, {
      respectDepartment: true,
      respectAcademicYear: true,
      allowGlobal: true,
      allowAdminContent: true
    });
  },

  // Filter notes based on user context
  filterNotes: (notes, user) => {
    return filterService.filterByUserContext(notes, user, {
      respectDepartment: true,
      respectAcademicYear: true,
      allowGlobal: false, // Notes are usually department/year specific
      allowAdminContent: false
    });
  },

  // Filter forum questions based on user context
  filterForumQuestions: (questions, user) => {
    return filterService.filterByUserContext(questions, user, {
      respectDepartment: true,
      respectAcademicYear: false, // Forum questions can be cross-year
      allowGlobal: true,
      allowAdminContent: true
    });
  },

  // Filter notifications based on user context
  filterNotifications: (notifications, user) => {
    return filterService.filterByUserContext(notifications, user, {
      respectDepartment: true,
      respectAcademicYear: true,
      allowGlobal: true,
      allowAdminContent: true
    });
  },

  // Get user's academic context for API requests
  getUserContext: (user) => {
    if (!user) return {};

    const context = {
      role: user.role
    };

    if (user.department) {
      context.department = user.department;
    }

    if (user.role === 'student' && user.academicYear) {
      context.academicYear = user.academicYear;
    }

    return context;
  },

  // Build query parameters for API requests based on user context
  buildContextQuery: (user, additionalParams = {}) => {
    const context = filterService.getUserContext(user);
    return {
      ...context,
      ...additionalParams
    };
  },

  // Check if user can access specific content
  canAccessContent: (content, user) => {
    if (!user || !content) return false;

    // Admin can access everything
    if (user.role === 'admin') return true;

    // Check if content is global
    if (content.isGlobal) return true;

    // Check department access
    if (content.department) {
      if (Array.isArray(content.department)) {
        if (!content.department.includes(user.department)) {
          return false;
        }
      } else if (content.department !== user.department) {
        return false;
      }
    }

    // Check academic year access (for students)
    if (user.role === 'student' && content.academicYear) {
      if (Array.isArray(content.academicYear)) {
        if (!content.academicYear.includes(user.academicYear)) {
          return false;
        }
      } else if (content.academicYear !== user.academicYear) {
        return false;
      }
    }

    return true;
  },

  // Get content visibility label
  getVisibilityLabel: (content) => {
    if (content.isGlobal) {
      return 'All Students';
    }

    const parts = [];
    
    if (content.department) {
      if (Array.isArray(content.department)) {
        parts.push(content.department.join(', '));
      } else {
        parts.push(content.department);
      }
    }

    if (content.academicYear) {
      if (Array.isArray(content.academicYear)) {
        const years = content.academicYear.map(year => `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`);
        parts.push(years.join(', '));
      } else {
        const year = content.academicYear;
        parts.push(`${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`);
      }
    }

    return parts.length > 0 ? parts.join(' • ') : 'All Students';
  }
};