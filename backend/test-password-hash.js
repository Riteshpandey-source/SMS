const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function testPasswordHash() {
  try {
    console.log('🔍 Testing Password Hash...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Find test user
    const user = await User.findOne({ email: 'cs.student1@college.edu' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 User found:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🔐 Stored hash:', user.password);
    
    // Test different passwords
    const testPasswords = ['password123', 'student123', '123456', 'password'];
    
    console.log('\n🧪 Testing passwords:');
    
    for (const pwd of testPasswords) {
      try {
        const isMatch = await bcrypt.compare(pwd, user.password);
        console.log(`   ${pwd}: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        
        if (isMatch) {
          console.log(`\n🎉 Correct password found: ${pwd}`);
          break;
        }
      } catch (error) {
        console.log(`   ${pwd}: ❌ ERROR - ${error.message}`);
      }
    }
    
    // Test creating new hash
    console.log('\n🔧 Creating new hash for "password123":');
    const newHash = await bcrypt.hash('password123', 10);
    console.log('New hash:', newHash);
    
    const testNewHash = await bcrypt.compare('password123', newHash);
    console.log('New hash test:', testNewHash ? '✅ WORKS' : '❌ FAILED');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPasswordHash();