#!/usr/bin/env node

/**
 * Connection Test Script
 * 
 * This script tests database connections independently of the main server.
 * Usage: node scripts/test-connections.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { testAllConnections } = require('../src/config/testConnections');

console.log('🔧 CampusBuddy Backend - Connection Test Script');
console.log('================================================\n');

testAllConnections()
  .then((success) => {
    if (success) {
      console.log('\n🎉 All connections are working properly!');
      console.log('You can now start the server with: npm run dev');
    } else {
      console.log('\n⚠️  Some connections failed. Please check your configuration.');
      console.log('Make sure MongoDB and Redis are running and accessible.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Connection test script failed:', error.message);
    process.exit(1);
  });