require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost'
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/campusbuddy_dev',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    }
  },
  attendanceDatabase: {
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'attendance_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    defaultExpiration: 3600
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'pdf',
      'doc',
      'docx',
      'ppt',
      'pptx',
      'jpg',
      'jpeg',
      'png'
    ]
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET
  },
  security: {
    bcryptRounds: 12,
    passwordMinLength: 8,
    maxLoginAttempts: 5,
    lockoutTime: 30 * 60 * 1000
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  }
};

const validateConfig = () => {
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  if (
    process.env.NODE_ENV === 'production' &&
    (config.jwt.secret === 'fallback-secret-key' || config.jwt.refreshSecret === 'fallback-refresh-secret')
  ) {
    console.error('Production environment must use secure JWT secrets');
    process.exit(1);
  }
};

module.exports = { config, validateConfig };
