const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testFindByCredentials() {
  try {
    console.log('🔍 Testing User.findByCredentials...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Test findByCredentials method
    console.log('\n🧪 Testing with correct credentials:');
    try {
      const user = await User.findByCredentials('cs.student1@college.edu', 'password123');
      console.log('✅ Login successful!');
      console.log('👤 User:', user.name);
      console.log('📧 Email:', user.email);
      console.log('🏢 Department:', user.department);
      console.log('📅 Year:', user.academicYear);
    } catch (error) {
      console.log('❌ Login failed:', error.message);
    }
    
    console.log('\n🧪 Testing with wrong password:');
    try {
      const user = await User.findByCredentials('cs.student1@college.edu', 'wrongpassword');
      console.log('✅ Login successful (unexpected!)');
    } catch (error) {
      console.log('❌ Login failed (expected):', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testFindByCredentials();