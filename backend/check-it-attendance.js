const mongoose = require('mongoose');
const DailyAttendance = require('./src/models/DailyAttendance');

async function checkITAttendance() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    
    const total = await DailyAttendance.countDocuments({ department: 'IT' });
    console.log('✅ Total IT Daily Attendance Sessions:', total);
    
    const byYear = await DailyAttendance.aggregate([
      { $match: { department: 'IT' }},
      { $group: { _id: '$academicYear', count: { $sum: 1 }}},
      { $sort: { _id: 1 }}
    ]);
    
    console.log('\n📊 By Year:');
    byYear.forEach(item => {
      console.log(`   Year ${item._id}: ${item.count} sessions`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkITAttendance();