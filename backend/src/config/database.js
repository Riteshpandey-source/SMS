const mongoose = require('mongoose');
const { config } = require('./index');
const { tenantMongoosePlugin } = require('../utils/tenantMongoosePlugin');

// Apply tenant plugin globally to all schemas
mongoose.plugin(tenantMongoosePlugin);

let attendancePool = null;

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    await mongoose.connect(config.database.uri, config.database.options);
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

const getAttendancePool = () => {
  if (attendancePool) {
    return attendancePool;
  }

  try {
    const { Pool } = require('pg');
    attendancePool = config.attendanceDatabase.url
      ? new Pool({
          connectionString: config.attendanceDatabase.url,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        })
      : new Pool({
          host: config.attendanceDatabase.host,
          port: config.attendanceDatabase.port,
          database: config.attendanceDatabase.database,
          user: config.attendanceDatabase.user,
          password: config.attendanceDatabase.password
        });

    return attendancePool;
  } catch (error) {
    console.warn('PostgreSQL attendance pool unavailable:', error.message);
    return null;
  }
};

const getDBStatus = () => {
  const conn = mongoose.connection;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    status: states[conn.readyState] || 'unknown',
    host: conn.host || 'N/A',
    name: conn.name || 'N/A',
    port: conn.port || 'N/A'
  };
};

module.exports = {
  connectDB,
  getAttendancePool,
  getDBStatus
};
