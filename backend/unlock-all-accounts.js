const mongoose = require('mongoose');
const User = require('./src/models/User');

async function unlockAllAccounts() {
  try {
    console.log('🔓 Unlocking All User Accounts...');
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    console.log('✅ Connected to MongoDB');
    
    // Reset login attempts and unlock all accounts
    const result = await User.updateMany(
      {},
      {
        $unset: { 
          loginAttempts: 1, 
          lockUntil: 1 
        }
      }
    );
    
    console.log(`✅ Unlocked ${result.modifiedCount} accounts`);
    console.log('✅ All login attempts reset');
    
    // Verify
    const lockedUsers = await User.find({ 
      lockUntil: { $exists: true, $gt: Date.now() } 
    });
    
    console.log(`\n📊 Currently locked accounts: ${lockedUsers.length}`);
    
    if (lockedUsers.length === 0) {
      console.log('🎉 All accounts are now unlocked!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

unlockAllAccounts();