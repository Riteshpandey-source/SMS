const { connectDB, getDBStatus } = require('./database');
const { connectRedis, getRedisStatus, setCache, getCache } = require('./redis');
const { validateConfig } = require('./index');

// Test database connection
const testDatabaseConnection = async () => {
  console.log('🧪 Testing MongoDB connection...');
  
  try {
    await connectDB();
    const status = getDBStatus();
    
    if (status.status === 'connected') {
      console.log('✅ MongoDB connection test passed');
      console.log(`   Host: ${status.host}`);
      console.log(`   Database: ${status.name}`);
      return true;
    } else {
      console.log('❌ MongoDB connection test failed');
      console.log(`   Status: ${status.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ MongoDB connection test error:', error.message);
    return false;
  }
};

// Test Redis connection
const testRedisConnection = async () => {
  console.log('🧪 Testing Redis connection...');
  
  try {
    await connectRedis();
    const status = getRedisStatus();
    
    if (status.connected) {
      // Test cache operations
      const testKey = 'test:connection';
      const testValue = { message: 'Redis connection test', timestamp: new Date() };
      
      const setResult = await setCache(testKey, testValue, 60);
      if (!setResult) {
        console.log('❌ Redis SET operation failed');
        return false;
      }
      
      const getValue = await getCache(testKey);
      if (!getValue || getValue.message !== testValue.message) {
        console.log('❌ Redis GET operation failed');
        return false;
      }
      
      console.log('✅ Redis connection test passed');
      console.log(`   Status: ${status.connected ? 'Connected' : 'Disconnected'}`);
      console.log(`   Client: ${status.client}`);
      return true;
    } else {
      console.log('❌ Redis connection test failed');
      console.log(`   Status: ${status.connected ? 'Connected' : 'Disconnected'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Redis connection test error:', error.message);
    return false;
  }
};

// Test all connections
const testAllConnections = async () => {
  console.log('🚀 Starting connection tests...\n');
  
  // Validate configuration first
  try {
    validateConfig();
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    return false;
  }
  
  const results = {
    database: false,
    redis: false
  };
  
  // Test database connection
  results.database = await testDatabaseConnection();
  console.log('');
  
  // Test Redis connection
  results.redis = await testRedisConnection();
  console.log('');
  
  // Summary
  console.log('📊 Connection Test Summary:');
  console.log(`   MongoDB: ${results.database ? '✅ Connected' : '❌ Failed'}`);
  console.log(`   Redis: ${results.redis ? '✅ Connected' : '❌ Failed'}`);
  
  const allPassed = results.database && results.redis;
  console.log(`\n${allPassed ? '✅' : '❌'} Overall Status: ${allPassed ? 'All connections successful' : 'Some connections failed'}`);
  
  return allPassed;
};

// Health check function for API endpoint
const getHealthStatus = async () => {
  const dbStatus = getDBStatus();
  const redisStatus = getRedisStatus();
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0',
    services: {
      database: {
        status: dbStatus.status,
        host: dbStatus.host,
        name: dbStatus.name,
        port: dbStatus.port
      },
      redis: {
        status: redisStatus.connected ? 'connected' : 'disconnected',
        client: redisStatus.client
      }
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
};

module.exports = {
  testDatabaseConnection,
  testRedisConnection,
  testAllConnections,
  getHealthStatus
};

// Run tests if this file is executed directly
if (require.main === module) {
  testAllConnections().then((success) => {
    process.exit(success ? 0 : 1);
  });
}