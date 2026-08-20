const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Multi-Tenant Identifier
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    trim: true
  },

  // Basic Event Information
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },

  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    minlength: [3, 'Description must be at least 3 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Date and Time
  date: {
    type: Date,
    required: [true, 'Event date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Event date must be in the future'
    }
  },

  endDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.date;
      },
      message: 'End date must be after start date'
    }
  },

  // Location
  location: {
    type: String,
    required: [true, 'Event location is required'],
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters']
  },

  // Event Classification
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: {
      values: ['academic', 'cultural', 'sports', 'workshop', 'seminar', 'conference', 'competition', 'other'],
      message: 'Invalid event category'
    },
    default: 'academic'
  },

  // Targeting Rules
  targetDepartments: [{
    type: String,
    enum: {
      values: ['CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'ALL'],
      message: 'Invalid department code'
    }
  }],

  targetAcademicYears: [{
    type: Number,
    min: [1, 'Academic year must be between 1 and 4'],
    max: [4, 'Academic year must be between 1 and 4']
  }],

  // Registration Management
  maxAttendees: {
    type: Number,
    min: [1, 'Maximum attendees must be at least 1'],
    max: [10000, 'Maximum attendees cannot exceed 10000']
  },

  registrationDeadline: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value <= this.date;
      },
      message: 'Registration deadline must be before event date'
    }
  },

  registrationRequired: {
    type: Boolean,
    default: true
  },

  // Organizer Information
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event organizer is required'],
    index: true
  },

  organizerRole: {
    type: String,
    enum: ['faculty', 'admin', 'student'],
    required: [true, 'Organizer role is required']
  },

  // Event Status
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
      message: 'Invalid event status'
    },
    default: 'draft'
  },

  // Attendee Management
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    attended: {
      type: Boolean,
      default: false
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: {
        type: String,
        maxlength: [500, 'Feedback comment cannot exceed 500 characters']
      }
    }
  }],

  // Event Settings
  isPublic: {
    type: Boolean,
    default: true
  },

  requiresApproval: {
    type: Boolean,
    default: false
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  approvedAt: {
    type: Date
  },

  // Additional Information
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],

  attachments: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Contact Information
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return !email || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },

  contactPhone: {
    type: String,
    trim: true,
    validate: {
      validator: function(phone) {
        return !phone || /^[0-9]{10}$/.test(phone);
      },
      message: 'Please enter a valid 10-digit phone number'
    }
  },

  // Analytics
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },

  // Metadata
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
eventSchema.index({ organizer: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ targetDepartments: 1 });
eventSchema.index({ targetAcademicYears: 1 });
eventSchema.index({ createdAt: -1 });

// Text search index
eventSchema.index({
  title: 'text',
  description: 'text',
  location: 'text',
  tags: 'text'
});

// Virtual for registration count
eventSchema.virtual('registrationCount').get(function() {
  return this.attendees ? this.attendees.length : 0;
});

// Virtual for attendance count
eventSchema.virtual('attendanceCount').get(function() {
  return this.attendees ? this.attendees.filter(attendee => attendee.attended).length : 0;
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxAttendees) return null;
  return Math.max(0, this.maxAttendees - this.registrationCount);
});

// Virtual for registration status
eventSchema.virtual('registrationStatus').get(function() {
  const now = new Date();
  
  if (this.status === 'cancelled') return 'cancelled';
  if (this.status === 'completed') return 'closed';
  if (this.registrationDeadline && now > this.registrationDeadline) return 'closed';
  if (this.maxAttendees && this.registrationCount >= this.maxAttendees) return 'full';
  if (this.status === 'published') return 'open';
  
  return 'closed';
});

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
  if (!this.endDate) return null;
  return Math.ceil((this.endDate - this.date) / (1000 * 60 * 60)); // Duration in hours
});

