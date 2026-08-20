const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    console.log('🔍 Creating Test User...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Delete existing test user
    await User.deleteOne({ email: 'test@college.edu' });
    console.log('🧹 Deleted existing test user');
    
    // Create new test user
    const testUser = new User({
      name: 'Test User',
      email: 'test@college.edu',
      password: 'password123',
      role: 'student',
      department: 'CS',
      academicYear: 3
    });
    
    await testUser.save();
    console.log('✅ Test user created successfully');
    
    // Test login immediately
    console.log('\n🧪 Testing login with new user:');
    try {
      const user = await User.findByCredentials('test@college.edu', 'password123');
      console.log('✅ Login successful!');
      console.log('👤 User:', user.name);
      console.log('📧 Email:', user.email);
    } catch (error) {
      console.log('❌ Login failed:', error.message);
    }
    
    // Test API call
    console.log('\n🌐 Testing API call:');
    const axios = require('axios');
    
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: 'test@college.edu',
        password: 'password123'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API Login successful!');
      console.log('📊 Response:', response.data.success);
      console.log('👤 User:', response.data.data.user.name);
      
    } catch (apiError) {
      console.log('❌ API Login failed:');
      console.log('Status:', apiError.response?.status);
      console.log('Error:', apiError.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createTestUser();