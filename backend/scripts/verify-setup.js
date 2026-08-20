#!/usr/bin/env node

/**
 * Setup Verification Script
 * 
 * This script verifies that the backend setup is correct and all files are in place.
 * Usage: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CampusBuddy Backend - Setup Verification');
console.log('==========================================\n');

// Required files and directories
const requiredPaths = [
  // Configuration files
  '.env',
  '.env.example',
  'package.json',
  'README.md',
  '.gitignore',
  'jest.config.js',
  
  // Source directories
  'src/',
  'src/config/',
  'src/controllers/',
  'src/middleware/',
  'src/models/',
  'src/routes/',
  'src/utils/',
  
  // Core files
  'src/server.js',
  'src/config/database.js',
  'src/config/redis.js',
  'src/config/index.js',
  'src/middleware/errorHandler.js',
  
  // Route files
  'src/routes/auth.js',
  'src/routes/users.js',
  'src/routes/academic.js',
  'src/routes/events.js',
  'src/routes/notes.js',
  'src/routes/forum.js',
  'src/routes/notifications.js',
  
  // Model files
  'src/models/User.js',
  'src/models/AcademicRecord.js',
  'src/models/Event.js',
  'src/models/Note.js',
  'src/models/Question.js',
  'src/models/Answer.js',
  'src/models/Notification.js',
  
  // Other directories
  'tests/',
  'uploads/',
  'scripts/'
];

let allGood = true;

console.log('📁 Checking file structure...');
requiredPaths.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  const isDir = filePath.endsWith('/');
  const icon = exists ? '✅' : '❌';
  const type = isDir ? 'Directory' : 'File';
  
  console.log(`${icon} ${type}: ${filePath}`);
  
  if (!exists) {
    allGood = false;
  }
});

console.log('\n📦 Checking package.json...');
try {
  const packageJson = require('../package.json');
  const requiredDeps = [
    'express', 'mongoose', 'redis', 'jsonwebtoken', 
    'bcryptjs', 'joi', 'helmet', 'cors', 'morgan'
  ];
  
  requiredDeps.forEach(dep => {
    const exists = packageJson.dependencies && packageJson.dependencies[dep];
    console.log(`${exists ? '✅' : '❌'} Dependency: ${dep}`);
    if (!exists) allGood = false;
  });
  
  const requiredScripts = ['start', 'dev', 'test'];
  requiredScripts.forEach(script => {
    const exists = packageJson.scripts && packageJson.scripts[script];
    console.log(`${exists ? '✅' : '❌'} Script: ${script}`);
    if (!exists) allGood = false;
  });
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  allGood = false;
}

console.log('\n🔧 Checking environment configuration...');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  
  // Check for required environment variables
  require('dotenv').config({ path: envPath });
  const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  
  requiredEnvVars.forEach(envVar => {
    const exists = process.env[envVar];
    console.log(`${exists ? '✅' : '❌'} Environment variable: ${envVar}`);
    if (!exists) allGood = false;
  });
} else {
  console.log('❌ .env file missing');
  allGood = false;
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('🎉 Setup verification passed! Your backend is ready.');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Test connections: npm run test:connections');
  console.log('3. Start development server: npm run dev');
} else {
  console.log('⚠️  Setup verification failed. Please fix the issues above.');
}

process.exit(allGood ? 0 : 1);