// Pre-save middleware
eventSchema.pre('save', function(next) {
  // Set default target departments and years if not specified
  if (!this.targetDepartments || this.targetDepartments.length === 0) {
    this.targetDepartments = ['ALL'];
  }
  
  if (!this.targetAcademicYears || this.targetAcademicYears.length === 0) {
    this.targetAcademicYears = [1, 2, 3, 4];
  }
  
  // Auto-approve faculty and admin events
  if (this.isNew && (this.organizerRole === 'faculty' || this.organizerRole === 'admin')) {
    this.status = 'published';
    this.approvedAt = new Date();
  }
  
  next();
});

// Instance method to check if user can register
eventSchema.methods.canRegister = function(user) {
  if (!user) return false;
  
  // Check if event is open for registration
  if (this.registrationStatus !== 'open') return false;
  
  // Check if user is already registered
  if (this.attendees.some(attendee => attendee.user.toString() === user._id.toString())) {
    return false;
  }
  
  // Check department targeting
  if (!this.targetDepartments.includes('ALL') && !this.targetDepartments.includes(user.department)) {
    return false;
  }
  
  // Check academic year targeting (only for students)
  if (user.role === 'student' && !this.targetAcademicYears.includes(user.academicYear)) {
    return false;
  }
  
  return true;
};

// Instance method to register user
eventSchema.methods.registerUser = async function(user) {
  if (!this.canRegister(user)) {
    throw new Error('User cannot register for this event');
  }
  
  this.attendees.push({
    user: user._id,
    registeredAt: new Date()
  });
  
  return await this.save();
};

// Instance method to mark attendance
eventSchema.methods.markAttendance = async function(userId, attended = true) {
  const attendee = this.attendees.find(att => att.user.toString() === userId.toString());
  
  if (!attendee) {
    throw new Error('User is not registered for this event');
  }
  
  attendee.attended = attended;
  return await this.save();
};

// Instance method to add feedback
eventSchema.methods.addFeedback = async function(userId, rating, comment) {
  const attendee = this.attendees.find(att => att.user.toString() === userId.toString());
  
  if (!attendee) {
    throw new Error('User is not registered for this event');
  }
  
  if (!attendee.attended) {
    throw new Error('User must attend the event to provide feedback');
  }
  
  attendee.feedback = { rating, comment };
  return await this.save();
};

// Instance method to increment views
eventSchema.methods.incrementViews = async function() {
  this.views += 1;
  return await this.save();
};

// Static method to find events by organizer
eventSchema.statics.findByOrganizer = function(organizerId, options = {}) {
  const {
    status,
    category,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 }
  } = options;

  const query = { organizer: organizerId };
  
  if (status) query.status = status;
  if (category) query.category = category;

  return this.find(query)
    .populate('organizer', 'name role department')
    .sort(sort)
    .limit(limit)
    .skip(skip);
};

// Static method to find events by department and year
eventSchema.statics.findByTarget = function(department, academicYear, options = {}) {
  const {
    status = 'published',
    category,
    upcoming = true,
    limit = 20,
    skip = 0
  } = options;

  const query = {
    status,
    $or: [
      { targetDepartments: 'ALL' },
      { targetDepartments: department }
    ],
    targetAcademicYears: academicYear
  };
  
  if (category) query.category = category;
  if (upcoming) query.date = { $gte: new Date() };

  return this.find(query)
    .populate('organizer', 'name role department')
    .sort({ date: 1 })
    .limit(limit)
    .skip(skip);
};

// Static method to search events
eventSchema.statics.searchEvents = function(searchTerm, filters = {}) {
  const {
    department,
    academicYear,
    category,
    status = 'published',
    limit = 20,
    skip = 0
  } = filters;

  const query = {
    $text: { $search: searchTerm },
    status
  };

  if (department) {
    query.$or = [
      { targetDepartments: 'ALL' },
      { targetDepartments: department }
    ];
  }
  
  if (academicYear) query.targetAcademicYears = academicYear;
  if (category) query.category = category;

  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('organizer', 'name role department')
    .sort({ score: { $meta: 'textScore' }, date: 1 })
    .limit(limit)
    .skip(skip);
};

module.exports = mongoose.model('Event', eventSchema);