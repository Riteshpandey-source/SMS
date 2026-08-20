const redis = require('redis');

let redisClient;
let isRedisConnected = false;

const connectRedis = async () => {
  // Skip Redis connection if not available
  if (!process.env.REDIS_URL || process.env.REDIS_URL === 'redis://localhost:6379') {
    console.log('⚠️  Redis not configured - using memory fallbacks');
    console.log('💡 To enable Redis: Install Redis server and set REDIS_URL environment variable');
    return;
  }

  try {
    // Redis connection options
    const redisOptions = {
      url: process.env.REDIS_URL,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.log('❌ Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.log('❌ Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 3) {
          console.log('❌ Redis max retry attempts reached');
          return undefined;
        }
        // Reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
    };

    redisClient = redis.createClient(redisOptions);

    // Event listeners
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('🔴 Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('🔴 Redis Connected and Ready');
      isRedisConnected = true;
    });

    redisClient.on('end', () => {
      console.log('🔴 Redis connection ended');
      isRedisConnected = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
      isRedisConnected = false;
    });

    // Connect to Redis
    await redisClient.connect();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      if (redisClient && isRedisConnected) {
        try {
          await redisClient.quit();
          console.log('🔴 Redis connection closed through app termination');
        } catch (error) {
          console.error('❌ Error closing Redis connection:', error);
        }
      }
    });

  } catch (error) {
    console.error('❌ Redis connection error:', error.message);
    isRedisConnected = false;
    
    // Continue without Redis - application will use memory fallbacks
    console.log('⚠️  Continuing without Redis - using memory fallbacks');
  }
};

// Get Redis client (with null check)
const getRedisClient = () => {
  if (!redisClient || !isRedisConnected) {
    console.warn('⚠️  Redis client not available');
    return null;
  }
  return redisClient;
};

// Check Redis connection status
const getRedisStatus = () => {
  return {
    connected: isRedisConnected,
    client: redisClient ? 'initialized' : 'not initialized'
  };
};

// Redis utility functions
const setCache = async (key, value, expireInSeconds = 3600) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.setEx(key, expireInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('❌ Redis SET error:', error);
    return false;
  }
};

const getCache = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('❌ Redis GET error:', error);
    return null;
  }
};

const deleteCache = async (key) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('❌ Redis DELETE error:', error);
    return false;
  }
};

const clearCache = async (pattern = '*') => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error('❌ Redis CLEAR error:', error);
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  getRedisStatus,
  setCache,
  getCache,
  deleteCache,
  clearCache
};