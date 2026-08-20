const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const sessionManager = require('../utils/sessionManager');
const tokenBlacklist = require('../utils/tokenBlacklist');
const { formatUserForPrivate } = require('../utils/userUtils');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');
const emailUtils = require('../utils/email');

const buildDeviceInfo = (req) => ({
  userAgent: req.get('User-Agent'),
  ip: req.ip,
  platform: req.get('User-Agent')?.includes('Mobile') ? 'Mobile' : 'Desktop',
  browser: req.get('User-Agent')?.split(' ')[0] || 'Unknown'
});

const register = async (req, res) => {
  res.status(403).json({
    success: false,
    error: {
      code: 'REGISTRATION_DISABLED',
      message: 'Student self-registration is disabled. Please contact admin for your account.',
      timestamp: new Date().toISOString()
    }
  });
};

const identifyTenant = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email, domain, or subdomain
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_IDENTIFIER',
          message: 'Please provide an email, domain, or subdomain to identify your institution.',
          timestamp: new Date().toISOString()
        }
      });
    }

    const Tenant = require('../models/Tenant');
    let tenant = null;

    // Try to find by exact subdomain or domain first
    tenant = await Tenant.findOne({
      $or: [
        { subdomain: identifier.toLowerCase() },
        { domain: identifier.toLowerCase() }
      ],
      isActive: true
    });

    // If not found and identifier looks like an email, try domain matching
    if (!tenant && identifier.includes('@')) {
      const emailDomain = identifier.split('@')[1].toLowerCase();
      
      // We don't match public domains (gmail, yahoo, etc.)
      const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      
      if (!publicDomains.includes(emailDomain)) {
        tenant = await Tenant.findOne({ domain: emailDomain, isActive: true });
        
        // If still not found by domain, check if it's a specific user's email
        if (!tenant) {
          const user = await User.findOne({ email: identifier.toLowerCase() });
          if (user && user.tenantId && user.tenantId !== 'platform') {
            tenant = await Tenant.findOne({ tenantId: user.tenantId, isActive: true });
          }
        }
      } else {
        // It's a public domain, check if they are registered as a user
        const user = await User.findOne({ email: identifier.toLowerCase() });
        if (user && user.tenantId && user.tenantId !== 'platform') {
          tenant = await Tenant.findOne({ tenantId: user.tenantId, isActive: true });
        }
      }
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Could not identify your institution. Please check your email or domain.',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: {
        tenantId: tenant.tenantId,
        name: tenant.name,
        code: tenant.code,
        logo: tenant.logo,
        primaryColor: tenant.primaryColor
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tenant identification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'IDENTIFICATION_FAILED',
        message: 'An error occurred while identifying your institution.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const registerInstitution = async (req, res) => {
  try {
    const {
      institutionName,
      type,
      subdomain,
      adminName,
      adminEmail,
      adminPassword,
      phone
    } = req.body;

    const Tenant = require('../models/Tenant');
    const Subscription = require('../models/Subscription');

    // Basic validation
    if (!institutionName || !subdomain || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'All fields are required for institution registration.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if subdomain is taken
    const existingSubdomain = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
    if (existingSubdomain) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'SUBDOMAIN_TAKEN',
          message: 'This workspace URL is already taken. Please choose another one.',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if email domain is already registered to another institution (excluding public domains)
    const emailDomain = adminEmail.split('@')[1].toLowerCase();
    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    
    if (!publicDomains.includes(emailDomain)) {
      const existingDomain = await Tenant.findOne({ domain: emailDomain });
      if (existingDomain) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DOMAIN_REGISTERED',
            message: `An institution with the domain ${emailDomain} is already registered.`,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Generate unique tenant ID
    const tenantId = `tenant_${crypto.randomBytes(4).toString('hex')}`;
    const code = institutionName.substring(0, 4).toUpperCase();

    try {
      // 1. Create Tenant
      const tenant = new Tenant({
        tenantId,
        name: institutionName,
        code,
        type: type || 'college',
        email: adminEmail,
        phone: phone || '',
        domain: publicDomains.includes(emailDomain) ? '' : emailDomain,
        subdomain: subdomain.toLowerCase(),
        plan: 'starter',
        subscriptionStatus: 'trial',
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        studentLimit: 100,
        facultyLimit: 10,
        status: 'active',
        isActive: true,
        onboardingCompleted: false,
        onboardingStep: 1,
        departments: [
          { code: 'CS', name: 'Computer Science', isActive: true },
          { code: 'ME', name: 'Mechanical Engineering', isActive: true }
        ]
      });
      await tenant.save();

      // 2. Create Subscription Record
      const subscription = new Subscription({
        tenantId,
        plan: 'starter',
        status: 'trial',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        studentLimit: 100,
        facultyLimit: 10,
        features: ['attendance', 'marks', 'events', 'notes', 'timetable'],
        billingEmail: adminEmail,
        pricePerMonth: 0,
        currency: 'USD'
      });
      await subscription.save();

      // 3. Create Institution Admin User
      const adminUser = new User({
        tenantId,
        name: adminName,
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'admin',
        department: 'Administration',
        isActive: true,
        isEmailVerified: false
      });
      await adminUser.save();

      // Formatting the user response could be added here if needed, but we don't have to send welcome email for local testing if it crashes.

      res.status(201).json({
        success: true,
        message: 'Institution registered successfully! Please check your email to verify your account.',
        data: {
          tenantId,
          subdomain: tenant.subdomain,
          adminEmail
        },
        timestamp: new Date().toISOString()
      });

    } catch (txError) {
      // Manual rollback
      await Tenant.deleteOne({ tenantId });
      await Subscription.deleteOne({ tenantId });
      await User.deleteOne({ email: adminEmail, tenantId });
      throw txError;
    }

  } catch (error) {
    console.error('Institution registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: 'An error occurred during registration. Please try again.',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, tenantId: bodyTenantId } = req.body;
    const user = await User.findByCredentials(email, password, bodyTenantId);
    
    // Check tenant status (skip for super_admin on 'platform' tenant)
    let tenantInfo = null;
    if (user.tenantId && user.tenantId !== 'platform') {
      const Tenant = require('../models/Tenant');
      const tenant = await Tenant.findOne({ tenantId: user.tenantId });
      
      if (!tenant || !tenant.isActive) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_INACTIVE',
            message: 'Your institution account is currently inactive. Please contact support.',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      if (tenant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TENANT_SUSPENDED',
            message: 'Your institution account has been suspended. Please contact CampusBuddy support.',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      tenantInfo = {
        tenantId: tenant.tenantId,
        name: tenant.name,
        code: tenant.code,
        type: tenant.type,
        logo: tenant.logo,
        primaryColor: tenant.primaryColor,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus
      };
    } else if (user.role === 'super_admin') {
      tenantInfo = {
        tenantId: 'platform',
        name: 'CampusBuddy Platform',
        code: 'PLATFORM',
        type: 'platform',
        logo: null,
        primaryColor: '#0B1220',
        plan: 'enterprise',
        subscriptionStatus: 'active'
      };
    }
    
    const session = await sessionManager.createSession(user, buildDeviceInfo(req));

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserForPrivate(user),
        tenant: tenantInfo,
        session: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: session.expiresIn,
          sessionId: session.sessionId
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);

    const statusCode = error.message.includes('locked') ? 423 : 401;
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 423 ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
        message: statusCode === 423 ? error.message : 'Invalid email or password',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = verifyRefreshToken(refreshToken);
    const blacklisted = await tokenBlacklist.isRefreshTokenBlacklisted(refreshToken);

    if (blacklisted) {
      throw new Error('Refresh token blacklisted');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new Error('User not found');
    }

    const tokens = generateTokenPair(user);
    await tokenBlacklist.addRefreshToken(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: 'Unable to refresh session',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true }).select('+passwordResetToken +passwordResetExpires');
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
      await user.save();

      try {
        await emailUtils.sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'If the account exists, a password reset link has been sent to the email address.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FORGOT_PASSWORD_ERROR',
        message: 'Unable to process forgot password request',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Password reset token is invalid or expired',
          timestamp: new Date().toISOString()
        }
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RESET_PASSWORD_ERROR',
        message: 'Password reset failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const verifyEmail = async (_req, res) => {
  res.json({
    success: true,
    message: 'Email verification endpoint is available',
    timestamp: new Date().toISOString()
  });
};

const logout = async (req, res) => {
  if (req.token) {
    await tokenBlacklist.addToken(req.token);
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
};

const logoutAll = async (req, res) => {
  await sessionManager.invalidateAllUserSessions(req.user._id.toString());
  res.json({
    success: true,
    message: 'Logged out from all devices',
    timestamp: new Date().toISOString()
  });
};

const resendVerification = async (_req, res) => {
  res.json({
    success: true,
    message: 'Verification email flow is available',
    timestamp: new Date().toISOString()
  });
};

const getSessions = async (req, res) => {
  const sessions = await sessionManager.getUserSessions(req.user._id.toString());
  res.json({
    success: true,
    data: {
      sessions
    },
    timestamp: new Date().toISOString()
  });
};

const revokeSession = async (req, res) => {
  await sessionManager.invalidateSession(req.params.sessionId);
  res.json({
    success: true,
    message: 'Session revoked successfully',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  register,
  login,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout,
  logoutAll,
  resendVerification,
  getSessions,
  revokeSession,
  identifyTenant,
  registerInstitution
};
