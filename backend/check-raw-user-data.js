const mongoose = require('mongoose');

async function checkRawUserData() {
  try {
    console.log('🔍 Checking Raw User Data...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Get raw user data directly from collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ email: 'cs.student1@college.edu' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Raw User Data:');
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Has Password Field:', user.password ? 'Yes' : 'No');
    
    if (user.password) {
      console.log('   Password Hash:', user.password.substring(0, 30) + '...');
      console.log('   Password Length:', user.password.length);
    } else {
      console.log('   ❌ Password field is missing!');
    }
    
    // Check all fields
    console.log('\n📋 All Fields:');
    Object.keys(user).forEach(key => {
      console.log(`   ${key}: ${typeof user[key]} - ${user[key] ? 'Has Value' : 'Empty/Null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkRawUserData();