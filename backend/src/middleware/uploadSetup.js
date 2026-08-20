const fs = require('fs');
const path = require('path');

// Ensure upload directories exist
const ensureUploadDirectories = () => {
  const uploadDirs = [
    'uploads',
    'uploads/avatars',
    'uploads/notes',
    'uploads/routines',
    'uploads/temp'
  ];

  uploadDirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created upload directory: ${dir}`);
    }
  });
};

// Middleware to check file upload limits
const checkUploadLimits = (req, res, next) => {
  // Check if user has exceeded daily upload limit (placeholder)
  // This can be implemented with Redis or database tracking
  next();
};

// Clean up old temporary files
const cleanupTempFiles = () => {
  const tempDir = path.join(process.cwd(), 'uploads/temp');
  if (!fs.existsSync(tempDir)) return;

  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Cleaned up old temp file: ${file}`);
    }
  });
};

// Initialize upload setup
const initializeUploads = () => {
  ensureUploadDirectories();
  
  // Clean up temp files periodically
  setInterval(cleanupTempFiles, 60 * 60 * 1000); // Every hour
  
  console.log('📁 Upload system initialized');
};

module.exports = {
  ensureUploadDirectories,
  checkUploadLimits,
  cleanupTempFiles,
  initializeUploads
};
