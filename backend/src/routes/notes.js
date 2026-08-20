const express = require('express');
const router = express.Router();

// Import controllers and middleware
const notesController = require('../controllers/notesController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { validateBody, validateQuery, validateParams } = require('../middleware/validation');
const { apiRateLimiter, uploadRateLimiter } = require('../middleware/rateLimiter');
const { createNotesUpload, handleMulterError } = require('../middleware/fileUpload');
const { filterByAssignments, validateAssignmentAccess, addAssignmentContext } = require('../middleware/assignmentMiddleware');

// Import validation schemas
const Joi = require('joi');

// Validation schemas
const uploadNoteSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).required().messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 3 characters long',
    'string.max': 'Title cannot exceed 100 characters'
  }),
  description: Joi.string().trim().min(10).max(500).required().messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters long',
    'string.max': 'Description cannot exceed 500 characters'
  }),
  subject: Joi.string().trim().max(50).required().messages({
    'string.empty': 'Subject is required',
    'string.max': 'Subject cannot exceed 50 characters'
  }),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  academicYear: Joi.alternatives().try(
    Joi.number().integer().min(1).max(4),
    Joi.array().items(Joi.number().integer().min(1).max(4)).min(1)
  ).required().messages({
    'any.required': 'Academic year is required',
    'number.min': 'Academic year must be between 1 and 4',
    'number.max': 'Academic year must be between 1 and 4'
  }),
  category: Joi.string().valid('lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other').default('lecture'),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(30)),
    Joi.string()
  ).optional()
});

const updateNoteSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().min(10).max(500).optional(),
  subject: Joi.string().trim().max(50).optional(),
  academicYear: Joi.alternatives().try(
    Joi.number().integer().min(1).max(4),
    Joi.array().items(Joi.number().integer().min(1).max(4)).min(1)
  ).optional(),
  category: Joi.string().valid('lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other').optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(30)),
    Joi.string()
  ).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

const getNotesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  department: Joi.string().valid('CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL').optional(),
  academicYear: Joi.number().integer().min(1).max(4).optional(),
  subject: Joi.string().trim().optional(),
  category: Joi.string().valid('lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other').optional(),
  uploaderRole: Joi.string().valid('student', 'faculty', 'admin').optional(),
  search: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('createdAt', 'downloads', 'views', 'rating.average', 'title').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const noteParamsSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'Invalid note ID format'
  })
});

// Configure notes upload
const notesUpload = createNotesUpload();

// Apply rate limiting to all notes routes
router.use(apiRateLimiter);

// Public routes (with optional authentication for better filtering)

// GET /api/notes - Get all notes with filtering
router.get('/',
  authenticate, // Require authentication
  validateQuery(getNotesQuerySchema),
  // Temporarily disable assignment filtering for debugging
  // filterByAssignments(), // Add assignment-based filtering
  addAssignmentContext(), // Add assignment context for debugging
  notesController.getNotes
);

// GET /api/notes/stats - Get notes statistics
router.get('/stats',
  authenticate,
  notesController.getNotesStats
);

// GET /api/notes/debug - Debug endpoint to check raw notes
router.get('/debug',
  authenticate,
  async (req, res) => {
    try {
      const Note = require('../models/Note');
      
      // Get all ECE notes
      const eceNotes = await Note.find({
        department: 'ECE',
        status: 'active',
        isApproved: true
      }).populate('uploadedBy', 'name role department');
      
      res.json({
        success: true,
        data: {
          totalECENotes: eceNotes.length,
          notes: eceNotes,
          user: {
            id: req.user._id,
            role: req.user.role,
            department: req.user.department,
            academicYear: req.user.academicYear
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// GET /api/notes/debug-original - Original debug endpoint
router.get('/debug-original',
  authenticate,
  async (req, res) => {
    try {
      const Note = require('../models/Note');
      const totalNotes = await Note.countDocuments();
      const activeNotes = await Note.countDocuments({ status: 'active', isApproved: true });
      const sampleNotes = await Note.find().limit(3).select('title department academicYear uploaderRole uploadedBy');
      
      res.json({
        success: true,
        debug: {
          totalNotes,
          activeNotes,
          sampleNotes,
          user: {
            id: req.user._id,
            role: req.user.role,
            department: req.user.department,
            academicYear: req.user.academicYear
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/notes/:id - Get single note details
router.get('/:id',
  authenticate,
  validateParams(noteParamsSchema),
  validateAssignmentAccess('read'), // Validate assignment access for individual notes
  notesController.getNote
);

// GET /api/notes/:id/download - Download note file
router.get('/:id/download',
  authenticate,
  validateParams(noteParamsSchema),
  notesController.downloadNote
);

// Protected routes (authentication required)

// POST /api/notes - Upload new note (Faculty and Admin only)
router.post('/',
  authenticate,
  authorize('faculty', 'admin'),
  uploadRateLimiter,
  notesUpload.single('file'),
  handleMulterError,
  validateBody(uploadNoteSchema),
  notesController.uploadNote
);

// GET /api/notes/my/uploads - Get user's uploaded notes
router.get('/my/uploads',
  authenticate,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('all', 'active', 'pending', 'rejected', 'archived').default('all')
  })),
  notesController.getMyNotes
);

// PUT /api/notes/:id - Update note (Faculty and Admin only)
router.put('/:id',
  authenticate,
  authorize('faculty', 'admin'),
  validateParams(noteParamsSchema),
  validateBody(updateNoteSchema),
  notesController.updateNote
);

// DELETE /api/notes/:id - Delete note (Faculty and Admin only)
router.delete('/:id',
  authenticate,
  authorize('faculty', 'admin'),
  validateParams(noteParamsSchema),
  notesController.deleteNote
);

// Health check for notes service
router.get('/health/check',
  (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'Notes Management Service',
        status: 'operational',
        features: {
          upload: true,
          download: true,
          search: true,
          filtering: true,
          roleBasedAccess: true,
          fileValidation: true
        }
      },
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;