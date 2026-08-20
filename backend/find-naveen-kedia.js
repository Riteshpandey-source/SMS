const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect('mongodb://localhost:27017/campusbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function findNaveenKedia() {
  try {
    // Search for Naveen Kedia
    const naveen = await User.findOne({ 
      $or: [
        { name: /naveen.*kedia/i },
        { name: /kedia.*naveen/i },
        { email: /naveen/i }
      ]
    });

    if (naveen) {
      console.log('✅ Found Naveen Kedia:');
      console.log(`   Name: ${naveen.name}`);
      console.log(`   Email: ${naveen.email}`);
      console.log(`   Role: ${naveen.role}`);
      console.log(`   ID: ${naveen._id}`);
    } else {
      console.log('❌ Naveen Kedia not found in database\n');
      
      const allFaculty = await User.find({ role: 'faculty' }).select('name email');
      console.log('👨‍🏫 All Faculty in Database:');
      allFaculty.forEach((f, idx) => {
        console.log(`   ${idx + 1}. ${f.name} (${f.email})`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

findNaveenKedia();
