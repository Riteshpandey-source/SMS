const express = require('express');
// cors removed
const helmet = require('helmet');
const morgan = require('morgan');

const { config } = require('./config');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
// CORS removed to avoid duplication with server.js
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Attendance Management System API is healthy'
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use(errorHandler);

module.exports = app;
