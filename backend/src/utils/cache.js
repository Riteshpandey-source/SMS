const { getCache, setCache, deleteCache, clearCache } = require('../config/redis');

/**
 * Cache utility functions with fallback for when Redis is not available
 */

// In-memory cache fallback for development
const memoryCache = new Map();
const cacheExpiry = new Map();

// Cache key generators
const generateCacheKey = (prefix, ...parts) => {
  return `${prefix}:${parts.filter(Boolean).join(':')}`;
};

// User cache keys
const USER_CACHE_KEYS = {
  profile: (userId) => generateCacheKey('user', 'profile', userId),
  search: (query, page) => generateCacheKey('user', 'search', query, page)
};

// Academic cache keys
const ACADEMIC_CACHE_KEYS = {
  records: (studentId) => generateCacheKey('academic', 'records', studentId),
  attendance: (studentId) => generateCacheKey('academic', 'attendance', studentId),
  marks: (studentId) => generateCacheKey('academic', 'marks', studentId)
};

// Event cache keys
const EVENT_CACHE_KEYS = {
  list: (filters) => generateCacheKey('events', 'list', JSON.stringify(filters)),
  details: (eventId) => generateCacheKey('events', 'details', eventId),
  attendees: (eventId) => generateCacheKey('events', 'attendees', eventId)
};

// Notes cache keys
const NOTE_CACHE_KEYS = {
  list: (filters) => generateCacheKey('notes', 'list', JSON.stringify(filters)),
  details: (noteId) => generateCacheKey('notes', 'details', noteId)
};

// Forum cache keys
const FORUM_CACHE_KEYS = {
  questions: (filters) => generateCacheKey('forum', 'questions', JSON.stringify(filters)),
  question: (questionId) => generateCacheKey('forum', 'question', questionId),
  answers: (questionId) => generateCacheKey('forum', 'answers', questionId)
};

// Notification cache keys
const NOTIFICATION_CACHE_KEYS = {
  user: (userId) => generateCacheKey('notifications', 'user', userId),
  unread: (userId) => generateCacheKey('notifications', 'unread', userId)
};

// Memory cache helpers (fallback)
const setMemoryCache = (key, value, ttlSeconds = 3600) => {
  memoryCache.set(key, value);
  cacheExpiry.set(key, Date.now() + (ttlSeconds * 1000));
  
  // Clean up expired entries
  setTimeout(() => {
    if (cacheExpiry.get(key) <= Date.now()) {
      memoryCache.delete(key);
      cacheExpiry.delete(key);
    }
  }, ttlSeconds * 1000);
};

const getMemoryCache = (key) => {
  const expiry = cacheExpiry.get(key);
  if (expiry && expiry <= Date.now()) {
    memoryCache.delete(key);
    cacheExpiry.delete(key);
    return null;
  }
  return memoryCache.get(key) || null;
};

const deleteMemoryCache = (key) => {
  memoryCache.delete(key);
  cacheExpiry.delete(key);
};

// Main cache functions with Redis fallback
const get = async (key) => {
  try {
    // Try Redis first
    const redisValue = await getCache(key);
    if (redisValue !== null) {
      return redisValue;
    }
    
    // Fallback to memory cache
    return getMemoryCache(key);
  } catch (error) {
    console.error('❌ Cache GET error:', error);
    return getMemoryCache(key);
  }
};

const set = async (key, value, ttlSeconds = 3600) => {
  try {
    // Try Redis first
    const redisSuccess = await setCache(key, value, ttlSeconds);
    if (redisSuccess) {
      return true;
    }
    
    // Fallback to memory cache
    setMemoryCache(key, value, ttlSeconds);
    return true;
  } catch (error) {
    console.error('❌ Cache SET error:', error);
    setMemoryCache(key, value, ttlSeconds);
    return true;
  }
};

const del = async (key) => {
  try {
    // Try Redis first
    await deleteCache(key);
    
    // Also delete from memory cache
    deleteMemoryCache(key);
    return true;
  } catch (error) {
    console.error('❌ Cache DELETE error:', error);
    deleteMemoryCache(key);
    return true;
  }
};

const clear = async (pattern = '*') => {
  try {
    // Try Redis first
    await clearCache(pattern);
    
    // Clear memory cache
    if (pattern === '*') {
      memoryCache.clear();
      cacheExpiry.clear();
    } else {
      // Simple pattern matching for memory cache
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
          cacheExpiry.delete(key);
        }
      }
    }
    return true;
  } catch (error) {
    console.error('❌ Cache CLEAR error:', error);
    return false;
  }
};

// Cache invalidation helpers
const invalidateUserCache = async (userId) => {
  await del(USER_CACHE_KEYS.profile(userId));
  await clear('user:search:*');
};

const invalidateAcademicCache = async (studentId) => {
  await del(ACADEMIC_CACHE_KEYS.records(studentId));
  await del(ACADEMIC_CACHE_KEYS.attendance(studentId));
  await del(ACADEMIC_CACHE_KEYS.marks(studentId));
};

const invalidateEventCache = async (eventId = null) => {
  if (eventId) {
    await del(EVENT_CACHE_KEYS.details(eventId));
    await del(EVENT_CACHE_KEYS.attendees(eventId));
  }
  await clear('events:list:*');
};

const invalidateNoteCache = async (noteId = null) => {
  if (noteId) {
    await del(NOTE_CACHE_KEYS.details(noteId));
  }
  await clear('notes:list:*');
};

const invalidateForumCache = async (questionId = null) => {
  if (questionId) {
    await del(FORUM_CACHE_KEYS.question(questionId));
    await del(FORUM_CACHE_KEYS.answers(questionId));
  }
  await clear('forum:questions:*');
};

const invalidateNotificationCache = async (userId) => {
  await del(NOTIFICATION_CACHE_KEYS.user(userId));
  await del(NOTIFICATION_CACHE_KEYS.unread(userId));
};

// Cache middleware for Express routes
const cacheMiddleware = (keyGenerator, ttlSeconds = 3600) => {
  return async (req, res, next) => {
    try {
      const cacheKey = keyGenerator(req);
      const cachedData = await get(cacheKey);
      
      if (cachedData) {
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        if (data.success && data.data) {
          set(cacheKey, data.data, ttlSeconds).catch(console.error);
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('❌ Cache middleware error:', error);
      next();
    }
  };
};

module.exports = {
  get,
  set,
  del,
  clear,
  generateCacheKey,
  USER_CACHE_KEYS,
  ACADEMIC_CACHE_KEYS,
  EVENT_CACHE_KEYS,
  NOTE_CACHE_KEYS,
  FORUM_CACHE_KEYS,
  NOTIFICATION_CACHE_KEYS,
  invalidateUserCache,
  invalidateAcademicCache,
  invalidateEventCache,
  invalidateNoteCache,
  invalidateForumCache,
  invalidateNotificationCache,
  cacheMiddleware
};