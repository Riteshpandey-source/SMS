const mongoose = require('mongoose');

async function getAttendances() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    const db = mongoose.connection.db;
    
    const attendances = await db.collection('dailyattendances').find({}).limit(1).toArray();
    console.log(JSON.stringify(attendances, null, 2));
    
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

getAttendances();
