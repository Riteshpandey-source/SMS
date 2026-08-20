const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Multi-Tenant Identifier
  tenantId: {
    type: String,
    index: true,
    trim: true
  },

  // User who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Type of user (parent, admin, faculty, student)
  userRole: {
    type: String,
    required: true,
    enum: ['student', 'faculty', 'admin', 'parent']
  },
  
  // For parent users - the child they accessed data for
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.userRole === 'parent';
    },
    index: true
  },
  
  // Action performed
  action: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // HTTP method and URL
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  
  url: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Request details
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: {
    type: String,
    maxlength: 500
  },
  
  // Response details
  statusCode: {
    type: Number
  },
  
  // Additional context
  resourceType: {
    type: String,
    enum: ['academic_records', 'attendance', 'marks', 'notifications', 'profile', 'other']
  },
  
  // Audit trail type
  auditType: {
    type: String,
    required: true,
    enum: ['ACCESS', 'MODIFICATION', 'DELETION', 'CREATION', 'LOGIN', 'LOGOUT'],
    default: 'ACCESS'
  },
  
  // Success or failure
  success: {
    type: Boolean,
    default: true
  },
  
  // Error message if failed
  errorMessage: {
    type: String,
    maxlength: 500
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  // Automatically delete logs older than 2 years
  expireAfterSeconds: 2 * 365 * 24 * 60 * 60
});

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });
auditLogSchema.index({ auditType: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });

// Static method to log parent access
auditLogSchema.statics.logParentAccess = async function(parentId, childId, method, url, ipAddress, userAgent = null, statusCode = 200, success = true, errorMessage = null) {
  try {
    const auditEntry = {
      userId: parentId,
      userRole: 'parent',
      targetUserId: childId,
      action: `${method} ${url}`,
      method: method.toUpperCase(),
      url,
      ipAddress,
      userAgent,
      statusCode,
      auditType: 'ACCESS',
      success,
      errorMessage,
      resourceType: this.determineResourceType(url)
    };
    
    await this.create(auditEntry);
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  }
};

// Static method to determine resource type from URL
auditLogSchema.statics.determineResourceType = function(url) {
  if (url.includes('/academic-records') || url.includes('/academic')) {
    return 'academic_records';
  }
  if (url.includes('/attendance')) {
    return 'attendance';
  }
  if (url.includes('/marks') || url.includes('/grades')) {
    return 'marks';
  }
  if (url.includes('/notifications')) {
    return 'notifications';
  }
  if (url.includes('/profile')) {
    return 'profile';
  }
  return 'other';
};

// Static method to get parent access logs
auditLogSchema.statics.getParentAccessLogs = async function(parentId, limit = 50, skip = 0) {
  return await this.find({ 
    userId: parentId, 
    userRole: 'parent' 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('targetUserId', 'name email department academicYear')
  .lean();
};

// Static method to get child access logs (for students to see who accessed their data)
auditLogSchema.statics.getChildAccessLogs = async function(childId, limit = 50, skip = 0) {
  return await this.find({ 
    targetUserId: childId, 
    userRole: 'parent' 
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip)
  .populate('userId', 'name email')
  .lean();
};

// Static method to get access statistics
auditLogSchema.statics.getAccessStats = async function(parentId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(parentId),
        userRole: 'parent',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          resourceType: '$resourceType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.date': -1 }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('AuditLog', auditLogSchema);