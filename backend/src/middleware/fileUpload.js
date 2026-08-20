const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Avatar upload configuration
const createAvatarUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
      ensureUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const userId = req.user ? req.user._id : 'anonymous';
      const extension = path.extname(file.originalname).toLowerCase();
      
      const filename = `avatar-${userId}-${timestamp}-${uniqueId}${extension}`;
      cb(null, filename);
    }
  });

  const fileFilter = (req, file, cb) => {
    // Check file type
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1 // Only one file at a time
    }
  });
};

// Notes upload configuration
const createNotesUpload = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', 'notes');
      ensureUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const userId = req.user ? req.user._id : 'anonymous';
      const extension = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, extension)
        .replace(/[^a-zA-Z0-9]/g, '-')
        .substring(0, 50);
      
      const filename = `note-${userId}-${timestamp}-${baseName}-${uniqueId}${extension}`;
      cb(null, filename);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for notes. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, JPEG, PNG'), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit for notes
      files: 1
    }
  });
};

// Generic file upload with custom options
const createCustomUpload = (options = {}) => {
  const {
    destination = 'uploads/temp',
    allowedMimes = ['image/*'],
    maxFileSize = 10 * 1024 * 1024,
    maxFiles = 1,
    filenamePrefix = 'file'
  } = options;

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), destination);
      ensureUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueId = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now();
      const extension = path.extname(file.originalname).toLowerCase();
      
      const filename = `${filenamePrefix}-${timestamp}-${uniqueId}${extension}`;
      cb(null, filename);
    }
  });

  const fileFilter = (req, file, cb) => {
    const isAllowed = allowedMimes.some(mime => {
      if (mime.endsWith('/*')) {
        return file.mimetype.startsWith(mime.slice(0, -2));
      }
      return file.mimetype === mime;
    });

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedMimes.join(', ')}`), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles
    }
  });
};

// Routine upload configuration (admin uploads class routines)
const createRoutineUpload = () => {
  return createCustomUpload({
    destination: 'uploads/routines',
    allowedMimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ],
    maxFileSize: 20 * 1024 * 1024,
    maxFiles: 1,
    filenamePrefix: 'routine'
  });
};

// Error handler for multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    let code = 'UPLOAD_ERROR';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in multipart form';
        code = 'TOO_MANY_PARTS';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        code = 'FIELD_NAME_TOO_LONG';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        code = 'FIELD_VALUE_TOO_LONG';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        code = 'TOO_MANY_FIELDS';
        break;
    }

    return res.status(400).json({
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }

  next(error);
};

// File cleanup utility
const cleanupFile = async (filePath) => {
  try {
    const fs = require('fs').promises;
    await fs.unlink(filePath);
    console.log(`🗑️  Cleaned up file: ${filePath}`);
  } catch (error) {
    console.warn(`Failed to cleanup file ${filePath}:`, error.message);
  }
};

// Get file info
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    destination: file.destination
  };
};

module.exports = {
  createAvatarUpload,
  createNotesUpload,
  createRoutineUpload,
  createCustomUpload,
  handleMulterError,
  cleanupFile,
  getFileInfo,
  ensureUploadDir
};
