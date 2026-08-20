const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;

// Get avatar in specific size
const getAvatar = async (req, res) => {
  try {
    // Set CORS headers explicitly for avatar requests
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    const { userId, size = 'medium' } = req.params;
    
    // Find user
    const user = await User.findById(userId);
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

    // Check if user has avatar
    if (!user.avatar) {
      // Return default avatar URL
      const defaultAvatarUrl = generateDefaultAvatarUrl(user.name, size);
      return res.redirect(defaultAvatarUrl);
    }

    try {
      const avatarData = JSON.parse(user.avatar);
      
      // Check if requested size exists
      if (!avatarData[size]) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'AVATAR_SIZE_NOT_FOUND',
            message: `Avatar size '${size}' not found`,
            timestamp: new Date().toISOString()
          }
        });
      }

      // Check if file exists
      const filePath = path.join(process.cwd(), 'uploads', 'avatars', avatarData[size].filename);
      try {
        await fs.access(filePath);
        // Redirect to the static file
        return res.redirect(`/uploads/avatars/${avatarData[size].filename}`);
      } catch (fileError) {
        console.warn(`Avatar file not found: ${filePath}`);
        // Return default avatar if file doesn't exist
        const defaultAvatarUrl = generateDefaultAvatarUrl(user.name, size);
        return res.redirect(defaultAvatarUrl);
      }

    } catch (parseError) {
      console.warn('Failed to parse avatar data:', parseError);
      // Return default avatar if data is corrupted
      const defaultAvatarUrl = generateDefaultAvatarUrl(user.name, size);
      return res.redirect(defaultAvatarUrl);
    }

  } catch (error) {
    console.error('Get avatar error:', error);
    
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
        code: 'GET_AVATAR_ERROR',
        message: 'Failed to retrieve avatar',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get avatar info (metadata)
const getAvatarInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
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

    if (!user.avatar) {
      return res.json({
        success: true,
        data: {
          hasAvatar: false,
          defaultAvatar: {
            thumbnail: generateDefaultAvatarUrl(user.name, 'thumbnail'),
            small: generateDefaultAvatarUrl(user.name, 'small'),
            medium: generateDefaultAvatarUrl(user.name, 'medium'),
            large: generateDefaultAvatarUrl(user.name, 'large')
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    try {
      const avatarData = JSON.parse(user.avatar);
      
      res.json({
        success: true,
        data: {
          hasAvatar: true,
          sizes: avatarData,
          availableSizes: Object.keys(avatarData)
        },
        timestamp: new Date().toISOString()
      });

    } catch (parseError) {
      return res.json({
        success: true,
        data: {
          hasAvatar: false,
          error: 'Avatar data corrupted',
          defaultAvatar: {
            thumbnail: generateDefaultAvatarUrl(user.name, 'thumbnail'),
            small: generateDefaultAvatarUrl(user.name, 'small'),
            medium: generateDefaultAvatarUrl(user.name, 'medium'),
            large: generateDefaultAvatarUrl(user.name, 'large')
          }
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Get avatar info error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_AVATAR_INFO_ERROR',
        message: 'Failed to retrieve avatar information',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Generate default avatar URL
const generateDefaultAvatarUrl = (name, size = 'medium') => {
  const sizeMap = {
    thumbnail: 50,
    small: 100,
    medium: 200,
    large: 400
  };

  const dimension = sizeMap[size] || 200;
  
  // Handle undefined or null name
  if (!name || typeof name !== 'string') {
    name = 'User';
  }
  
  let initials = 'U';
  try {
    initials = name
      .split(' ')
      .map(word => {
        try {
          return word && typeof word === 'string' && word.charAt(0) ? word.charAt(0).toUpperCase() : '';
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
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${dimension}&background=random&color=fff&format=png`;
};

// Batch avatar processing (admin only)
const batchProcessAvatars = async (req, res) => {
  try {
    const imageProcessor = require('../utils/imageProcessor');
    
    // Find users with old avatar format (string instead of JSON)
    const usersWithOldAvatars = await User.find({
      avatar: { $exists: true, $ne: null },
      $where: function() {
        try {
          JSON.parse(this.avatar);
          return false; // Already new format
        } catch (e) {
          return true; // Old format
        }
      }
    }).limit(10); // Process in batches

    const results = [];

    for (const user of usersWithOldAvatars) {
      try {
        const oldAvatarPath = user.avatar;
        const fullPath = path.join(process.cwd(), oldAvatarPath.replace(/^\//, ''));
        
        // Check if old file exists
        try {
          await fs.access(fullPath);
          
          // Process the old avatar
          const outputDir = path.join(process.cwd(), 'uploads', 'avatars');
          const filename = path.basename(fullPath);
          
          const processedImages = await imageProcessor.processAvatar(
            fullPath,
            outputDir,
            filename
          );

          // Update user record
          user.avatar = JSON.stringify(processedImages);
          await user.save();

          results.push({
            userId: user._id,
            status: 'success',
            message: 'Avatar processed successfully'
          });

        } catch (fileError) {
          // Old file doesn't exist, just clear the avatar
          user.avatar = null;
          await user.save();

          results.push({
            userId: user._id,
            status: 'cleared',
            message: 'Old avatar file not found, cleared reference'
          });
        }

      } catch (error) {
        console.error(`Failed to process avatar for user ${user._id}:`, error);
        results.push({
          userId: user._id,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.length} avatars`,
      data: {
        results,
        totalProcessed: results.length,
        successful: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch process avatars error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BATCH_PROCESS_ERROR',
        message: 'Failed to batch process avatars',
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getAvatar,
  getAvatarInfo,
  batchProcessAvatars,
  generateDefaultAvatarUrl
};