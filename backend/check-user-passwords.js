const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkPasswords() {
  try {
    console.log('🔍 Checking User Passwords...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Find first few users
    const users = await User.find({}).limit(5).select('name email password role');
    
    console.log(`\n📋 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      if (user.password) {
        console.log(`   Password Hash: ${user.password.substring(0, 30)}...`);
      }
    });
    
    // Check if any user has no password
    const usersWithoutPassword = await User.find({ password: { $exists: false } }).count();
    const usersWithEmptyPassword = await User.find({ password: '' }).count();
    
    console.log(`\n📊 Statistics:`);
    console.log(`   Users without password field: ${usersWithoutPassword}`);
    console.log(`   Users with empty password: ${usersWithEmptyPassword}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkPasswords();