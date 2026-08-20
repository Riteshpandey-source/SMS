const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testLogin() {
  try {
    console.log('🔍 Testing Login API...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Find a test user
    const testUser = await User.findOne({ email: 'cs.student1@college.edu' });
    if (!testUser) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('👤 Test User Found:');
    console.log(`   Name: ${testUser.name}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Role: ${testUser.role}`);
    console.log(`   Department: ${testUser.department}`);
    console.log(`   Password Hash: ${testUser.password.substring(0, 20)}...`);
    
    // Test login API call
    const axios = require('axios');
    
    console.log('\n🧪 Testing Login API Call...');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'cs.student1@college.edu',
        password: 'password123' // Default password from sample data
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Login Successful!');
      console.log('📊 Response:', response.data);
      
    } catch (loginError) {
      console.log('❌ Login Failed:');
      console.log('Status:', loginError.response?.status);
      console.log('Error:', loginError.response?.data);
      
      // Try with different password
      console.log('\n🔄 Trying with different passwords...');
      const passwords = ['password123', 'student123', '123456', 'password'];
      
      for (const pwd of passwords) {
        try {
          console.log(`   Trying password: ${pwd}`);
          const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'cs.student1@college.edu',
            password: pwd
          });
          
          console.log(`✅ Success with password: ${pwd}`);
          console.log('📊 Response:', response.data);
          break;
          
        } catch (err) {
          console.log(`   ❌ Failed with ${pwd}: ${err.response?.data?.error?.message || err.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testLogin();