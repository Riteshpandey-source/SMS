const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { validateConfig } = require('./config/index');
const { initializeUploads } = require('./middleware/uploadSetup');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

validateConfig();
initializeUploads();
connectDB();
connectRedis();

app.use(helmet());

const corsOptions = {
  origin(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5174',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://sms-rose-one.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('CORS: request from non-allowlisted origin:', origin);
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'X-Total-Count'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  '/uploads',
  (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    next();
  },
  express.static('uploads')
);

app.get('/health', async (req, res) => {
  try {
    const { getHealthStatus } = require('./config/testConnections');
    const healthStatus = await getHealthStatus();

    res.status(200).json({
      success: true,
      message: 'CampusBuddy API is running',
      ...healthStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/super-admin', require('./routes/superAdmin'));
app.use('/api/institution', require('./routes/institution'));
app.use('/api/users', require('./routes/users'));
app.use('/api/academic', require('./routes/academic'));
app.use('/api/events', require('./routes/events'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/parent', require('./routes/parent'));
app.use('/api/admin', require('./routes/adminHierarchy'));
app.use('/api/daily-attendance', require('./routes/dailyAttendance'));
app.use('/api/exam-marks', require('./routes/examMarks'));
app.use('/api/routines', require('./routes/routines'));

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested route was not found',
      timestamp: new Date().toISOString()
    }
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`CampusBuddy API server running on port ${PORT}`);
});

module.exports = app;
