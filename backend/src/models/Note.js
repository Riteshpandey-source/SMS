const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  // Multi-Tenant Identifier
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    trim: true
  },

  // Basic Information
  title: {
    type: String,
    required: [true, 'Note title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },

  description: {
    type: String,
    required: [true, 'Note description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  // File Information
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },

  originalName: {
    type: String,
    required: [true, 'Original filename is required']
  },

  filePath: {
    type: String,
    required: [true, 'File path is required']
  },

  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },

  mimeType: {
    type: String,
    required: [true, 'File type is required']
  },

  // Academic Context
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [50, 'Subject name cannot exceed 50 characters']
  },

  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: ['CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL'],
      message: 'Invalid department code'
    }
  },

  academicYear: {
    type: [Number],
    required: [true, 'Academic year is required'],
    validate: {
      validator: function(years) {
        return years.length > 0 && years.every(year => year >= 1 && year <= 4);
      },
      message: 'Academic years must be between 1 and 4'
    }
  },

  // Content Classification
  category: {
    type: String,
    enum: {
      values: ['lecture', 'assignment', 'lab', 'project', 'exam', 'reference', 'other'],
      message: 'Invalid note category'
    },
    default: 'lecture'
  },

  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],

  // Author Information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader information is required']
  },

  uploaderRole: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    required: [true, 'Uploader role is required']
  },

  // Visibility and Access
  isPublic: {
    type: Boolean,
    default: true
  },

  isApproved: {
    type: Boolean,
    default: function() {
      // Faculty and admin uploads are auto-approved
      return this.uploaderRole === 'faculty' || this.uploaderRole === 'admin';
    }
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  // Statistics
  downloads: {
    type: Number,
    default: 0,
    min: [0, 'Downloads cannot be negative']
  },

  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },

  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },

  // Moderation
  isReported: {
    type: Boolean,
    default: false
  },

  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String,
      enum: ['inappropriate', 'copyright', 'spam', 'incorrect', 'other'],
      required: true
    },
    description: {
      type: String,
      maxlength: [200, 'Report description cannot exceed 200 characters']
    },
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected', 'archived'],
    default: function() {
      return this.isApproved ? 'active' : 'pending';
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.filePath;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
noteSchema.index({ department: 1, academicYear: 1 });
noteSchema.index({ subject: 1 });
noteSchema.index({ uploadedBy: 1 });
noteSchema.index({ isApproved: 1, status: 1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ downloads: -1 });
noteSchema.index({ 'rating.average': -1 });
noteSchema.index({ tags: 1 });

// Text search index
noteSchema.index({
  title: 'text',
  description: 'text',
  subject: 'text',
  tags: 'text'
});

// Virtual for file URL
noteSchema.virtual('fileUrl').get(function() {
  return `/api/notes/${this._id}/download`;
});

// Virtual for uploader info
noteSchema.virtual('uploaderInfo', {
  ref: 'User',
  localField: 'uploadedBy',
  foreignField: '_id',
  justOne: true,
  select: 'name role department academicYear'
});

// Virtual for academic year display
noteSchema.virtual('academicYearDisplay').get(function() {
  if (this.academicYear.length === 1) {
    const year = this.academicYear[0];
    return `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;
  } else {
    return this.academicYear.map(year => 
      `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'}`
    ).join(', ') + ' Years';
  }
});

// Virtual for file size display
noteSchema.virtual('fileSizeDisplay').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Pre-save middleware
noteSchema.pre('save', function(next) {
  // Auto-approve faculty and admin uploads
  if (this.isNew && (this.uploaderRole === 'faculty' || this.uploaderRole === 'admin')) {
    this.isApproved = true;
    this.status = 'active';
    this.approvedAt = new Date();
  }
  
  next();
});

// Instance method to check if user can access this note
noteSchema.methods.canAccess = function(user) {
  if (!user) return false;
  
  // Admin can access everything
  if (user.role === 'admin') return true;
  
  // Owner can always access
  if (this.uploadedBy.toString() === user._id.toString()) return true;
  
  // Only approved and active notes are publicly accessible
  if (!this.isApproved || this.status !== 'active') return false;
  
  // Check department access
  if (this.department !== user.department) return false;
  
  // Faculty can access all years in their department
  if (user.role === 'faculty') return true;
  
  // Students can only access notes for their year or general notes
  if (user.role === 'student') {
    return this.academicYear.includes(user.academicYear);
  }
  
  return false;
};

// Instance method to increment downloads
noteSchema.methods.incrementDownloads = async function() {
  this.downloads += 1;
  return await this.save();
};

// Instance method to increment views
noteSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save();
};

// Instance method to add rating
noteSchema.methods.addRating = async function(rating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + rating) / this.rating.count;
  return await this.save();
};

// Static method to find notes by academic context
noteSchema.statics.findByAcademicContext = async function(department, academicYear, options = {}) {
  const {
    subject,
    category,
    uploaderRole,
    isApproved = true,
    status = 'active',
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;

  const query = {
    department,
    academicYear: { $in: [academicYear] },
    isApproved,
    status
  };

  if (subject) query.subject = subject;
  if (category) query.category = category;
  if (uploaderRole) query.uploaderRole = uploaderRole;

  return await this.find(query)
    .populate('uploadedBy', 'name role department academicYear')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to search notes
noteSchema.statics.searchNotes = async function(searchTerm, filters = {}) {
  const {
    department,
    academicYear,
    subject,
    category,
    uploaderRole,
    limit = 20,
    skip = 0
  } = filters;

  const query = {
    $text: { $search: searchTerm },
    isApproved: true,
    status: 'active'
  };

  if (department) query.department = department;
  if (academicYear) query.academicYear = { $in: [academicYear] };
  if (subject) query.subject = subject;
  if (category) query.category = category;
  if (uploaderRole) query.uploaderRole = uploaderRole;

  return await this.find(query, { score: { $meta: 'textScore' } })
    .populate('uploadedBy', 'name role department academicYear')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Note', noteSchema);