const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createShamUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'sham@gmail.com' });
    
    if (existingUser) {
      console.log('⚠️  User already exists!');
      console.log('📧 Email:', existingUser.email);
      console.log('👤 Name:', existingUser.name);
      console.log('🎭 Role:', existingUser.role);
      console.log('🏢 Department:', existingUser.department);
      console.log('\n🔄 Updating password...');
      
      // Update password
      existingUser.password = 'Ritesh@18';
      existingUser.loginAttempts = undefined;
      existingUser.lockUntil = undefined;
      await existingUser.save();
      
      console.log('✅ Password updated to: Ritesh@18');
      console.log('✅ Account unlocked');
    } else {
      console.log('➕ Creating new user...\n');
      
      // Create new user
      const newUser = new User({
        name: 'Sham',
        email: 'sham@gmail.com',
        password: 'Ritesh@18',
        role: 'student', // Change to 'faculty' or 'admin' if needed
        department: 'CS', // Change department as needed
        academicYear: 1, // Change year as needed
        isActive: true,
        isEmailVerified: true
      });

      await newUser.save();
      
      console.log('✅ User created successfully!');
      console.log('📧 Email: sham@gmail.com');
      console.log('🔑 Password: Ritesh@18');
      console.log('👤 Name: Sham');
      console.log('🎭 Role: student');
      console.log('🏢 Department: CS');
      console.log('📚 Year: 1');
    }

    console.log('\n🧪 Testing login...');
    const testUser = await User.findByCredentials('sham@gmail.com', 'Ritesh@18');
    console.log('✅ Login test successful!');
    console.log('👤 Logged in as:', testUser.name);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createShamUser();
