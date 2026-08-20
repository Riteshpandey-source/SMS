const Event = require('../models/Event');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;
const { buildEventsQuery, buildSortOptions, buildPaginationOptions } = require('../utils/queryHelpers');
const { validateUserYearAccess } = require('../middleware/yearAccess');
const { buildAssignmentQuery, canAccessResource } = require('../middleware/assignmentMiddleware');
const assignmentService = require('../services/assignmentService');

// Get all events with filtering
const getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      department,
      academicYear,
      category,
      status,
      organizer,
      upcoming,
      search,
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    const user = req.user;

    // Validate year access if specific year is requested
    if (academicYear) {
      const yearValidation = validateUserYearAccess(user, parseInt(academicYear));
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: `You don't have access to ${academicYear}${academicYear == 1 ? 'st' : academicYear == 2 ? 'nd' : academicYear == 3 ? 'rd' : 'th'} year events`,
            details: {
              requestedYear: parseInt(academicYear),
              accessibleYears: yearValidation.accessibleYears,
              userRole: user.role
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Build year-aware query using query helpers
    const filters = {
      department,
      academicYear: academicYear ? parseInt(academicYear) : undefined,
      category,
      status,
      organizer,
      search
    };

    const baseQuery = buildEventsQuery(user, filters);
    
    // Apply assignment-based filtering
    // NOTE: For events, we don't apply assignment filtering for students
    // Events should be visible to all students based on department and year targeting
    let query = baseQuery;
    if (req.assignmentFilter && user.role !== 'student') {
      // Only apply assignment filtering for faculty, not students
      // For events, use 'organizer' field instead of 'createdBy'
      // Skip department and year filters as they're already handled by buildEventsQuery
      query = buildAssignmentQuery(baseQuery, req.assignmentFilter, {}, { 
        creatorField: 'organizer',
        skipDepartmentFilter: true,
        skipYearFilter: true
      });
      
      console.log('Events query with assignment filtering:', {
        userId: user._id,
        userRole: user.role,
        userDepartment: user.department,
        userAccessibleYears: user.accessibleYears,
        assignmentFilter: req.assignmentFilter,
        filters,
        originalQuery: baseQuery,
        filteredQuery: query
      });
    } else {
      console.log('Events query without assignment filtering:', {
        userId: user._id,
        userRole: user.role,
        userDepartment: user.department,
        userAccessibleYears: user.accessibleYears,
        filters,
        generatedQuery: query,
        reason: user.role === 'student' ? 'Students see all events based on department/year' : 'No assignment filter'
      });
    }

    // Add date filtering
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
    } else if (upcoming === 'false') {
      query.date = { $lt: new Date() };
    }

    // Add organizer filtering
    if (organizer && (user.role === 'admin' || organizer === user._id.toString())) {
      query.organizer = organizer;
    }

    // Build pagination and sort options
    const paginationOptions = buildPaginationOptions(page, limit);
    const sortOptions = buildSortOptions(sortBy, sortOrder, user);

    // Handle search
    let events;
    let total;

    if (search) {
      // Text search with year filtering
      query.$text = { $search: search };
      
      [events, total] = await Promise.all([
        Event.find(query)
          .populate('organizer', 'name role department academicYear')
          .populate('attendees.user', 'name role department academicYear')
          .sort(sortOptions)
          .limit(paginationOptions.limit)
          .skip(paginationOptions.skip),
        Event.countDocuments(query)
      ]);
    } else {
      // Regular query with year filtering
      console.log('Executing events query:', JSON.stringify(query, null, 2));
      console.log('Sort options:', sortOptions);
      console.log('Pagination:', paginationOptions);
      
      [events, total] = await Promise.all([
        Event.find(query)
          .populate('organizer', 'name role department academicYear')
          .populate('attendees.user', 'name role department academicYear')
          .sort(sortOptions)
          .limit(paginationOptions.limit)
          .skip(paginationOptions.skip),
        Event.countDocuments(query)
      ]);
      
      console.log('Events query results:', { eventsCount: events.length, total });
    }

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          total,
          pages: Math.ceil(total / paginationOptions.limit),
          hasNext: paginationOptions.skip + paginationOptions.limit < total,
          hasPrev: paginationOptions.page > 1
        },
        filters: {
          department: user.role === 'student' ? user.department : department,
          academicYear: user.role === 'student' ? user.academicYear : academicYear,
          category,
          status,
          organizer,
          upcoming
        },
        userAccess: {
          role: user.role,
          accessibleYears: user.role === 'faculty' ? user.accessibleYears : 
                          user.role === 'student' ? [user.academicYear] : [1, 2, 3, 4],
          department: user.department
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_EVENTS_ERROR',
        message: 'Failed to retrieve events',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Create new event
const createEvent = async (req, res) => {
  try {
    const user = req.user;
    
    console.log('Create event request received from user:', user.role);
    console.log('Request body received:', {
      title: req.body.title,
      titleLength: req.body.title?.length,
      description: req.body.description,
      descriptionLength: req.body.description?.length,
      date: req.body.date,
      location: req.body.location,
      category: req.body.category,
      targetDepartments: req.body.targetDepartments,
      targetAcademicYears: req.body.targetAcademicYears
    });

    // Only faculty and admin can create events
    if (user.role !== 'faculty' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CREATE_PERMISSION_DENIED',
          message: 'Only faculty and administrators can create events',
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      title,
      description,
      date,
      endDate,
      location,
      category,
      targetDepartments,
      targetAcademicYears,
      maxAttendees,
      registrationDeadline,
      registrationRequired,
      contactEmail,
      contactPhone,
      tags,
      isPublic,
      requiresApproval
    } = req.body;

    // Parse arrays if they come as strings
    let parsedTargetDepartments = targetDepartments;
    let parsedTargetAcademicYears = targetAcademicYears;
    let parsedTags = tags;

    try {
      if (typeof targetDepartments === 'string') {
        parsedTargetDepartments = JSON.parse(targetDepartments);
      }
      if (typeof targetAcademicYears === 'string') {
        parsedTargetAcademicYears = JSON.parse(targetAcademicYears).map(y => parseInt(y));
      }
      if (typeof tags === 'string') {
        parsedTags = JSON.parse(tags);
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA_FORMAT',
          message: 'Invalid data format for arrays',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate department access for faculty
    if (user.role === 'faculty') {
      if (parsedTargetDepartments && 
          parsedTargetDepartments.length > 0 && 
          !parsedTargetDepartments.includes('ALL') &&
          !parsedTargetDepartments.includes(user.department)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEPARTMENT_ACCESS_DENIED',
            message: 'Faculty can only create events for their department',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate year access for faculty
      if (parsedTargetAcademicYears && parsedTargetAcademicYears.length > 0) {
        console.log('Faculty user accessibleYears:', user.accessibleYears);
        console.log('Requested target years:', parsedTargetAcademicYears);
        
        const yearValidation = validateUserYearAccess(user, parsedTargetAcademicYears);
        console.log('Year validation result:', yearValidation);
        
        if (!yearValidation.hasAccess && yearValidation.error !== 'NO_ACCESSIBLE_YEARS') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'YEAR_ACCESS_DENIED',
              message: 'You can only create events for your accessible academic years',
              details: {
                requestedYears: parsedTargetAcademicYears,
                accessibleYears: yearValidation.accessibleYears,
                deniedYears: yearValidation.deniedYears
              },
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    }

    // Create event
    const eventData = {
      title,
      description,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      location,
      category: category || 'academic',
      targetDepartments: parsedTargetDepartments || (user.role === 'faculty' ? [user.department] : ['ALL']),
      targetAcademicYears: parsedTargetAcademicYears || [1, 2, 3, 4],
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : undefined,
      registrationRequired: registrationRequired !== false,
      organizer: user._id,
      organizerRole: user.role,
      contactEmail: contactEmail || user.email,
      contactPhone,
      tags: parsedTags || [],
      isPublic: isPublic !== false,
      requiresApproval: requiresApproval === true
    };

    const event = new Event(eventData);
    await event.save();

    // Populate organizer info
    await event.populate('organizer', 'name role department academicYear');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        event
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create event error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_EVENT_ERROR',
        message: 'Failed to create event',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get single event
const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const event = await Event.findById(id)
      .populate('organizer', 'name role department academicYear')
      .populate('attendees.user', 'name role department academicYear');

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check access permissions
    let canAccess = false;
    let accessReason = '';
    
    if (user.role === 'admin') {
      canAccess = true;
      accessReason = 'admin_access';
    } else if (event.organizer._id.toString() === user._id.toString()) {
      canAccess = true;
      accessReason = 'event_organizer';
    } else if (event.status === 'published' && event.isPublic) {
      // Check assignment-based access first
      const assignmentAccess = await canAccessResource(
        user._id, 
        user.role, 
        event.organizer._id,
        {
          academicYear: event.targetAcademicYears,
          department: event.targetDepartments
        }
      );

      if (assignmentAccess.canAccess) {
        canAccess = true;
        accessReason = assignmentAccess.reason;
      } else {
        // Fallback to traditional department/year matching
        const departmentMatch = event.targetDepartments.includes('ALL') || 
                               event.targetDepartments.includes(user.department);
        
        let yearMatch = true;
        if (user.role === 'student') {
          yearMatch = event.targetAcademicYears.includes(user.academicYear);
        } else if (user.role === 'faculty') {
          // Faculty can only access events targeting their accessible years
          const yearValidation = validateUserYearAccess(user, event.targetAcademicYears);
          yearMatch = yearValidation.hasAccess;
        }
        
        canAccess = departmentMatch && yearMatch;
        accessReason = canAccess ? 'department_year_match' : 'no_access';
      }
    }

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this event',
          details: {
            eventOrganizer: event.organizer.name,
            eventYears: event.targetAcademicYears,
            eventDepartments: event.targetDepartments,
            userRole: user.role,
            userDepartment: user.department,
            accessibleYears: user.role === 'faculty' ? user.accessibleYears : [user.academicYear],
            accessReason
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Increment views
    await event.incrementViews();

    res.json({
      success: true,
      data: {
        event,
        userCanRegister: event.canRegister(user),
        userRegistered: event.attendees.some(att => att.user._id.toString() === user._id.toString())
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get event error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EVENT_ID',
          message: 'Invalid event ID format',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_EVENT_ERROR',
        message: 'Failed to retrieve event',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check permissions (organizer or admin)
    if (event.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only update your own events',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Fields that can be updated
    const allowedUpdates = [
      'title', 'description', 'date', 'endDate', 'location', 'category',
      'targetDepartments', 'targetAcademicYears', 'maxAttendees',
      'registrationDeadline', 'registrationRequired', 'contactEmail',
      'contactPhone', 'tags', 'isPublic', 'status'
    ];
    
    const actualUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        actualUpdates[key] = updates[key];
      }
    });

    // Parse date fields
    if (actualUpdates.date) {
      actualUpdates.date = new Date(actualUpdates.date);
    }
    if (actualUpdates.endDate) {
      actualUpdates.endDate = new Date(actualUpdates.endDate);
    }
    if (actualUpdates.registrationDeadline) {
      actualUpdates.registrationDeadline = new Date(actualUpdates.registrationDeadline);
    }

    // Parse arrays
    ['targetDepartments', 'targetAcademicYears', 'tags'].forEach(field => {
      if (actualUpdates[field] && typeof actualUpdates[field] === 'string') {
        try {
          actualUpdates[field] = JSON.parse(actualUpdates[field]);
          if (field === 'targetAcademicYears') {
            actualUpdates[field] = actualUpdates[field].map(y => parseInt(y));
          }
        } catch (parseError) {
          delete actualUpdates[field];
        }
      }
    });

    // Validate department access for faculty
    if (user.role === 'faculty' && actualUpdates.targetDepartments) {
      if (!actualUpdates.targetDepartments.includes('ALL') &&
          !actualUpdates.targetDepartments.includes(user.department)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEPARTMENT_ACCESS_DENIED',
            message: 'Faculty can only target events to their department',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Validate year access for faculty when updating target academic years
    if (user.role === 'faculty' && actualUpdates.targetAcademicYears) {
      const yearValidation = validateUserYearAccess(user, actualUpdates.targetAcademicYears);
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: 'You can only target events to your accessible academic years',
            details: {
              requestedYears: actualUpdates.targetAcademicYears,
              accessibleYears: yearValidation.accessibleYears,
              deniedYears: yearValidation.deniedYears
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Update event
    actualUpdates.lastModifiedBy = user._id;
    Object.assign(event, actualUpdates);
    await event.save();

    await event.populate('organizer', 'name role department academicYear');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        event
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update event error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_EVENT_ERROR',
        message: 'Failed to update event',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check permissions (organizer or admin)
    if (event.organizer.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only delete your own events',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if event has attendees
    if (event.attendees.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EVENT_HAS_ATTENDEES',
          message: 'Cannot delete event with registered attendees. Cancel the event instead.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete attachments if any
    if (event.attachments && event.attachments.length > 0) {
      for (const attachment of event.attachments) {
        try {
          await fs.unlink(attachment.filePath);
        } catch (fileError) {
          console.warn('Failed to delete event attachment:', fileError);
        }
      }
    }

    // Delete event from database
    await Event.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Event deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_EVENT_ERROR',
        message: 'Failed to delete event',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Register for event
const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!event.canRegister(user)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_NOT_ALLOWED',
          message: 'You cannot register for this event',
          timestamp: new Date().toISOString()
        }
      });
    }

    await event.registerUser(user);

    res.json({
      success: true,
      message: 'Successfully registered for event',
      data: {
        registrationCount: event.registrationCount,
        availableSpots: event.availableSpots
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: error.message || 'Failed to register for event',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get events statistics
const getEventsStats = async (req, res) => {
  try {
    const user = req.user;

    // Use query helpers to build year-aware query
    const matchQuery = buildEventsQuery(user, {});

    const stats = await Event.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          upcomingEvents: {
            $sum: {
              $cond: [{ $gte: ['$date', new Date()] }, 1, 0]
            }
          },
          totalRegistrations: { $sum: { $size: '$attendees' } },
          totalViews: { $sum: '$views' },
          categories: { $addToSet: '$category' },
          averageRegistrations: { $avg: { $size: '$attendees' } }
        }
      }
    ]);

    const result = stats[0] || {
      totalEvents: 0,
      upcomingEvents: 0,
      totalRegistrations: 0,
      totalViews: 0,
      categories: [],
      averageRegistrations: 0
    };

    // Get user's personal stats (for faculty)
    let personalStats = {};
    if (user.role === 'faculty') {
      const userStats = await Event.aggregate([
        { $match: { organizer: user._id } },
        {
          $group: {
            _id: null,
            organizedEvents: { $sum: 1 },
            totalRegistrationsOnMyEvents: { $sum: { $size: '$attendees' } },
            totalViewsOnMyEvents: { $sum: '$views' }
          }
        }
      ]);

      personalStats = userStats[0] || {
        organizedEvents: 0,
        totalRegistrationsOnMyEvents: 0,
        totalViewsOnMyEvents: 0
      };
    }

    // Get year-specific breakdown for faculty
    let yearBreakdown = null;
    if (user.role === 'faculty' && user.accessibleYears && user.accessibleYears.length > 1) {
      const yearStats = await Event.aggregate([
        { 
          $match: {
            ...matchQuery,
            targetAcademicYears: { $in: user.accessibleYears }
          }
        },
        {
          $unwind: '$targetAcademicYears'
        },
        {
          $group: {
            _id: '$targetAcademicYears',
            count: { $sum: 1 },
            registrations: { $sum: { $size: '$attendees' } },
            views: { $sum: '$views' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      yearBreakdown = yearStats.reduce((acc, stat) => {
        acc[stat._id] = {
          events: stat.count,
          registrations: stat.registrations,
          views: stat.views
        };
        return acc;
      }, {});
    }

    res.json({
      success: true,
      data: {
        overall: {
          totalEvents: result.totalEvents,
          upcomingEvents: result.upcomingEvents,
          totalRegistrations: result.totalRegistrations,
          totalViews: result.totalViews,
          categoriesCount: result.categories.length,
          averageRegistrations: Math.round(result.averageRegistrations * 10) / 10
        },
        personal: personalStats,
        yearBreakdown,
        context: {
          department: user.role === 'admin' ? 'All' : user.department,
          academicYear: user.role === 'student' ? user.academicYear : 
                       user.role === 'faculty' ? user.accessibleYears : 'All',
          role: user.role,
          accessibleYears: user.role === 'faculty' ? user.accessibleYears : 
                          user.role === 'student' ? [user.academicYear] : [1, 2, 3, 4]
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get events stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATS_ERROR',
        message: 'Failed to retrieve events statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getEventsStats
};