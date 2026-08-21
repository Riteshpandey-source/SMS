const mongoose = require('mongoose');

async function getDBStats() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    // For each collection, count docs
    for (let c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`- ${c.name}: ${count}`);
      if (c.name === 'tenants') {
        const tenants = await db.collection('tenants').find({}).toArray();
        console.log("Tenants details:", JSON.stringify(tenants, null, 2));
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

getDBStats();
