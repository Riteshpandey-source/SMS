const crypto = require('crypto');
const User = require('../models/User');

// Generate a secure random password
const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
  let password = '';
  
  // Ensure at least one character from each required type
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // number
  password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // special character
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Generate a unique username from email
const generateUsername = (email) => {
  const baseUsername = email.split('@')[0].toLowerCase();
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${baseUsername}${randomSuffix}`;
};

// Check if email domain is allowed (for institutional emails)
const isAllowedEmailDomain = (email) => {
  const allowedDomains = [
    'student.edu',
    'faculty.edu',
    'admin.edu',
    'campusbuddy.com',
    'gmail.com', // Allow for development
    'yahoo.com', // Allow for development
    'outlook.com' // Allow for development
  ];
  
  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
};

// Get user role from email domain
const getRoleFromEmail = (email) => {
  const domain = email.split('@')[1];
  
  if (domain === 'admin.edu' || domain === 'campusbuddy.com') {
    return 'admin';
  } else if (domain === 'faculty.edu') {
    return 'faculty';
  } else {
    return 'student';
  }
};

// Format user data for public display (remove sensitive information)
const formatUserForPublic = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  
  return {
    _id: userObj._id,
    id: userObj._id,
    name: userObj.name,
    email: userObj.email,
    role: userObj.role,
    department: userObj.department,
    academicYear: userObj.academicYear,
    section: userObj.section,
    rollNumber: userObj.rollNumber,
    accessibleYears: userObj.accessibleYears, // For faculty year access control
    accessibleSubjects: userObj.accessibleSubjects,
    reputation: userObj.reputation,
    avatar: userObj.avatar,
    academicInfo: userObj.academicInfo,
    isActive: userObj.isActive,
    lastActivity: userObj.lastActivity,
    createdAt: userObj.createdAt
  };
};

// Format user data for private display (for the user themselves)
const formatUserForPrivate = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  
  return {
    ...formatUserForPublic(user),
    isEmailVerified: userObj.isEmailVerified,
    personalDeadlines: userObj.personalDeadlines,
    personalProgress: userObj.personalProgress,
    lastLogin: userObj.lastLogin,
    updatedAt: userObj.updatedAt
  };
};

// Check if user can access resource based on role and ownership
const canAccessResource = (user, resource, action = 'read') => {
  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }
  
  // User can access their own resources
  if (resource.userId && resource.userId.toString() === user._id.toString()) {
    return true;
  }
  
  if (resource.author && resource.author.toString() === user._id.toString()) {
    return true;
  }
  
  if (resource.uploadedBy && resource.uploadedBy.toString() === user._id.toString()) {
    return true;
  }
  
  // Faculty can access resources in their department
  if (user.role === 'faculty' && resource.department === user.department) {
    return ['read', 'update'].includes(action);
  }
  
  // Students can read public resources
  if (action === 'read' && resource.isPublic !== false) {
    return true;
  }
  
  return false;
};

// Check if user can moderate content
const canModerateContent = (user, content) => {
  // Admin can moderate everything
  if (user.role === 'admin') {
    return true;
  }
  
  // Faculty can moderate content in their department
  if (user.role === 'faculty' && content.department === user.department) {
    return true;
  }
  
  // Users can moderate their own content
  if (content.author && content.author.toString() === user._id.toString()) {
    return true;
  }
  
  return false;
};

// Calculate user reputation based on activities
const calculateReputation = (activities) => {
  let reputation = 0;
  
  // Points for different activities
  const points = {
    questionUpvote: 5,
    answerUpvote: 10,
    acceptedAnswer: 15,
    noteDownload: 1,
    eventAttendance: 2,
    profileComplete: 10
  };
  
  activities.forEach(activity => {
    if (points[activity.type]) {
      reputation += points[activity.type] * (activity.count || 1);
    }
  });
  
  return Math.max(0, reputation); // Ensure reputation is never negative
};

// Get user statistics
const getUserStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Import models
    const Note = require('../models/Note');
    const Event = require('../models/Event');
    const Question = require('../models/Question');
    const Answer = require('../models/Answer');
    

    
    // Calculate real statistics from database
    const [
      notesUploaded,
      eventsOrganized,
      eventsAttended,
      questionsAsked,
      answersGiven
    ] = await Promise.all([
      Note.countDocuments({ uploadedBy: userId }),
      Event.countDocuments({ organizer: userId }),
      Event.countDocuments({ 'attendees.user': userId }),
      Question.countDocuments({ askedBy: userId }),
      Answer.countDocuments({ answeredBy: userId })
    ]);



    // Role-specific stats
    let roleSpecificStats = {};
    
    if (user.role === 'faculty') {
      // Faculty-specific stats
      const studentsTaught = await User.countDocuments({ 
        role: 'student', 
        department: user.department 
      });
      
      roleSpecificStats = {
        notesUploaded,
        eventsOrganized,
        studentsTaught,
        teachingRating: Math.min(5.0, Math.max(0, (notesUploaded * 0.1 + eventsOrganized * 0.2 + 3.5))), // Calculated rating
        coursesTeaching: Math.ceil(studentsTaught / 30), // Estimate courses based on students
        researchPapers: Math.floor(notesUploaded / 5) // Estimate research papers
      };
    } else if (user.role === 'admin') {
      // Admin-specific stats
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const totalContent = await Note.countDocuments() + await Event.countDocuments();
      
      roleSpecificStats = {
        usersManaged: totalUsers,
        activeUsers,
        totalUsers,
        totalContent,
        contentModerated: Math.floor(totalContent * 0.8), // Estimate moderated content
        systemUptime: 99.9,
        featuresActive: 15,
        systemHealth: 'Good',
        adminRating: 4.5, // Default admin rating
        featuresConfigured: 12 // Default features configured
      };
    } else {
      // Student-specific stats
      roleSpecificStats = {
        questionsAsked,
        answersGiven,
        notesUploaded,
        eventsAttended,
        cgpa: Math.min(4.0, Math.max(0, (answersGiven * 0.1 + notesUploaded * 0.2 + 2.5))), // Calculated CGPA
        creditsCompleted: user.academicYear ? user.academicYear * 30 : 0, // Estimate credits
        coursesEnrolled: user.academicYear ? Math.min(8, user.academicYear * 2) : 0 // Estimate courses
      };
    }
    
    const stats = {
      reputation: user.reputation || 0,
      joinDate: user.createdAt,
      lastActivity: user.lastActivity,
      isActive: user.isActive,
      // Common stats
      questionsAsked,
      answersGiven,
      notesUploaded,
      eventsAttended,
      eventsOrganized,
      // Role-specific stats
      ...roleSpecificStats
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    // Return default stats if there's an error
    return {
      reputation: 0,
      joinDate: new Date(),
      lastActivity: new Date(),
      isActive: true,
      questionsAsked: 0,
      answersGiven: 0,
      notesUploaded: 0,
      eventsAttended: 0,
      eventsOrganized: 0
    };
  }
};

// Validate user permissions for specific actions
const validateUserPermissions = (user, requiredRole, requiredDepartment = null) => {
  if (!user || !user.isActive) {
    throw new Error('User account is not active');
  }
  
  // Check role hierarchy: admin > faculty > student
  const roleHierarchy = { admin: 3, faculty: 2, student: 1 };
  const userRoleLevel = roleHierarchy[user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
  
  if (userRoleLevel < requiredRoleLevel) {
    throw new Error('Insufficient permissions');
  }
  
  // Check department if required
  if (requiredDepartment && user.department !== requiredDepartment && user.role !== 'admin') {
    throw new Error('Department access denied');
  }
  
  return true;
};

// Generate user avatar URL (placeholder for future avatar service)
const generateAvatarUrl = (user) => {
  if (user.avatar) {
    return user.avatar;
  }
  
  // Generate a default avatar URL based on user initials
  let initials = 'U';
  try {
    const userName = user.name || 'User';
    initials = userName
      .split(' ')
      .map(name => {
        try {
          return name && typeof name === 'string' && name.charAt(0) ? name.charAt(0).toUpperCase() : '';
        } catch (e) {
          return '';
        }
      })
      .join('')
      .substring(0, 2) || 'U';
  } catch (error) {
    console.error('Error generating initials:', error);
    initials = 'U';
  }
  
  // Using a placeholder avatar service
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=4f46e5&color=fff&size=150`;
};

module.exports = {
  generateRandomPassword,
  generateUsername,
  isAllowedEmailDomain,
  getRoleFromEmail,
  formatUserForPublic,
  formatUserForPrivate,
  canAccessResource,
  canModerateContent,
  calculateReputation,
  getUserStats,
  validateUserPermissions,
  generateAvatarUrl
};
