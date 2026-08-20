const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');

async function checkUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user named "ridam" (case insensitive)
    const user = await User.findOne({ 
      name: /ridam/i 
    });

    if (!user) {
      console.log('\n❌ User "ridam" not found!');
    } else {
      console.log('\n✅ User found:\n');
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Department: ${user.department}`);
      console.log(`Academic Year: ${user.academicYear}`);
      console.log(`ID: ${user._id}`);
      
      if (user.accessibleYears) {
        console.log(`Accessible Years: ${user.accessibleYears.join(', ')}`);
      }
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
