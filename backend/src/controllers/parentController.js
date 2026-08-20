const User = require('../models/User');
const { generateTokenPair } = require('../utils/jwt');
const { formatUserForPrivate } = require('../utils/userUtils');
const sessionManager = require('../utils/sessionManager');
const emailUtils = require('../utils/email');

// Parent registration
const registerParent = async (req, res) => {
  try {
    const { name, email, password, childEmail } = req.body;

    // Check if parent already exists
    const existingParent = await User.findOne({ email: email.toLowerCase() });
    if (existingParent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PARENT_ALREADY_EXISTS',
          message: 'Parent with this email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find the child (student) by email
    const child = await User.findOne({ 
      email: childEmail.toLowerCase(),
      role: 'student',
      isActive: true 
    });

    if (!child) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student with this email not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if parent is already registered for this child
    const existingParentForChild = await User.findOne({
      role: 'parent',
      childId: child._id,
      isActive: true
    });

    if (existingParentForChild) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PARENT_ALREADY_REGISTERED',
          message: 'A parent is already registered for this student',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create parent user
    const parentData = {
      name,
      email: email.toLowerCase(),
      password,
      role: 'parent',
      childId: child._id,
      tenantId: child.tenantId
    };

    const parent = new User(parentData);
    await parent.save();

    // Add parent email to child's parentEmails array
    child.parentEmails.push({
      email: parent.email,
      verified: false,
      registeredAt: new Date(),
      parentId: parent._id
    });
    await child.save();

    // Generate email verification token for parent
    const verificationToken = parent.generateEmailVerificationToken();
    await parent.save();

    // Send verification emails
    try {
      await emailUtils.sendParentVerificationEmail(parent.email, verificationToken, child.name);
      await emailUtils.sendStudentParentNotificationEmail(child.email, parent.name, parent.email);
    } catch (emailError) {
      console.error('Failed to send verification emails:', emailError);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Parent registered successfully. Please check your email for verification.',
      data: {
        parent: {
          id: parent._id,
          name: parent.name,
          email: parent.email,
          role: parent.role,
          childName: child.name,
          childEmail: child.email,
          childDepartment: child.department,
          childAcademicYear: child.academicYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Parent registration error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parent registration validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PARENT_REGISTRATION_ERROR',
        message: 'Parent registration failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Parent login
const loginParent = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find parent by credentials
    const parent = await User.findByCredentials(email, password);

    // Verify this is a parent user
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_PARENT_LOGIN',
          message: 'This account is not registered as a parent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get child information
    const child = await User.findById(parent.childId)
      .select('name email department academicYear isActive');

    if (!child || !child.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CHILD_NOT_FOUND',
          message: 'Associated student account not found or inactive',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create session with child context
    const deviceInfo = {
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      platform: req.get('User-Agent')?.includes('Mobile') ? 'Mobile' : 'Desktop',
      browser: req.get('User-Agent')?.split(' ')[0] || 'Unknown'
    };

    const session = await sessionManager.createSession(parent, deviceInfo);

    // Format parent data with child information
    const parentData = formatUserForPrivate(parent);
    parentData.child = {
      id: child._id,
      name: child.name,
      email: child.email,
      department: child.department,
      academicYear: child.academicYear
    };

    res.json({
      success: true,
      message: 'Parent login successful',
      data: {
        user: parentData,
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
    console.error('Parent login error:', error);

    if (error.message.includes('Invalid login credentials')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.message.includes('Account is temporarily locked')) {
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked due to too many failed login attempts',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'PARENT_LOGIN_ERROR',
        message: 'Parent login failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get parent profile with child information
const getParentProfile = async (req, res) => {
  try {
    const parent = req.user;

    // Verify this is a parent user
    if (parent.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'This endpoint is only for parent users',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get child information
    const child = await User.findById(parent.childId)
      .select('name email department academicYear isActive lastLogin createdAt');

    if (!child) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CHILD_NOT_FOUND',
          message: 'Associated student account not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Format response
    const parentData = formatUserForPrivate(parent);
    parentData.child = {
      id: child._id,
      name: child.name,
      email: child.email,
      department: child.department,
      academicYear: child.academicYear,
      isActive: child.isActive,
      lastLogin: child.lastLogin,
      joinedAt: child.createdAt
    };

    res.json({
      success: true,
      data: {
        parent: parentData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get parent profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PARENT_PROFILE_ERROR',
        message: 'Failed to retrieve parent profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Verify child relationship
const verifyChildRelationship = async (req, res) => {
  try {
    const { childEmail } = req.body;
    
    // Find the child (student) by email
    const child = await User.findOne({ 
      email: childEmail.toLowerCase(),
      role: 'student',
      isActive: true 
    }).select('name email department academicYear');

    if (!child) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student with this email not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if parent is already registered for this child
    const existingParent = await User.findOne({
      role: 'parent',
      childId: child._id,
      isActive: true
    });

    if (existingParent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PARENT_ALREADY_EXISTS',
          message: 'A parent is already registered for this student',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      message: 'Student found and available for parent registration',
      data: {
        child: {
          name: child.name,
          email: child.email,
          department: child.department,
          academicYear: child.academicYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verify child relationship error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFY_CHILD_ERROR',
        message: 'Failed to verify child relationship',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  registerParent,
  loginParent,
  getParentProfile,
  verifyChildRelationship
};