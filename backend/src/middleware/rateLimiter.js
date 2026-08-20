const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// Redis store for rate limiting (fallback to memory if Redis unavailable)
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.client = getRedisClient();
  }

  async increment(key) {
    if (!this.client) {
      // Fallback to memory store if Redis is unavailable
      return this.memoryIncrement(key);
    }

    try {
      const fullKey = this.prefix + key;
      const current = await this.client.incr(fullKey);
      
      if (current === 1) {
        // Set expiration on first increment
        await this.client.expire(fullKey, 900); // 15 minutes
      }
      
      const ttl = await this.client.ttl(fullKey);
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + ttl * 1000)
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      return this.memoryIncrement(key);
    }
  }

  // Memory fallback
  memoryIncrement(key) {
    if (!this.memoryStore) {
      this.memoryStore = new Map();
    }

    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const record = this.memoryStore.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }

    this.memoryStore.set(key, record);

    return {
      totalHits: record.count,
      resetTime: new Date(record.resetTime)
    };
  }

  async decrement(key) {
    if (!this.client) return;

    try {
      const fullKey = this.prefix + key;
      await this.client.decr(fullKey);
    } catch (error) {
      console.error('Redis decrement error:', error);
    }
  }

  async resetKey(key) {
    if (!this.client) {
      if (this.memoryStore) {
        this.memoryStore.delete(key);
      }
      return;
    }

    try {
      const fullKey = this.prefix + key;
      await this.client.del(fullKey);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }
}

// Create rate limiter with custom error response
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // requests per window
    message = 'Too many requests',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    ...otherOptions
  } = options;

  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    skipSuccessfulRequests,
    skipFailedRequests,
    skip: (req, res) => {
      // Bypass rate limiting in development mode
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || process.env.DISABLE_RATE_LIMITER === 'true') {
        return true;
      }
      return options.skip ? options.skip(req, res) : false;
    },
    store: new RedisStore({ prefix: 'rl:' }),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...otherOptions
  });
};

// Authentication rate limiter (stricter for login attempts)
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) => {
    // Rate limit by IP and email combination for login attempts
    const email = req.body?.email || 'unknown';
    return `auth:${req.ip}:${email}`;
  },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Registration rate limiter
const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: 'Too many registration attempts. Please try again later.',
  keyGenerator: (req) => `register:${req.ip}`
});

// Password reset rate limiter
const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: 'Too many password reset requests. Please try again later.',
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return `reset:${req.ip}:${email}`;
  }
});

// General API rate limiter
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window (increased for development)
  message: 'Too many API requests. Please try again later.',
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `api:user:${req.user._id}` : `api:ip:${req.ip}`;
  }
});

// File upload rate limiter
const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Too many file uploads. Please try again later.',
  keyGenerator: (req) => {
    return req.user ? `upload:${req.user._id}` : `upload:${req.ip}`;
  }
});

// Search rate limiter
const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests. Please slow down.',
  keyGenerator: (req) => {
    return req.user ? `search:${req.user._id}` : `search:${req.ip}`;
  }
});

// Admin action rate limiter
const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 admin actions per minute
  message: 'Too many admin actions. Please slow down.',
  keyGenerator: (req) => `admin:${req.user?._id || req.ip}`,
  skip: (req) => req.user?.role !== 'admin' // Only apply to admin users
});

// Dynamic rate limiter based on user role
const roleBasedRateLimiter = (req, res, next) => {
  if (!req.user) {
    return apiRateLimiter(req, res, next);
  }

  const limits = {
    admin: { max: 200, windowMs: 15 * 60 * 1000 }, // 200 requests per 15 minutes
    faculty: { max: 150, windowMs: 15 * 60 * 1000 }, // 150 requests per 15 minutes
    student: { max: 100, windowMs: 15 * 60 * 1000 }  // 100 requests per 15 minutes
  };

  const userLimit = limits[req.user.role] || limits.student;
  
  const dynamicLimiter = createRateLimiter({
    ...userLimit,
    keyGenerator: (req) => `role:${req.user.role}:${req.user._id}`,
    message: `Too many requests for ${req.user.role} role. Please try again later.`
  });

  return dynamicLimiter(req, res, next);
};

// Burst protection (very short window, high frequency)
const burstProtection = createRateLimiter({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  message: 'Request rate too high. Please slow down.',
  keyGenerator: (req) => `burst:${req.ip}`
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  searchRateLimiter,
  adminRateLimiter,
  roleBasedRateLimiter,
  burstProtection,
  RedisStore
};