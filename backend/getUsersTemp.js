const mongoose = require('mongoose');

async function getUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    const db = mongoose.connection.db;
    
    const users = await db.collection('users').find({}).toArray();
    console.log(JSON.stringify(users, null, 2));
    
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

getUsers();
