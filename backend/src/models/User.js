const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config/index');

const userSchema = new mongoose.Schema({
  // Multi-Tenant Identifier
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    trim: true
  },

  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [7, 'Password must be at least 7 characters long'],
    select: false // Don't include password in queries by default
  },
  
  // Role-based Access Control
  role: {
    type: String,
    enum: {
      values: ['student', 'faculty', 'admin', 'institution_admin', 'super_admin', 'parent'],
      message: 'Role must be student, faculty, admin, institution_admin, super_admin, or parent'
    },
    default: 'student'
  },
  
  // Profile Information
  avatar: {
    type: String,
    default: null
  },
  
  // Academic Information
  department: {
    type: String,
    required: function() {
      return this.role === 'student' || this.role === 'faculty';
    },
    trim: true,
    set: function(v) {
      if (!v) return v;
      if (v.toLowerCase() === 'administration') return 'Administration';
      return v.toUpperCase();
    }
  },
  
  academicYear: {
    type: Number,
    required: function() {
      return this.role === 'student';
    },
    min: [1, 'Academic year must be between 1 and 4'],
    max: [4, 'Academic year must be between 1 and 4'],
    validate: {
      validator: function(value) {
        // Only students need academic year
        if (this.role === 'student') {
          return value >= 1 && value <= 4;
        }
        return true;
      },
      message: 'Academic year is required for students and must be between 1 and 4'
    }
  },

  section: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Section cannot exceed 10 characters'],
    required: function() {
      return this.role === 'student';
    }
  },

  rollNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [30, 'Roll number cannot exceed 30 characters']
  },

  // Faculty accessible years (for faculty role only)
  accessibleYears: {
    type: [Number],
    required: function() {
      return this.role === 'faculty';
    },
    validate: {
      validator: function(years) {
        if (this.role === 'faculty') {
          return years && years.length > 0 && years.every(year => year >= 1 && year <= 4);
        }
        return true;
      },
      message: 'Faculty must have access to at least one year between 1 and 4'
    }
  },

  accessibleSubjects: [{
    subjectCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    subjectName: {
      type: String,
      required: true,
      trim: true
    },
    academicYears: {
      type: [Number],
      default: [],
      validate: {
        validator: function(years) {
          return Array.isArray(years) && years.length > 0 && years.every(year => year >= 1 && year <= 4);
        },
        message: 'Subject access must include at least one academic year between 1 and 4'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Parent-Child Relationship (for parent role only)
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.role === 'parent';
    },
    validate: {
      validator: function(childId) {
        if (this.role === 'parent') {
          return childId != null;
        }
        return true;
      },
      message: 'Child ID is required for parent users'
    }
  },

  // Parent emails (for student users to track linked parents)
  parentEmails: [{
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid parent email address']
    },
    verified: {
      type: Boolean,
      default: false
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Reputation System (for forum)
  reputation: {
    type: Number,
    default: 0,
    min: [0, 'Reputation cannot be negative']
  },
  
  // Student Personal Tracker
  personalDeadlines: [{
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    color: { type: String, default: 'text-blue-700 bg-blue-50 border border-blue-100 font-semibold' }
  }],
  
  personalProgress: [{
    semester: { type: String, required: true },
    gpa: { type: Number, required: true },
    max: { type: Number, default: 10 },
    color: { type: String, default: 'bg-blue-500' }
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Security
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  // Password Reset
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  // Email Verification
  emailVerificationToken: {
    type: String,
    select: false
  },
  
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  
  // Last Activity
  lastLogin: {
    type: Date
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, department: 1 });
userSchema.index({ tenantId: 1, academicYear: 1 });
userSchema.index({ tenantId: 1, section: 1 });
userSchema.index({ tenantId: 1, rollNumber: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full academic info
userSchema.virtual('academicInfo').get(function() {
  if (this.role === 'student') {
    return {
      department: this.department,
      year: this.academicYear,
      displayText: `${this.academicYear}${this.academicYear === 1 ? 'st' : 
                   this.academicYear === 2 ? 'nd' : 
                   this.academicYear === 3 ? 'rd' : 'th'} Year ${this.department}`
    };
  }
  return {
    department: this.department,
    displayText: this.department
  };
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastActivity
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified()) {
    this.lastActivity = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
    tenantId: this.tenantId,
    department: this.department,
    academicYear: this.academicYear
  };
  
  // Add childId for parent users
  if (this.role === 'parent' && this.childId) {
    payload.childId = this.childId;
  }
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
};

// Instance method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we're at max attempts and not locked, lock the account
  if (this.loginAttempts + 1 >= config.security.maxLoginAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + config.security.lockoutTime };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = require('crypto').randomBytes(32).toString('hex');
  
  this.emailVerificationToken = require('crypto')
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

// Static method to find user by credentials
userSchema.statics.findByCredentials = async function(email, password, tenantId) {
  const query = { 
    email: email.toLowerCase(),
    isActive: true 
  };
  
  if (tenantId) {
    query.tenantId = tenantId;
  }
  
  // Try to find the user
  const users = await this.find(query).select('+password');
  
  if (users.length === 0) {
    throw new Error('Invalid login credentials');
  }
  
  if (users.length > 1) {
    throw new Error('Multiple accounts found with this email. Please specify your institution.');
  }
  
  const user = users[0];
  
  // Check if account is locked
  if (user.isLocked) {
    throw new Error('Account is temporarily locked due to too many failed login attempts');
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    throw new Error('Invalid login credentials');
  }
  
  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }
  
  // Update last login
  user.lastLogin = new Date();
  await user.save();
  
  return user;
};

// Static method to find by password reset token
userSchema.statics.findByPasswordResetToken = async function(token) {
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return await this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
    isActive: true
  });
};

// Static method to find by email verification token
userSchema.statics.findByEmailVerificationToken = async function(token) {
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  return await this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
    isActive: true
  });
};

// Static method to get users by department and year (for targeting)
userSchema.statics.findByTarget = async function(departments = [], years = [], isGlobal = false) {
  if (isGlobal) {
    return await this.find({ isActive: true });
  }
  
  const query = { isActive: true };
  
  if (departments.length > 0) {
    query.department = { $in: departments };
  }
  
  if (years.length > 0) {
    query.academicYear = { $in: years };
  }
  
  return await this.find(query);
};

module.exports = mongoose.model('User', userSchema);
