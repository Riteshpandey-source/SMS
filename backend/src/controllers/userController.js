const User = require('../models/User');
const { 
  formatUserForPrivate, 
  formatUserForPublic, 
  getUserStats,
  generateAvatarUrl 
} = require('../utils/userUtils');
const { config } = require('../config/index');
const { buildUsersQuery, buildSortOptions, buildPaginationOptions } = require('../utils/queryHelpers');
const { validateUserYearAccess } = require('../middleware/yearAccess');
const assignmentService = require('../services/assignmentService');
const emailUtils = require('../utils/email');

const generateSubjectCode = (subjectName = '') => {
  const normalized = subjectName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!normalized.length) {
    return '';
  }

  if (normalized.length === 1) {
    return normalized[0].slice(0, 6);
  }

  return normalized.map(word => word[0]).join('').slice(0, 6);
};

const normalizeAccessibleSubjects = (accessibleSubjects = []) =>
  Array.isArray(accessibleSubjects)
    ? accessibleSubjects
        .filter(subject => subject && subject.subjectName)
        .map(subject => ({
          subjectCode: (subject.subjectCode || generateSubjectCode(subject.subjectName)).toUpperCase().trim(),
          subjectName: subject.subjectName.trim(),
          academicYears: [...new Set((subject.academicYears || []).map(Number).filter(year => year >= 1 && year <= 4))].sort((a, b) => a - b),
          isActive: subject.isActive !== false
        }))
        .filter(subject => subject.subjectCode && subject.subjectName && subject.academicYears.length)
    : [];

const isDepartmentScopedAdmin = (user) => user?.role === 'admin' && user?.department && user.department !== 'Administration';

const departmentEmailCodes = {
  CS: 'cs',
  ECE: 'ece',
  ME: 'me',
  EE: 'ee',
  IT: 'it',
  CSAI: 'csai',
  AIDS: 'aids',
  CIVIL: 'civil',
  Administration: 'admin'
};

const normalizeNameForEmail = (name = '') =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join('');

const normalizeSection = (section = '') => section.toString().trim().toUpperCase();

const generateDefaultStudentPassword = (name = '') => {
  const firstAlpha = (name.match(/[A-Za-z]/) || ['S'])[0].toUpperCase();
  return `${firstAlpha}@jecrc`;
};

const deriveStudentEmailSuffix = ({ academicYear, section, rollNumber }) => {
  const normalizedRoll = (rollNumber || '').toString().match(/(\d{2,})$/)?.[1];
  if (normalizedRoll) {
    return normalizedRoll.slice(-2);
  }

  return `${academicYear}${normalizeSection(section).toLowerCase() || 'a'}`;
};

const generateStudentEmail = async ({ name, department, academicYear, section, rollNumber }) => {
  const baseName = normalizeNameForEmail(name) || 'student';
  const deptCode = departmentEmailCodes[department] || 'dept';
  const suffixCode = deriveStudentEmailSuffix({ academicYear, section, rollNumber });
  const prefix = `${baseName}.${deptCode}${suffixCode}`;

  let suffix = 1;
  let candidate = `${prefix}@gmail.com`;

  while (await User.exists({ email: candidate })) {
    suffix += 1;
    candidate = `${prefix}${suffix}@gmail.com`;
  }

  return candidate;
};

const buildStudentCredentialPayload = async ({
  name,
  department,
  academicYear,
  section,
  rollNumber,
  email,
  password
}) => {
  const normalizedSection = normalizeSection(section);

    return {
      email: email?.trim().toLowerCase() || await generateStudentEmail({
        name,
        department,
        academicYear,
        section: normalizedSection,
        rollNumber
      }),
    password: password || generateDefaultStudentPassword(name),
    section: normalizedSection
  };
};

