const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  // Link to tenant
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true
  },

  // Plan Details
  plan: {
    type: String,
    required: true,
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter'
  },

  status: {
    type: String,
    required: true,
    enum: ['active', 'trial', 'expired', 'cancelled', 'suspended'],
    default: 'trial',
    index: true
  },

  // Dates
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  endDate: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30-day trial
  },

  // Limits
  studentLimit: {
    type: Number,
    required: true,
    default: 500
  },

  facultyLimit: {
    type: Number,
    required: true,
    default: 50
  },

  // Features enabled for this plan
  features: [{
    type: String,
    trim: true
  }],

  // Billing contact
  billingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },

  // Plan pricing (placeholder — no actual billing)
  pricePerMonth: {
    type: Number,
    default: 0
  },

  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },

  // History tracking
  previousPlan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise', null],
    default: null
  },

  upgradedAt: {
    type: Date
  },

  cancelledAt: {
    type: Date
  },

  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Virtual: is currently valid
subscriptionSchema.virtual('isValid').get(function() {
  return (this.status === 'active' || this.status === 'trial') && this.endDate > new Date();
});

// Virtual: days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return 0;
  const diff = this.endDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Plan configurations (static reference)
subscriptionSchema.statics.PLAN_CONFIG = {
  starter: {
    name: 'Starter',
    studentLimit: 500,
    facultyLimit: 50,
    pricePerMonth: 0,
    features: ['attendance', 'marks', 'events', 'notes', 'timetable']
  },
  professional: {
    name: 'Professional',
    studentLimit: 2000,
    facultyLimit: 200,
    pricePerMonth: 4999,
    features: ['attendance', 'marks', 'events', 'notes', 'timetable', 'analytics', 'reports', 'bulk-import', 'api-access']
  },
  enterprise: {
    name: 'Enterprise',
    studentLimit: 10000,
    facultyLimit: 1000,
    pricePerMonth: 14999,
    features: ['attendance', 'marks', 'events', 'notes', 'timetable', 'analytics', 'reports', 'bulk-import', 'api-access', 'custom-branding', 'priority-support', 'sso']
  }
};

// Static: create subscription for a new tenant
subscriptionSchema.statics.createForTenant = async function(tenantId, plan = 'starter') {
  const config = this.PLAN_CONFIG[plan] || this.PLAN_CONFIG.starter;
  
  return this.create({
    tenantId,
    plan,
    status: plan === 'starter' ? 'trial' : 'active',
    studentLimit: config.studentLimit,
    facultyLimit: config.facultyLimit,
    pricePerMonth: config.pricePerMonth,
    features: config.features,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
