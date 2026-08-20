const Note = require('../models/Note');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;
const { buildNotesQuery, buildSortOptions, buildPaginationOptions } = require('../utils/queryHelpers');
const { validateUserYearAccess } = require('../middleware/yearAccess');
const { buildAssignmentQuery, canAccessResource } = require('../middleware/assignmentMiddleware');
const assignmentService = require('../services/assignmentService');

// Get all notes with filtering
const getNotes = async (req, res) => {
  try {
    console.log('=== GET NOTES API CALLED ===');
    console.log('Request user:', req.user ? {
      id: req.user._id,
      role: req.user.role,
      department: req.user.department,
      academicYear: req.user.academicYear
    } : 'No user');
    console.log('Request query:', req.query);

    const {
      page = 1,
      limit = 20,
      department,
      academicYear,
      subject,
      category,
      uploaderRole,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const user = req.user;

    // Quick database check
    const totalNotesInDB = await Note.countDocuments();
    const activeNotesInDB = await Note.countDocuments({ status: 'active', isApproved: true });
    console.log('Database check:', { totalNotesInDB, activeNotesInDB });

    // If no notes in database, return empty result immediately
    if (totalNotesInDB === 0) {
      console.log('No notes found in database, returning empty result');
      return res.json({
        success: true,
        data: {
          notes: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
          },
          filters: {
            department: user?.department,
            academicYear: user?.academicYear
          },
          userAccess: {
            role: user?.role,
            accessibleYears: user?.role === 'faculty' ? user?.accessibleYears : 
                            user?.role === 'student' ? [user?.academicYear] : [1, 2, 3, 4],
            department: user?.department
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Validate year access if specific year is requested
    if (academicYear) {
      const yearValidation = validateUserYearAccess(user, parseInt(academicYear));
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: `You don't have access to ${academicYear}${academicYear == 1 ? 'st' : academicYear == 2 ? 'nd' : academicYear == 3 ? 'rd' : 'th'} year notes`,
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
      subject,
      category,
      uploaderRole,
      search
    };

    console.log('Filters applied:', filters);

    const baseQuery = buildNotesQuery(user, filters);
    console.log('Base query from buildNotesQuery:', baseQuery);
    
    // Add base filters
    baseQuery.isApproved = true;
    baseQuery.status = 'active';
    console.log('Base query after adding isApproved and status:', baseQuery);

    // Apply department and year filtering directly
    let query = baseQuery;
    
    // Add department filtering for students and faculty
    if (user.role === 'student' || user.role === 'faculty') {
      query.department = user.department;
      console.log('Added department filter:', user.department);
    }
    
    // Add year filtering for students
    if (user.role === 'student') {
      query.academicYear = { $in: [user.academicYear] };
      console.log('Added year filter for student:', user.academicYear);
    }
    
    // Add year filtering for faculty
    if (user.role === 'faculty' && user.accessibleYears && user.accessibleYears.length > 0) {
      query.academicYear = { $in: user.accessibleYears };
      console.log('Added year filter for faculty:', user.accessibleYears);
    }
    
    console.log('Direct filtering applied - department and year based');

    // Build pagination and sort options
    const paginationOptions = buildPaginationOptions(page, limit);
    const sortOptions = buildSortOptions(sortBy, sortOrder, user);

    // Handle search
    let notes;
    let total;

    console.log('Final query before execution:', JSON.stringify(query, null, 2));
    console.log('Sort options:', sortOptions);
    console.log('Pagination options:', paginationOptions);

    if (search) {
      // Text search with year filtering
      query.$text = { $search: search };
      console.log('Search query with $text:', JSON.stringify(query, null, 2));
      
      [notes, total] = await Promise.all([
        Note.find(query)
          .populate('uploadedBy', 'name role department academicYear')
          .sort(sortOptions)
          .limit(paginationOptions.limit)
          .skip(paginationOptions.skip),
        Note.countDocuments(query)
      ]);
    } else {
      // Regular query with year filtering
      console.log('Regular query execution...');
      [notes, total] = await Promise.all([
        Note.find(query)
          .populate('uploadedBy', 'name role department academicYear')
          .sort(sortOptions)
          .limit(paginationOptions.limit)
          .skip(paginationOptions.skip),
        Note.countDocuments(query)
      ]);
    }

    console.log('Query results:', { notesCount: notes.length, total });

    // Test query without any filters
    const testNotes = await Note.find({ status: 'active', isApproved: true }).limit(5);
    console.log('Test query (no filters):', { testNotesCount: testNotes.length });

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          total,
          pages: Math.ceil(total / paginationOptions.limit),
          hasNext: paginationOptions.skip + paginationOptions.limit < total,
          hasPrev: paginationOptions.page > 1
        },
        filters: {
          department: user?.role === 'student' ? user?.department : department,
          academicYear: user?.role === 'student' ? user?.academicYear : academicYear,
          subject,
          category,
          uploaderRole
        },
        userAccess: {
          role: user?.role || 'guest',
          accessibleYears: user?.role === 'faculty' ? user?.accessibleYears : 
                          user?.role === 'student' ? [user?.academicYear] : [1, 2, 3, 4],
          department: user?.department
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== GET NOTES ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_NOTES_ERROR',
        message: 'Failed to retrieve notes',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Upload new note (Faculty and Admin only)
const uploadNote = async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;

    // Only faculty and admin can upload notes
    if (user.role !== 'faculty' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'UPLOAD_PERMISSION_DENIED',
          message: 'Only faculty and administrators can upload notes',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file uploaded',
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      title,
      description,
      subject,
      department,
      academicYear,
      category = 'lecture',
      tags = []
    } = req.body;

    // Parse academic years
    let parsedAcademicYears;
    try {
      parsedAcademicYears = Array.isArray(academicYear) 
        ? academicYear.map(y => parseInt(y))
        : [parseInt(academicYear)];
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ACADEMIC_YEAR',
          message: 'Invalid academic year format',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate year access for faculty
    if (user.role === 'faculty') {
      const yearValidation = validateUserYearAccess(user, parsedAcademicYears);
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: 'You can only upload notes for your accessible academic years',
            details: {
              requestedYears: parsedAcademicYears,
              accessibleYears: yearValidation.accessibleYears,
              deniedYears: yearValidation.deniedYears
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = Array.isArray(tags) ? tags : JSON.parse(tags);
      } catch (error) {
        parsedTags = typeof tags === 'string' ? [tags] : [];
      }
    }

    // Validate department access
    if (user.role === 'student' || user.role === 'faculty') {
      if (department && department !== user.department) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEPARTMENT_ACCESS_DENIED',
            message: 'You can only upload notes for your department',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Create note
    const noteData = {
      title,
      description,
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      subject,
      department: department || user.department,
      academicYear: parsedAcademicYears,
      category,
      tags: parsedTags,
      uploadedBy: user._id,
      uploaderRole: user.role
    };

    const note = new Note(noteData);
    await note.save();

    // Populate uploader info
    await note.populate('uploadedBy', 'name role department academicYear');

    res.status(201).json({
      success: true,
      message: 'Note uploaded successfully',
      data: {
        note
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload note error:', error);

    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Note validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_NOTE_ERROR',
        message: 'Failed to upload note',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get single note
const getNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const note = await Note.findById(id)
      .populate('uploadedBy', 'name role department academicYear');

    if (!note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check basic access permissions
    if (!note.canAccess(user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this note',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Additional assignment-based access validation
    const accessCheck = await canAccessResource(
      user._id, 
      user.role, 
      note.uploadedBy._id, 
      {
        academicYear: note.academicYear,
        department: note.department
      }
    );

    if (!accessCheck.canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ASSIGNMENT_ACCESS_DENIED',
          message: 'You do not have assignment-based access to this note',
          details: {
            reason: accessCheck.reason,
            noteCreator: note.uploadedBy.name,
            noteYear: note.academicYear,
            noteDepartment: note.department
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Additional year-based access validation for faculty
    if (user.role === 'faculty') {
      const yearValidation = validateUserYearAccess(user, note.academicYear);
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: 'You do not have access to notes from this academic year',
            details: {
              noteYears: note.academicYear,
              accessibleYears: yearValidation.accessibleYears
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Increment views
    await note.incrementViews();

    res.json({
      success: true,
      data: {
        note
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get note error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NOTE_ID',
          message: 'Invalid note ID format',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_NOTE_ERROR',
        message: 'Failed to retrieve note',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Download note file
const downloadNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check basic access permissions
    if (!note.canAccess(user)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to download this note',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Additional year-based access validation for faculty
    if (user.role === 'faculty') {
      const yearValidation = validateUserYearAccess(user, note.academicYear);
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: 'You do not have access to download notes from this academic year',
            details: {
              noteYears: note.academicYear,
              accessibleYears: yearValidation.accessibleYears
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Check if file exists
    try {
      await fs.access(note.filePath);
    } catch (fileError) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Note file not found on server',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Increment downloads
    await note.incrementDownloads();

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${note.originalName}"`);
    res.setHeader('Content-Type', note.mimeType);

    // Send file
    res.sendFile(path.resolve(note.filePath));

  } catch (error) {
    console.error('Download note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_ERROR',
        message: 'Failed to download note',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update note (owner or admin only)
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updates = req.body;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check permissions (owner or admin)
    if (note.uploadedBy.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only update your own notes',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Fields that can be updated
    const allowedUpdates = ['title', 'description', 'subject', 'academicYear', 'category', 'tags'];
    const actualUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        actualUpdates[key] = updates[key];
      }
    });

    // Parse academic years if provided
    if (actualUpdates.academicYear) {
      try {
        actualUpdates.academicYear = Array.isArray(actualUpdates.academicYear) 
          ? actualUpdates.academicYear.map(y => parseInt(y))
          : [parseInt(actualUpdates.academicYear)];
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACADEMIC_YEAR',
            message: 'Invalid academic year format',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Validate year access for faculty when updating academic years
      if (user.role === 'faculty') {
        const yearValidation = validateUserYearAccess(user, actualUpdates.academicYear);
        if (!yearValidation.hasAccess) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'YEAR_ACCESS_DENIED',
              message: 'You can only assign notes to your accessible academic years',
              details: {
                requestedYears: actualUpdates.academicYear,
                accessibleYears: yearValidation.accessibleYears,
                deniedYears: yearValidation.deniedYears
              },
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    }

    // Update note
    Object.assign(note, actualUpdates);
    await note.save();

    await note.populate('uploadedBy', 'name role department academicYear');

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: {
        note
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update note error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Note validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_NOTE_ERROR',
        message: 'Failed to update note',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Delete note (owner or admin only)
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const note = await Note.findById(id);

    if (!note) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOTE_NOT_FOUND',
          message: 'Note not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check permissions (owner or admin)
    if (note.uploadedBy.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only delete your own notes',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(note.filePath);
    } catch (fileError) {
      console.warn('Failed to delete note file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete note from database
    await Note.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Note deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_NOTE_ERROR',
        message: 'Failed to delete note',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get user's uploaded notes
const getMyNotes = async (req, res) => {
  try {
    const user = req.user;
    const {
      page = 1,
      limit = 20,
      status = 'all'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    let query = { uploadedBy: user._id };
    
    if (status !== 'all') {
      query.status = status;
    }

    const [notes, total] = await Promise.all([
      Note.find(query)
        .populate('uploadedBy', 'name role department academicYear')
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip(skip),
      Note.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasNext: skip + limitNum < total,
          hasPrev: page > 1
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get my notes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MY_NOTES_ERROR',
        message: 'Failed to retrieve your notes',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get notes statistics
const getNotesStats = async (req, res) => {
  try {
    const user = req.user;

    // Use query helpers to build year-aware query
    const baseQuery = {
      isApproved: true,
      status: 'active'
    };

    const matchQuery = buildNotesQuery(user, {});
    Object.assign(matchQuery, baseQuery);

    const stats = await Note.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalNotes: { $sum: 1 },
          totalDownloads: { $sum: '$downloads' },
          totalViews: { $sum: '$views' },
          averageRating: { $avg: '$rating.average' },
          subjects: { $addToSet: '$subject' },
          categories: { $addToSet: '$category' }
        }
      }
    ]);

    const result = stats[0] || {
      totalNotes: 0,
      totalDownloads: 0,
      totalViews: 0,
      averageRating: 0,
      subjects: [],
      categories: []
    };

    // Get user's personal stats (only notes they uploaded)
    const userStats = await Note.aggregate([
      { $match: { uploadedBy: user._id } },
      {
        $group: {
          _id: null,
          uploadedNotes: { $sum: 1 },
          totalDownloadsOnMyNotes: { $sum: '$downloads' },
          totalViewsOnMyNotes: { $sum: '$views' }
        }
      }
    ]);

    const personalStats = userStats[0] || {
      uploadedNotes: 0,
      totalDownloadsOnMyNotes: 0,
      totalViewsOnMyNotes: 0
    };

    // Get year-specific breakdown for faculty
    let yearBreakdown = null;
    if (user.role === 'faculty' && user.accessibleYears && user.accessibleYears.length > 1) {
      const yearStats = await Note.aggregate([
        { 
          $match: {
            ...matchQuery,
            academicYear: { $in: user.accessibleYears }
          }
        },
        {
          $unwind: '$academicYear'
        },
        {
          $group: {
            _id: '$academicYear',
            count: { $sum: 1 },
            downloads: { $sum: '$downloads' },
            views: { $sum: '$views' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      yearBreakdown = yearStats.reduce((acc, stat) => {
        acc[stat._id] = {
          notes: stat.count,
          downloads: stat.downloads,
          views: stat.views
        };
        return acc;
      }, {});
    }

    res.json({
      success: true,
      data: {
        overall: {
          totalNotes: result.totalNotes,
          totalDownloads: result.totalDownloads,
          totalViews: result.totalViews,
          averageRating: Math.round(result.averageRating * 10) / 10,
          subjectsCount: result.subjects.length,
          categoriesCount: result.categories.length
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
    console.error('Get notes stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STATS_ERROR',
        message: 'Failed to retrieve notes statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getNotes,
  uploadNote,
  getNote,
  downloadNote,
  updateNote,
  deleteNote,
  getMyNotes,
  getNotesStats
};