const mongoose = require('mongoose');

async function getTenants() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campusbuddy');
    
    const db = mongoose.connection.db;
    
    // Use the tenants collection directly
    const tenants = await db.collection('tenants').find({}).toArray();
    
    console.log("Found Tenants:");
    tenants.forEach(t => {
      console.log(`- Tenant Name: ${t.name}`);
      console.log(`  Tenant Code: ${t.code}`);
      console.log(`  Subdomain: ${t.subdomain}`);
      console.log(`  _id: ${t._id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error("Error connecting to database:", error);
  } finally {
    mongoose.disconnect();
  }
}

getTenants();