const buildStudentUserData = async ({
  name,
  department,
  academicYear,
  section,
  rollNumber,
  email,
  password,
  isActive = true
}) => {
  const studentCredentials = await buildStudentCredentialPayload({
    name,
    department,
    academicYear,
    section,
    rollNumber,
    email,
    password
  });

  return {
    name: name.trim(),
    email: studentCredentials.email,
    password: studentCredentials.password,
    role: 'student',
    department,
    academicYear,
    section: studentCredentials.section,
    rollNumber: rollNumber ? rollNumber.trim().toUpperCase() : undefined,
    isActive,
    isEmailVerified: true,
    generatedCredentials: {
      email: studentCredentials.email,
      password: studentCredentials.password
    }
  };
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    // Get user statistics
    const stats = await getUserStats(user._id);
    
    res.json({
      success: true,
      data: {
        user: formatUserForPrivate(user),
        stats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PROFILE_ERROR',
        message: 'Failed to retrieve user profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Store original values to check if assignment-relevant fields changed
    const originalDepartment = user.department;
    const originalAcademicYear = user.academicYear;
    const originalAccessibleYears = user.accessibleYears ? [...user.accessibleYears] : [];

    // Fields that can be updated
    const allowedUpdates = ['name', 'department', 'academicYear'];
    const actualUpdates = {};

    // Filter allowed updates
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        actualUpdates[key] = updates[key];
      }
    });

    // Validate role-specific updates
    if (actualUpdates.academicYear && user.role !== 'student') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UPDATE',
          message: 'Academic year can only be set for students',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (actualUpdates.academicYear && user.role === 'student') {
      if (actualUpdates.academicYear < 1 || actualUpdates.academicYear > 4) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACADEMIC_YEAR',
            message: 'Academic year must be between 1 and 4',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Update user
    Object.assign(user, actualUpdates);
    await user.save();

    // Check if assignment-relevant fields changed and trigger updates
    const assignmentRelevantChange = 
      (actualUpdates.department && actualUpdates.department !== originalDepartment) ||
      (actualUpdates.academicYear && actualUpdates.academicYear !== originalAcademicYear);

    if (assignmentRelevantChange) {
      try {
        if (user.role === 'student') {
          // Student's department or year changed - reassign to new faculty
          await assignmentService.assignStudentToFaculty(user._id);
          console.log(`Assignment update triggered for student profile change: ${user.name}`);
        } else if (user.role === 'faculty') {
          // Faculty's department changed - update assignments
          await assignmentService.updateFacultyAssignments(user._id);
          console.log(`Assignment update triggered for faculty profile change: ${user.name}`);
        }
      } catch (assignmentError) {
        // Log assignment error but don't fail profile update
        console.error('Assignment update failed during profile update:', assignmentError.message);
        // Assignment failures shouldn't prevent successful profile update
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserForPrivate(user)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Profile validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PROFILE_ERROR',
        message: 'Failed to update profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'Current password is incorrect',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send password changed email
    const emailUtils = require('../utils/email');
    try {
      await emailUtils.sendPasswordChangedEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
    }

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Change password error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CHANGE_PASSWORD_ERROR',
        message: 'Failed to change password',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get user by ID (public info only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (isDepartmentScopedAdmin(currentUser) && user.department !== currentUser.department && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only access users from your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check year-based access for faculty viewing students
    if (currentUser && currentUser.role === 'faculty' && user.role === 'student') {
      // Faculty can only view students from their accessible years and department
      if (user.department !== currentUser.department) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'DEPARTMENT_ACCESS_DENIED',
            message: 'You can only view students from your department',
            timestamp: new Date().toISOString()
          }
        });
      }

      const yearValidation = validateUserYearAccess(currentUser, user.academicYear);
      if (!yearValidation.hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: `You don't have access to ${user.academicYear}${user.academicYear === 1 ? 'st' : user.academicYear === 2 ? 'nd' : user.academicYear === 3 ? 'rd' : 'th'} year students`,
            details: {
              studentYear: user.academicYear,
              accessibleYears: yearValidation.accessibleYears
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Get user statistics
    const stats = await getUserStats(user._id);

    // Format user data
    const publicUser = formatUserForPublic(user);
    
    // Add accessible years info for faculty users (visible to admin and other faculty)
    if (user.role === 'faculty' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'faculty')) {
      publicUser.accessibleYears = user.accessibleYears || [];
    }

    res.json({
      success: true,
      data: {
        user: publicUser,
        stats: {
          reputation: stats.reputation,
          joinDate: stats.joinDate,
          questionsAsked: stats.questionsAsked,
          answersGiven: stats.answersGiven,
          notesUploaded: stats.notesUploaded
        },
        accessInfo: currentUser && currentUser.role === 'faculty' && user.role === 'student' ? {
          canAccess: true,
          reason: 'Student is in your accessible year and department'
        } : undefined
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get user by ID error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_ID',
          message: 'Invalid user ID format',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USER_ERROR',
        message: 'Failed to retrieve user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    console.log('searchUsers called with query params:', req.query);
    console.log('Current user:', { id: req.user?._id, role: req.user?.role, department: req.user?.department });
    
    const {
      query,
      department,
      academicYear,
      role,
      page = 1,
      limit = 20,
      sortBy = 'reputation',
      sortOrder = 'desc'
    } = req.query;

    const currentUser = req.user;

    // Check if user is authenticated
    if (!currentUser) {
      console.error('searchUsers: No authenticated user found');
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to search users',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate year access if specific year is requested
    if (academicYear && currentUser.role === 'faculty') {
      const yearValidation = validateUserYearAccess(currentUser, parseInt(academicYear));
      if (!yearValidation.hasAccess && yearValidation.error !== 'NO_ACCESSIBLE_YEARS') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'YEAR_ACCESS_DENIED',
            message: `You don't have access to ${academicYear}${academicYear == 1 ? 'st' : academicYear == 2 ? 'nd' : academicYear == 3 ? 'rd' : 'th'} year students`,
            details: {
              requestedYear: parseInt(academicYear),
              accessibleYears: yearValidation.accessibleYears,
              userRole: currentUser.role
            },
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Build year-aware query using query helpers
    const filters = {
      search: query,
      department: isDepartmentScopedAdmin(currentUser) ? currentUser.department : department,
      academicYear: academicYear ? parseInt(academicYear) : undefined,
      role
    };

    console.log('Building query with filters:', filters);
    const searchCriteria = buildUsersQuery(currentUser, filters);
    console.log('Generated search criteria:', searchCriteria);

    // Build pagination and sort options
    const paginationOptions = buildPaginationOptions(page, limit);
    const sortOptions = buildSortOptions(sortBy, sortOrder, currentUser);

    // Execute search
    const [users, total] = await Promise.all([
      User.find(searchCriteria)
        .select('name email role department academicYear reputation avatar createdAt lastActivity accessibleYears accessibleSubjects')
        .sort(sortOptions)
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit),
      User.countDocuments(searchCriteria)
    ]);

    // Format users for public display
    const formattedUsers = users.map(user => {
      const publicUser = formatUserForPublic(user);
      
      // Add accessible years info for faculty users (visible to admin and other faculty)
      if (user.role === 'faculty' && (currentUser.role === 'admin' || currentUser.role === 'faculty')) {
        publicUser.accessibleYears = user.accessibleYears || [];
      }
      
      return publicUser;
    });

    // Get year-specific statistics for faculty users
    let yearStats = null;
    if (currentUser.role === 'faculty' && currentUser.accessibleYears && currentUser.accessibleYears.length > 1) {
      const yearBreakdown = await Promise.all(
        currentUser.accessibleYears.map(async (year) => {
          const count = await User.countDocuments({
            ...searchCriteria,
            academicYear: year,
            role: 'student'
          });
          return { year, count };
        })
      );
      
      yearStats = yearBreakdown.reduce((acc, { year, count }) => {
        acc[year] = count;
        return acc;
      }, {});
    }

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          total,
          pages: Math.ceil(total / paginationOptions.limit),
          hasNext: paginationOptions.skip + paginationOptions.limit < total,
          hasPrev: paginationOptions.page > 1
        },
        filters: {
          query,
          department: currentUser.role === 'student' ? currentUser.department : department,
          academicYear: currentUser.role === 'student' ? currentUser.academicYear : academicYear,
          role
        },
        userAccess: {
          role: currentUser.role,
          accessibleYears: currentUser.role === 'faculty' ? currentUser.accessibleYears : 
                          currentUser.role === 'student' ? [currentUser.academicYear] : [1, 2, 3, 4],
          department: currentUser.department
        },
        yearStats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search users error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_USERS_ERROR',
        message: 'Failed to search users',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No avatar file uploaded',
          timestamp: new Date().toISOString()
        }
      });
    }

    const imageProcessor = require('../utils/imageProcessor');
    const path = require('path');
    const fs = require('fs').promises;

    try {
      // Validate the uploaded image
      const validation = await imageProcessor.validateImage(file.path);
      if (!validation.isValid) {
        // Clean up uploaded file
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn('Failed to cleanup invalid file:', cleanupError);
        }

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IMAGE',
            message: 'Invalid image file',
            details: validation.errors,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Process the image into multiple sizes
      const outputDir = path.join(process.cwd(), 'uploads', 'avatars');
      const processedImages = await imageProcessor.processAvatar(
        file.path,
        outputDir,
        file.filename
      );

      // Clean up old avatar files
      const oldAvatarData = user.avatar ? JSON.parse(user.avatar) : null;
      if (oldAvatarData) {
        await imageProcessor.cleanupOldAvatars(user._id, oldAvatarData);
      }

      // Update user avatar data
      user.avatar = JSON.stringify(processedImages);
      await user.save();

      res.json({
        success: true,
        message: 'Avatar uploaded and processed successfully',
        data: {
          avatar: processedImages,
          user: formatUserForPrivate(user),
          imageInfo: {
            originalFormat: validation.metadata.format,
            originalSize: validation.metadata.width + 'x' + validation.metadata.height,
            processedSizes: Object.keys(processedImages)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (processingError) {
      // Clean up uploaded file on processing error
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file after processing error:', cleanupError);
      }

      console.error('Image processing error:', processingError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'IMAGE_PROCESSING_ERROR',
          message: 'Failed to process uploaded image',
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_AVATAR_ERROR',
        message: 'Failed to upload avatar',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Delete avatar
const deleteAvatar = async (req, res) => {
  try {
    const user = req.user;
    const imageProcessor = require('../utils/imageProcessor');

    // Clean up avatar files if they exist
    if (user.avatar) {
      try {
        const avatarData = JSON.parse(user.avatar);
        await imageProcessor.cleanupOldAvatars(user._id, avatarData);
      } catch (parseError) {
        console.warn('Failed to parse avatar data for cleanup:', parseError);
        // Continue with deletion even if cleanup fails
      }
    }

    // Remove avatar reference
    user.avatar = null;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
      data: {
        user: formatUserForPrivate(user)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_AVATAR_ERROR',
        message: 'Failed to delete avatar',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get user dashboard data
const getDashboard = async (req, res) => {
  try {
    const user = req.user;

    // Get user statistics
    const stats = await getUserStats(user._id);

    // Get recent activity (placeholder - will be implemented when other models are ready)
    const recentActivity = [];

    // Get notifications count (placeholder)
    const unreadNotifications = 0;

    // Get upcoming events (placeholder)
    const upcomingEvents = [];

    res.json({
      success: true,
      data: {
        user: formatUserForPrivate(user),
        stats,
        recentActivity,
        unreadNotifications,
        upcomingEvents
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DASHBOARD_ERROR',
        message: 'Failed to retrieve dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Deactivate account
const deactivateAccount = async (req, res) => {
  try {
    const user = req.user;
    const { password } = req.body;

    // Verify password for security
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Password is incorrect',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Deactivate account
    user.isActive = false;
    await user.save();

    // Clean up assignments when user is deactivated
    try {
      await assignmentService.removeAssignments(user._id, user.role);
      console.log(`Assignment cleanup completed for deactivated user: ${user.name} (${user.role})`);
    } catch (assignmentError) {
      // Log assignment error but don't fail deactivation
      console.error('Assignment cleanup failed during account deactivation:', assignmentError.message);
      // Assignment cleanup failures shouldn't prevent successful deactivation
    }

    // Invalidate all sessions
    const sessionManager = require('../utils/sessionManager');
    await sessionManager.invalidateAllUserSessions(user._id);

    res.json({
      success: true,
      message: 'Account deactivated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DEACTIVATE_ACCOUNT_ERROR',
        message: 'Failed to deactivate account',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get user preferences
const getPreferences = async (req, res) => {
  try {
    const user = req.user;

    // Default preferences (can be extended with a preferences model later)
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      theme: 'light',
      language: 'en',
      timezone: 'UTC'
    };

    res.json({
      success: true,
      data: {
        preferences
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PREFERENCES_ERROR',
        message: 'Failed to retrieve preferences',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update user preferences
const updatePreferences = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // For now, just return success (can be extended with a preferences model later)
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: updates
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_PREFERENCES_ERROR',
        message: 'Failed to update preferences',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get students by year (Faculty only)
const getStudentsByYear = async (req, res) => {
  try {
    const { year } = req.params;
    const currentUser = req.user;
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Only faculty can use this endpoint
    if (currentUser.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty members can access this endpoint',
          timestamp: new Date().toISOString()
        }
      });
    }

    const requestedYear = parseInt(year);
    
    // Validate year parameter
    if (isNaN(requestedYear) || requestedYear < 1 || requestedYear > 4) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_YEAR_PARAMETER',
          message: 'Academic year must be between 1 and 4',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate year access
    const yearValidation = validateUserYearAccess(currentUser, requestedYear);
    if (!yearValidation.hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'YEAR_ACCESS_DENIED',
          message: `You don't have access to ${requestedYear}${requestedYear === 1 ? 'st' : requestedYear === 2 ? 'nd' : requestedYear === 3 ? 'rd' : 'th'} year students`,
          details: {
            requestedYear,
            accessibleYears: yearValidation.accessibleYears
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query for students in the requested year and faculty's department
    const query = {
      role: 'student',
      academicYear: requestedYear,
      department: currentUser.department,
      isActive: true
    };

    // Add search if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build pagination and sort options
    const paginationOptions = buildPaginationOptions(page, limit);
    const sortOptions = buildSortOptions(sortBy, sortOrder);

    // Execute query
    const [students, total] = await Promise.all([
      User.find(query)
        .select('name email department academicYear reputation avatar createdAt lastActivity')
        .sort(sortOptions)
        .skip(paginationOptions.skip)
        .limit(paginationOptions.limit),
      User.countDocuments(query)
    ]);

    // Format students for response
    const formattedStudents = students.map(student => formatUserForPublic(student));

    res.json({
      success: true,
      data: {
        students: formattedStudents,
        pagination: {
          page: paginationOptions.page,
          limit: paginationOptions.limit,
          total,
          pages: Math.ceil(total / paginationOptions.limit),
          hasNext: paginationOptions.skip + paginationOptions.limit < total,
          hasPrev: paginationOptions.page > 1
        },
        yearInfo: {
          year: requestedYear,
          yearDisplay: `${requestedYear}${requestedYear === 1 ? 'st' : requestedYear === 2 ? 'nd' : requestedYear === 3 ? 'rd' : 'th'} Year`,
          department: currentUser.department,
          totalStudents: total
        },
        facultyAccess: {
          accessibleYears: currentUser.accessibleYears,
          currentYear: requestedYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get students by year error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_STUDENTS_BY_YEAR_ERROR',
        message: 'Failed to retrieve students by year',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update faculty accessible years (Admin only)
const updateFacultyAccessibleYears = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { accessibleYears, accessibleSubjects } = req.body;
    const currentUser = req.user;

    // Only admin can update faculty accessible years
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can update faculty accessible years',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate accessible years
    if (!Array.isArray(accessibleYears) || !accessibleYears.every(year => year >= 1 && year <= 4)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_YEARS',
          message: 'Accessible years must be an array of numbers between 1 and 4',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find and update faculty
    const faculty = await User.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FACULTY_NOT_FOUND',
          message: 'Faculty member not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (faculty.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NOT_FACULTY',
          message: 'User is not a faculty member',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (isDepartmentScopedAdmin(currentUser) && faculty.department !== currentUser.department) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only manage faculty from your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Store original accessible years to check for changes
    const originalAccessibleYears = faculty.accessibleYears ? [...faculty.accessibleYears] : [];
    const normalizedSubjects = Array.isArray(accessibleSubjects)
      ? accessibleSubjects
          .filter(subject => subject && subject.subjectName)
          .map(subject => ({
            subjectCode: (subject.subjectCode || generateSubjectCode(subject.subjectName)).toUpperCase().trim(),
            subjectName: subject.subjectName.trim(),
            academicYears: [...new Set((subject.academicYears || []).map(Number))].sort((a, b) => a - b),
            isActive: subject.isActive !== false
          }))
      : faculty.accessibleSubjects || [];
    
    faculty.accessibleYears = accessibleYears;
    faculty.accessibleSubjects = normalizedSubjects;
    await faculty.save();

    // Trigger assignment updates if accessible years changed
    const yearsChanged = JSON.stringify(originalAccessibleYears.sort()) !== JSON.stringify(accessibleYears.sort());
    
    if (yearsChanged) {
      try {
        await assignmentService.updateFacultyAssignments(faculty._id);
        console.log(`Assignment update triggered for faculty accessible years change: ${faculty.name}`);
      } catch (assignmentError) {
        // Log assignment error but don't fail the accessible years update
        console.error('Assignment update failed during accessible years update:', assignmentError.message);
        // Assignment failures shouldn't prevent successful accessible years update
      }
    }

    res.json({
      success: true,
      message: 'Faculty accessible years updated successfully',
      data: {
        faculty: {
          id: faculty._id,
          name: faculty.name,
          department: faculty.department,
          accessibleYears: faculty.accessibleYears,
          accessibleSubjects: faculty.accessibleSubjects || []
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update faculty accessible years error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ACCESSIBLE_YEARS_ERROR',
        message: 'Failed to update faculty accessible years',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get faculty's assigned students (assignment-aware endpoint)
const getAssignedStudents = async (req, res) => {
  try {
    const facultyId = req.user._id;
    
    // If admin is requesting, return all active students
    if (req.user.role === 'admin') {
      const filter = { role: 'student', isActive: true };
      if (req.user.department && req.user.department !== 'Administration') {
        filter.department = req.user.department;
      }
      const students = await User.find(filter).select('name email department academicYear avatar lastLogin');
      return res.json({
        success: true,
        users: students,
        totalStudents: students.length
      });
    }
    
    // Verify user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty can access assigned students',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get assigned students through assignment service
    let assignments = await assignmentService.getFacultyAssignments(facultyId);

    if (!assignments.length && req.user.department && req.user.accessibleYears?.length) {
      const fallbackStudents = await User.find({
        role: 'student',
        department: req.user.department,
        academicYear: { $in: req.user.accessibleYears },
        isActive: true
      }).select('name email department academicYear avatar lastLogin');

      assignments = fallbackStudents.map((student) => ({
        _id: `fallback-${student._id}`,
        student,
        assignedAt: student.createdAt || new Date(),
        assignmentSource: 'department-fallback'
      }));
    }
    
    // Format response with additional student details
    const assignedStudents = assignments.map(assignment => ({
      assignmentId: assignment._id,
      student: {
        id: assignment.student._id,
        name: assignment.student.name,
        email: assignment.student.email,
        department: assignment.student.department,
        academicYear: assignment.student.academicYear,
        avatar: assignment.student.avatar,
        lastLogin: assignment.student.lastLogin
      },
      assignedAt: assignment.assignedAt,
      assignmentSource: assignment.assignmentSource
    }));

    // Group by academic year for better organization
    const studentsByYear = {};
    assignedStudents.forEach(item => {
      const year = item.student.academicYear;
      if (!studentsByYear[year]) {
        studentsByYear[year] = [];
      }
      studentsByYear[year].push(item);
    });

    res.json({
      success: true,
      data: {
        totalStudents: assignedStudents.length,
        assignedStudents,
        studentsByYear,
        facultyInfo: {
          department: req.user.department,
          accessibleYears: req.user.accessibleYears
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get assigned students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ASSIGNED_STUDENTS_ERROR',
        message: 'Failed to retrieve assigned students',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get student's assigned faculty (assignment-aware endpoint)
const getAssignedFaculty = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // If admin is requesting, return all active faculty
    if (req.user.role === 'admin') {
      const filter = { role: 'faculty', isActive: true };
      if (req.user.department && req.user.department !== 'Administration') {
        filter.department = req.user.department;
      }
      const faculty = await User.find(filter).select('name email department accessibleYears avatar lastLogin');
      return res.json({
        success: true,
        users: faculty,
        totalFaculty: faculty.length
      });
    }
    
    // Verify user is student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only students can access assigned faculty',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get assigned faculty through assignment service
    const assignments = await assignmentService.getStudentAssignments(studentId);
    
    // Format response with additional faculty details
    const assignedFaculty = assignments.map(assignment => ({
      assignmentId: assignment._id,
      faculty: {
        id: assignment.faculty._id,
        name: assignment.faculty.name,
        email: assignment.faculty.email,
        department: assignment.faculty.department,
        accessibleYears: assignment.faculty.accessibleYears,
        avatar: assignment.faculty.avatar,
        lastLogin: assignment.faculty.lastLogin
      },
      assignedAt: assignment.assignedAt,
      assignmentSource: assignment.assignmentSource
    }));

    res.json({
      success: true,
      data: {
        totalFaculty: assignedFaculty.length,
        assignedFaculty,
        studentInfo: {
          department: req.user.department,
          academicYear: req.user.academicYear
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get assigned faculty error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ASSIGNED_FACULTY_ERROR',
        message: 'Failed to retrieve assigned faculty',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Create user (Admin only)
const createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can create users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      name,
      email,
      password,
      role,
      department,
      academicYear,
      section,
      rollNumber,
      accessibleYears,
      accessibleSubjects,
      isActive
    } = req.body;

    let resolvedEmail = email?.toLowerCase().trim();
    let resolvedPassword = password;
    let resolvedSection = section ? normalizeSection(section) : undefined;

    let generatedCredentials;

    if (role === 'student') {
      const studentUserData = await buildStudentUserData({
        name,
        department,
        academicYear,
        section,
        rollNumber,
        email,
        password,
        isActive: isActive !== false
      });
      resolvedEmail = studentUserData.email;
      resolvedPassword = studentUserData.password;
      resolvedSection = studentUserData.section;
      generatedCredentials = studentUserData.generatedCredentials;
    }

    const existingUser = await User.findOne({ email: resolvedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    const userData = {
      tenantId: req.user.tenantId,
      name: name.trim(),
      email: resolvedEmail,
      password: resolvedPassword,
      role,
      isActive: isActive !== false,
      isEmailVerified: true
    };

    if (isDepartmentScopedAdmin(req.user) && department !== req.user.department && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only create users in your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (role === 'student') {
      userData.department = department;
      userData.academicYear = academicYear;
      userData.section = resolvedSection;
      userData.rollNumber = rollNumber ? rollNumber.trim().toUpperCase() : undefined;
    } else if (role === 'faculty') {
      userData.department = department;
      userData.accessibleYears = accessibleYears;
      userData.accessibleSubjects = normalizeAccessibleSubjects(accessibleSubjects);
    } else if (role === 'admin') {
      userData.department = department;
    }

    const user = new User(userData);
    await user.save();

    try {
      if (user.role === 'student') {
        await assignmentService.assignStudentToFaculty(user._id);
      } else if (user.role === 'faculty') {
        await assignmentService.updateFacultyAssignments(user._id);
      }
    } catch (assignmentError) {
      console.error('Assignment update failed during admin create user:', assignmentError.message);
    }

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: formatUserForPrivate(user),
        generatedCredentials: role === 'student' ? generatedCredentials : undefined
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create user error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: Object.values(error.errors).map(err => err.message).join(', '),
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_USER_ERROR',
        message: 'Failed to create user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

const bulkCreateStudents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can create users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { department, academicYear, section, students, isActive } = req.body;

    if (isDepartmentScopedAdmin(req.user) && department !== req.user.department) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only create users in your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    const createdStudents = [];
    const createdStudentIds = [];
    const skippedStudents = [];

    for (const student of students) {
      try {
        const studentUserData = await buildStudentUserData({
          name: student.name,
          department,
          academicYear,
          section,
          rollNumber: student.rollNumber,
          isActive: isActive !== false
        });

        const existingUser = await User.findOne({ email: studentUserData.email });
        if (existingUser) {
          skippedStudents.push({
            name: student.name,
            rollNumber: student.rollNumber,
            reason: 'Email already exists',
            email: studentUserData.email
          });
          continue;
        }

        studentUserData.tenantId = req.user.tenantId;
        const user = new User(studentUserData);
        await user.save();

        createdStudentIds.push(user._id);

        createdStudents.push({
          user: formatUserForPrivate(user),
          generatedCredentials: studentUserData.generatedCredentials
        });
      } catch (studentError) {
        skippedStudents.push({
          name: student.name,
          rollNumber: student.rollNumber,
          reason: studentError.message || 'Unable to create student'
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdStudents.length} students created successfully`,
      data: {
        createdStudents,
        skippedStudents,
        summary: {
          created: createdStudents.length,
          skipped: skippedStudents.length,
          total: students.length
        }
      },
      timestamp: new Date().toISOString()
    });

    if (createdStudentIds.length) {
      setImmediate(async () => {
        const assignmentResults = await Promise.allSettled(
          createdStudentIds.map((studentId) => assignmentService.assignStudentToFaculty(studentId))
        );

        assignmentResults.forEach((result) => {
          if (result.status === 'rejected') {
            console.error('Assignment update failed during bulk create:', result.reason?.message || result.reason);
          }
        });
      });
    }
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_CREATE_STUDENTS_ERROR',
        message: 'Failed to bulk create students',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update user (Admin only)
const updateUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can update users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;
    const {
      name,
      email,
      password,
      role,
      department,
      academicYear,
      section,
      rollNumber,
      accessibleYears,
      accessibleSubjects,
      isActive
    } = req.body;

    const user = await User.findById(id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const originalRole = user.role;

    if (isDepartmentScopedAdmin(req.user) && user.department !== req.user.department && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only update users from your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (user._id.toString() === req.user._id.toString() && role && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_ROLE_CHANGE_NOT_ALLOWED',
          message: 'Admin cannot remove their own admin role',
          timestamp: new Date().toISOString()
        }
      });
    }

    let resolvedEmail = email?.toLowerCase().trim();
    let resolvedPassword = password;
    let resolvedSection = section ? normalizeSection(section) : undefined;

    if (role === 'student') {
      const shouldRegenerateEmail =
        !resolvedEmail ||
        user.role !== 'student' ||
        user.name !== name?.trim() ||
        user.department !== department ||
        user.academicYear !== academicYear ||
        normalizeSection(user.section) !== normalizeSection(section);

      if (shouldRegenerateEmail) {
        const studentCredentials = await buildStudentCredentialPayload({
          name,
          department,
          academicYear,
          section,
          rollNumber,
          email: resolvedEmail,
          password: resolvedPassword
        });
        resolvedEmail = studentCredentials.email;
        resolvedPassword = resolvedPassword || studentCredentials.password;
        resolvedSection = studentCredentials.section;
      }
    }

    if (resolvedEmail && resolvedEmail !== user.email) {
      const existingUser = await User.findOne({
        email: resolvedEmail,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'A user with this email already exists',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    if (name !== undefined) user.name = name.trim();
    if (resolvedEmail !== undefined) user.email = resolvedEmail;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (resolvedPassword) user.password = resolvedPassword;

    if (isDepartmentScopedAdmin(req.user) && department !== req.user.department && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only move users within your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (role) {
      user.role = role;
    }

    if (user.role === 'student') {
      user.department = department;
      user.academicYear = academicYear;
      user.section = resolvedSection;
      user.rollNumber = rollNumber ? rollNumber.trim().toUpperCase() : undefined;
      user.accessibleYears = undefined;
      user.accessibleSubjects = [];
    } else if (user.role === 'faculty') {
      user.department = department;
      user.academicYear = undefined;
      user.section = undefined;
      user.rollNumber = undefined;
      user.accessibleYears = accessibleYears;
      user.accessibleSubjects = normalizeAccessibleSubjects(accessibleSubjects);
    } else if (user.role === 'admin') {
      user.department = department;
      user.academicYear = undefined;
      user.section = undefined;
      user.rollNumber = undefined;
      user.accessibleYears = undefined;
      user.accessibleSubjects = [];
    }

    await user.save();

    try {
      if (originalRole !== user.role) {
        await assignmentService.removeAssignments(user._id, originalRole);
      }

      if (user.role === 'student') {
        await assignmentService.assignStudentToFaculty(user._id);
      } else if (user.role === 'faculty') {
        await assignmentService.updateFacultyAssignments(user._id);
      } else {
        await assignmentService.removeAssignments(user._id, user.role);
      }
    } catch (assignmentError) {
      console.error('Assignment update failed during admin update user:', assignmentError.message);
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: formatUserForPrivate(user)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update user error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: Object.values(error.errors).map(err => err.message).join(', '),
          timestamp: new Date().toISOString()
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_USER_ERROR',
        message: 'Failed to update user',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only administrators can delete users',
          timestamp: new Date().toISOString()
        }
      });
    }

    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_DELETE_NOT_ALLOWED',
          message: 'Admin cannot delete their own account',
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (isDepartmentScopedAdmin(req.user) && user.department !== req.user.department && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DEPARTMENT_ACCESS_DENIED',
          message: 'You can only delete users from your own department',
          timestamp: new Date().toISOString()
        }
      });
    }

    try {
      await assignmentService.removeAssignments(user._id, user.role);
    } catch (assignmentError) {
      console.error('Assignment cleanup failed during admin delete user:', assignmentError.message);
    }

    try {
      const sessionManager = require('../utils/sessionManager');
      await sessionManager.invalidateAllUserSessions(user._id);
    } catch (sessionError) {
      console.error('Session cleanup failed during admin delete user:', sessionError.message);
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_USER_ERROR',
        message: 'Failed to delete user',
        timestamp: new Date().toISOString()
      }
    });
  }
};
// Update Personal Tracker (for students)
const updatePersonalTracker = async (req, res) => {
  try {
    const { personalDeadlines, personalProgress } = req.body;
    
    // Ensure the user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only students can update their personal tracker',
          timestamp: new Date().toISOString()
        }
      });
    }

    const updates = {};
    if (personalDeadlines !== undefined) {
      updates.personalDeadlines = personalDeadlines;
    }
    if (personalProgress !== undefined) {
      updates.personalProgress = personalProgress;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('personalDeadlines personalProgress');

    res.json({
      success: true,
      message: 'Personal tracker updated successfully',
      data: {
        personalDeadlines: updatedUser.personalDeadlines,
        personalProgress: updatedUser.personalProgress
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update personal tracker error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_TRACKER_ERROR',
        message: 'Failed to update personal tracker',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  updatePersonalTracker,
  getProfile,
  updateProfile,
  changePassword,
  getUserById,
  searchUsers,
  uploadAvatar,
  deleteAvatar,
  getDashboard,
  deactivateAccount,
  getPreferences,
  updatePreferences,
  getStudentsByYear,
  updateFacultyAccessibleYears,
  getAssignedStudents,
  getAssignedFaculty,
  createUser,
  bulkCreateStudents,
  updateUser,
  deleteUser
};
