const mongoose = require('mongoose');
const crypto = require('crypto');

const tenantSchema = new mongoose.Schema({
  // Unique tenant identifier (auto-generated)
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    unique: true,
    trim: true,
    index: true
  },

  // Institution Information
  name: {
    type: String,
    required: [true, 'Institution name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },

  code: {
    type: String,
    required: [true, 'Institution code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [2, 'Code must be at least 2 characters'],
    maxlength: [20, 'Code cannot exceed 20 characters']
  },

  type: {
    type: String,
    required: [true, 'Institution type is required'],
    enum: {
      values: ['college', 'university', 'institute', 'school'],
      message: 'Type must be college, university, institute, or school'
    },
    default: 'college'
  },

  // Contact Information
  email: {
    type: String,
    required: [true, 'Institution email is required'],
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },

  phone: {
    type: String,
    trim: true,
    maxlength: [50, 'Phone cannot exceed 50 characters']
  },

  // Domain & Subdomain (for tenant identification)
  domain: {
    type: String,
    lowercase: true,
    trim: true,
    index: true
  },

  subdomain: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true,
    index: true
  },

  // Branding
  logo: {
    type: String,
    default: null
  },

  primaryColor: {
    type: String,
    default: '#0B1220',
    trim: true
  },

  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true }
  },

  timezone: {
    type: String,
    default: 'Asia/Kolkata',
    trim: true
  },

  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true
  },

  // Subscription
  plan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter'
  },

  subscriptionStatus: {
    type: String,
    enum: ['active', 'trial', 'suspended', 'expired', 'cancelled'],
    default: 'trial'
  },

  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },

  subscriptionEndDate: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day trial
  },

  studentLimit: {
    type: Number,
    default: 500 // Starter plan default
  },

  facultyLimit: {
    type: Number,
    default: 50 // Starter plan default
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive', 'pending'],
    default: 'active',
    index: true
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Onboarding
  onboardingCompleted: {
    type: Boolean,
    default: false
  },

  onboardingStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 8
  },

  // Academic Configuration (dynamic, not hardcoded)
  departments: [{
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true }
  }],

  academicYearConfig: {
    startMonth: { type: Number, default: 7 },  // July
    endMonth: { type: Number, default: 6 },    // June
    maxYears: { type: Number, default: 4, min: 1, max: 6 }
  },

  courses: [{
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, uppercase: true },
    duration: { type: Number, default: 4 }, // in years
    isActive: { type: Boolean, default: true }
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
tenantSchema.index({ status: 1, isActive: 1 });
tenantSchema.index({ plan: 1 });
tenantSchema.index({ 'address.state': 1 });
tenantSchema.index({ createdAt: -1 });

// Virtual: check if subscription is valid
tenantSchema.virtual('isSubscriptionActive').get(function() {
  if (this.subscriptionStatus === 'active' || this.subscriptionStatus === 'trial') {
    return !this.subscriptionEndDate || this.subscriptionEndDate > new Date();
  }
  return false;
});

// Virtual: days remaining in subscription
tenantSchema.virtual('subscriptionDaysRemaining').get(function() {
  if (!this.subscriptionEndDate) return null;
  const diff = this.subscriptionEndDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Static: generate a unique tenant ID
tenantSchema.statics.generateTenantId = async function() {
  const count = await this.countDocuments();
  const id = `tenant_${String(count + 1).padStart(3, '0')}`;
  // Verify uniqueness
  const exists = await this.findOne({ tenantId: id });
  if (exists) {
    // Fallback to random suffix
    return `tenant_${crypto.randomBytes(4).toString('hex')}`;
  }
  return id;
};

// Static: find by subdomain
tenantSchema.statics.findBySubdomain = async function(subdomain) {
  return this.findOne({ subdomain: subdomain.toLowerCase(), isActive: true });
};

// Static: find by domain (email domain matching)
tenantSchema.statics.findByDomain = async function(domain) {
  return this.find({ domain: domain.toLowerCase(), isActive: true });
};

// Static: find by tenant code
tenantSchema.statics.findByCode = async function(code) {
  return this.findOne({ code: code.toUpperCase(), isActive: true });
};

// Instance: get department codes as flat array
tenantSchema.methods.getDepartmentCodes = function() {
  return this.departments
    .filter(d => d.isActive)
    .map(d => d.code);
};

// Instance: check student capacity
tenantSchema.methods.hasStudentCapacity = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({ tenantId: this.tenantId, role: 'student', isActive: true });
  return count < this.studentLimit;
};

// Instance: check faculty capacity
tenantSchema.methods.hasFacultyCapacity = async function() {
  const User = mongoose.model('User');
  const count = await User.countDocuments({ tenantId: this.tenantId, role: 'faculty', isActive: true });
  return count < this.facultyLimit;
};

module.exports = mongoose.model('Tenant', tenantSchema);
