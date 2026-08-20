const { getRedisClient } = require('../config/redis');
const { generateTokenPair } = require('./jwt');
const tokenBlacklist = require('./tokenBlacklist');

class SessionManager {
  constructor() {
    this.prefix = 'session:';
    this.userSessionsPrefix = 'user_sessions:';
    this.memoryStore = new Map(); // Fallback when Redis is unavailable
  }

  getClient() {
    return getRedisClient();
  }

  // Create a new session
  async createSession(user, deviceInfo = {}) {
    try {
      const { accessToken, refreshToken } = generateTokenPair(user);
      
      const sessionData = {
        userId: user._id.toString(),
        accessToken,
        refreshToken,
        deviceInfo: {
          userAgent: deviceInfo.userAgent || 'Unknown',
          ip: deviceInfo.ip || 'Unknown',
          platform: deviceInfo.platform || 'Unknown',
          browser: deviceInfo.browser || 'Unknown'
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true
      };

      const sessionId = this.generateSessionId();
      const client = this.getClient();

      if (client) {
        // Store session in Redis
        await client.setEx(
          `${this.prefix}${sessionId}`, 
          7 * 24 * 60 * 60, // 7 days
          JSON.stringify(sessionData)
        );

        // Add to user's session list
        await this.addToUserSessions(user._id.toString(), sessionId);
      } else {
        // Memory fallback
        const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        this.memoryStore.set(sessionId, { ...sessionData, expiration });
      }

      return {
        sessionId,
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours for access token
        refreshExpiresIn: 7 * 24 * 60 * 60 // 7 days for refresh token
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  // Get session by ID
  async getSession(sessionId) {
    try {
      const client = this.getClient();

      if (client) {
        const sessionData = await client.get(`${this.prefix}${sessionId}`);
        return sessionData ? JSON.parse(sessionData) : null;
      } else {
        const session = this.memoryStore.get(sessionId);
        if (session) {
          if (Date.now() > session.expiration) {
            this.memoryStore.delete(sessionId);
            return null;
          }
          return session;
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Update session activity
  async updateSessionActivity(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      session.lastActivity = new Date().toISOString();

      const client = this.getClient();
      if (client) {
        await client.setEx(
          `${this.prefix}${sessionId}`,
          7 * 24 * 60 * 60, // Reset expiration
          JSON.stringify(session)
        );
      } else {
        session.expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
        this.memoryStore.set(sessionId, session);
      }

      return true;
    } catch (error) {
      console.error('Error updating session activity:', error);
      return false;
    }
  }

  // Invalidate session
  async invalidateSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      // Blacklist the tokens
      await tokenBlacklist.addToken(session.accessToken);
      await tokenBlacklist.addRefreshToken(session.refreshToken);

      // Remove session
      const client = this.getClient();
      if (client) {
        await client.del(`${this.prefix}${sessionId}`);
        await this.removeFromUserSessions(session.userId, sessionId);
      } else {
        this.memoryStore.delete(sessionId);
      }

      return true;
    } catch (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
  }

  // Get all sessions for a user
  async getUserSessions(userId) {
    try {
      const client = this.getClient();

      if (client) {
        const sessionIds = await client.sMembers(`${this.userSessionsPrefix}${userId}`);
        const sessions = [];

        for (const sessionId of sessionIds) {
          const session = await this.getSession(sessionId);
          if (session && session.isActive) {
            sessions.push({
              sessionId,
              deviceInfo: session.deviceInfo,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity,
              isCurrent: false // Will be set by caller if needed
            });
          } else {
            // Clean up invalid session
            await this.removeFromUserSessions(userId, sessionId);
          }
        }

        return sessions;
      } else {
        // Memory fallback - less efficient
        const sessions = [];
        for (const [sessionId, session] of this.memoryStore.entries()) {
          if (session.userId === userId && session.isActive) {
            if (Date.now() <= session.expiration) {
              sessions.push({
                sessionId,
                deviceInfo: session.deviceInfo,
                createdAt: session.createdAt,
                lastActivity: session.lastActivity,
                isCurrent: false
              });
            } else {
              this.memoryStore.delete(sessionId);
            }
          }
        }
        return sessions;
      }
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Invalidate all sessions for a user
  async invalidateAllUserSessions(userId, exceptSessionId = null) {
    try {
      const sessions = await this.getUserSessions(userId);
      let invalidatedCount = 0;

      for (const session of sessions) {
        if (session.sessionId !== exceptSessionId) {
          const success = await this.invalidateSession(session.sessionId);
          if (success) invalidatedCount++;
        }
      }

      // Also blacklist all tokens for this user
      await tokenBlacklist.blacklistAllUserTokens(userId, 'logout_all_devices');

      return invalidatedCount;
    } catch (error) {
      console.error('Error invalidating all user sessions:', error);
      return 0;
    }
  }

  // Refresh session tokens
  async refreshSession(sessionId, refreshToken) {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.refreshToken !== refreshToken) {
        return null;
      }

      // Blacklist old tokens
      await tokenBlacklist.addToken(session.accessToken);
      await tokenBlacklist.addRefreshToken(session.refreshToken);

      // Generate new tokens
      const user = { _id: session.userId }; // Minimal user object for token generation
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

      // Update session
      session.accessToken = newAccessToken;
      session.refreshToken = newRefreshToken;
      session.lastActivity = new Date().toISOString();

      const client = this.getClient();
      if (client) {
        await client.setEx(
          `${this.prefix}${sessionId}`,
          7 * 24 * 60 * 60,
          JSON.stringify(session)
        );
      } else {
        session.expiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
        this.memoryStore.set(sessionId, session);
      }

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 24 * 60 * 60
      };
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      const client = this.getClient();

      if (client) {
        // Redis handles expiration automatically
        return true;
      } else {
        // Clean up memory store
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.memoryStore.entries()) {
          if (now > session.expiration) {
            this.memoryStore.delete(sessionId);
            cleanedCount++;
          }
        }

        console.log(`Cleaned up ${cleanedCount} expired sessions from memory`);
        return true;
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return false;
    }
  }

  // Helper methods
  generateSessionId() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  async addToUserSessions(userId, sessionId) {
    const client = this.getClient();
    if (client) {
      await client.sAdd(`${this.userSessionsPrefix}${userId}`, sessionId);
      await client.expire(`${this.userSessionsPrefix}${userId}`, 7 * 24 * 60 * 60);
    }
  }

  async removeFromUserSessions(userId, sessionId) {
    const client = this.getClient();
    if (client) {
      await client.sRem(`${this.userSessionsPrefix}${userId}`, sessionId);
    }
  }

  // Get session statistics
  async getStats() {
    try {
      const client = this.getClient();

      if (client) {
        const sessionKeys = await client.keys(`${this.prefix}*`);
        const userSessionKeys = await client.keys(`${this.userSessionsPrefix}*`);

        return {
          totalSessions: sessionKeys.length,
          totalUsers: userSessionKeys.length,
          storage: 'redis'
        };
      } else {
        const activeSessions = Array.from(this.memoryStore.values())
          .filter(session => Date.now() <= session.expiration);
        
        const uniqueUsers = new Set(activeSessions.map(session => session.userId));

        return {
          totalSessions: activeSessions.length,
          totalUsers: uniqueUsers.size,
          storage: 'memory'
        };
      }
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        totalUsers: 0,
        storage: 'error'
      };
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Clean up expired sessions periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // Every hour
}

module.exports = sessionManager;