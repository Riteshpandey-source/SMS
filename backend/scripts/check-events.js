const mongoose = require('mongoose');
require('dotenv').config();

const Event = require('../src/models/Event');
const User = require('../src/models/User');

async function checkEvents() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const events = await Event.find({})
      .populate('organizer', 'name role department')
      .sort({ createdAt: -1 });

    console.log(`\n📊 Total events in database: ${events.length}\n`);

    if (events.length === 0) {
      console.log('❌ No events found in database!');
      console.log('\n💡 You need to create some events first.');
      console.log('   - Login as faculty or admin');
      console.log('   - Go to Events page');
      console.log('   - Click "Add Event" button');
    } else {
      console.log('✅ Events found:\n');
      events.forEach((event, index) => {
        console.log(`${index + 1}. ${event.title}`);
        console.log(`   - Organizer: ${event.organizer?.name || 'Unknown'} (${event.organizerRole})`);
        console.log(`   - Date: ${event.date.toLocaleDateString()}`);
        console.log(`   - Status: ${event.status}`);
        console.log(`   - Category: ${event.category}`);
        console.log(`   - Target Departments: ${event.targetDepartments.join(', ')}`);
        console.log(`   - Target Years: ${event.targetAcademicYears.join(', ')}`);
        console.log(`   - Location: ${event.location}`);
        console.log('');
      });
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEvents();
