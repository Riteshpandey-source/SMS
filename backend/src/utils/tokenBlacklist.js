const { getRedisClient } = require('../config/redis');

// Token blacklist key prefix
const BLACKLIST_PREFIX = 'blacklist:';

// Add token to blacklist
const addToken = async (token, expiresIn = null) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      console.warn('Redis not available, token blacklisting disabled');
      return false;
    }

    // If no expiration provided, calculate from token
    if (!expiresIn) {
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          const now = Math.floor(Date.now() / 1000);
          expiresIn = Math.max(decoded.exp - now, 0);
        } else {
          expiresIn = 24 * 60 * 60; // Default 24 hours
        }
      } catch (error) {
        expiresIn = 24 * 60 * 60; // Default 24 hours
      }
    }

    // Only add if not already expired
    if (expiresIn > 0) {
      await redisClient.setEx(`${BLACKLIST_PREFIX}${token}`, expiresIn, 'blacklisted');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding token to blacklist:', error);
    return false;
  }
};

// Check if token is blacklisted
const isBlacklisted = async (token) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      // If Redis is not available, assume token is not blacklisted
      return false;
    }

    const result = await redisClient.get(`${BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    // On error, assume token is not blacklisted to avoid blocking valid users
    return false;
  }
};

// Remove token from blacklist (rarely used)
const removeToken = async (token) => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) return false;

    await redisClient.del(`${BLACKLIST_PREFIX}${token}`);
    return true;
  } catch (error) {
    console.error('Error removing token from blacklist:', error);
    return false;
  }
};

// Clear all blacklisted tokens (admin utility)
const clearAll = async () => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) return false;

    const keys = await redisClient.keys(`${BLACKLIST_PREFIX}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing token blacklist:', error);
    return false;
  }
};

// Get blacklist statistics (admin utility)
const getStats = async () => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) return { count: 0, available: false };

    const keys = await redisClient.keys(`${BLACKLIST_PREFIX}*`);
    return {
      count: keys.length,
      available: true
    };
  } catch (error) {
    console.error('Error getting blacklist stats:', error);
    return { count: 0, available: false, error: error.message };
  }
};

// Add refresh token to blacklist
const addRefreshToken = async (refreshToken, expiresIn = null) => {
  return await addToken(refreshToken, expiresIn);
};

// Check if refresh token is blacklisted
const isRefreshTokenBlacklisted = async (refreshToken) => {
  return await isBlacklisted(refreshToken);
};

// Blacklist all tokens for a user (for logout all devices)
const blacklistAllUserTokens = async (userId, reason = 'logout_all') => {
  try {
    const redisClient = getRedisClient();
    if (!redisClient) return false;

    // This is a placeholder - in a real implementation, you'd need to track
    // user tokens separately or use a different approach
    console.log(`Blacklisting all tokens for user ${userId}, reason: ${reason}`);
    return true;
  } catch (error) {
    console.error('Error blacklisting all user tokens:', error);
    return false;
  }
};

module.exports = {
  addToken,
  isBlacklisted,
  removeToken,
  clearAll,
  getStats,
  addRefreshToken,
  isRefreshTokenBlacklisted,
  blacklistAllUserTokens
};