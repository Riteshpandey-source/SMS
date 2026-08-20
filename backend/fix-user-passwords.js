const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function fixUserPasswords() {
  try {
    console.log('🔧 Fixing User Passwords...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Get all users except test user
    const users = await User.find({ 
      email: { $ne: 'test@college.edu' }
    }).select('+password');
    
    console.log(`📋 Found ${users.length} users to fix`);
    
    // Hash password for all users
    const hashedPassword = await bcrypt.hash('password123', 12);
    console.log('🔐 Generated new password hash');
    
    let fixedCount = 0;
    
    for (const user of users) {
      try {
        // Update password directly in database
        await User.updateOne(
          { _id: user._id },
          { $set: { password: hashedPassword } }
        );
        
        console.log(`✅ Fixed password for: ${user.name} (${user.email})`);
        fixedCount++;
        
      } catch (error) {
        console.log(`❌ Failed to fix password for ${user.name}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Fixed passwords for ${fixedCount} users`);
    
    // Test login with fixed user
    console.log('\n🧪 Testing login with fixed user:');
    try {
      const testUser = await User.findByCredentials('cs.student1@college.edu', 'password123');
      console.log('✅ Login successful!');
      console.log('👤 User:', testUser.name);
    } catch (error) {
      console.log('❌ Login failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixUserPasswords();