const mongoose = require('mongoose');
const { connectDB } = require('./database');
const User = require('../models/User');

// Production-ready seeding functions
const createDefaultAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return existingAdmin;
    }

    // Create default admin user
    const adminData = {
      name: process.env.DEFAULT_ADMIN_NAME || 'System Administrator',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@campusbuddy.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456',
      role: 'admin',
      department: 'Administration',
      isActive: true,
      isEmailVerified: true
    };

    const admin = new User(adminData);
    await admin.save();
    
    console.log('✅ Default admin user created');
    console.log(`   Email: ${admin.email}`);
    console.log('   ⚠️  Please change the default password after first login');
    
    return admin;
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
    throw error;
  }
};

// Seed users by creating only a bootstrap admin account
const seedUsers = async () => {
  try {
    console.log('👥 Seeding users...');

    await createDefaultAdmin();
    return true;
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    return false;
  }
};

// Seed events (placeholder for when Event model is implemented)
const seedEvents = async () => {
  try {
    console.log('📅 Event seeding will be implemented when Event model is ready');
    return true;
  } catch (error) {
    console.error('❌ Error seeding events:', error.message);
    return false;
  }
};

// Seed academic records (placeholder for when AcademicRecord model is implemented)
const seedAcademicRecords = async () => {
  try {
    console.log('📚 Academic records seeding will be implemented when AcademicRecord model is ready');
    return true;
  } catch (error) {
    console.error('❌ Error seeding academic records:', error.message);
    return false;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Connect to database
    await connectDB();
    
    // Seed data based on environment
    const results = {
      users: await seedUsers(),
      events: await seedEvents(),
      academicRecords: await seedAcademicRecords()
    };
    
    const successful = Object.values(results).every(result => result === true);
    
    if (successful) {
      console.log('✅ Database seeding completed successfully');
    } else {
      console.log('⚠️  Database seeding completed with some errors');
    }
    
    return successful;
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  }
};

// Clear database (development only)
const clearDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.error('❌ Database clearing is only allowed in development mode');
    return false;
  }
  
  try {
    console.log('🧹 Clearing database...');
    
    // Get all collections
    const collections = await mongoose.connection.db.collections();
    
    // Drop all collections
    for (let collection of collections) {
      try {
        await collection.drop();
        console.log(`   🗑️  Dropped collection: ${collection.collectionName}`);
      } catch (error) {
        // Collection might not exist, ignore error
        if (error.code !== 26) { // NamespaceNotFound
          console.log(`   ⚠️  Could not drop collection ${collection.collectionName}: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database cleared successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    return false;
  }
};

// Reset database (clear + seed)
const resetDatabase = async () => {
  if (process.env.NODE_ENV !== 'development') {
    console.error('❌ Database reset is only allowed in development mode');
    return false;
  }
  
  try {
    console.log('🔄 Resetting database...');
    
    const cleared = await clearDatabase();
    if (!cleared) {
      throw new Error('Failed to clear database');
    }
    
    const seeded = await seedDatabase();
    if (!seeded) {
      throw new Error('Failed to seed database');
    }
    
    console.log('✅ Database reset completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    return false;
  }
};

// Get database statistics
const getDatabaseStats = async () => {
  try {
    await connectDB();
    
    const stats = {
      users: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      adminUsers: await User.countDocuments({ role: 'admin' }),
      facultyUsers: await User.countDocuments({ role: 'faculty' }),
      studentUsers: await User.countDocuments({ role: 'student' })
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting database stats:', error.message);
    return null;
  }
};

module.exports = {
  seedDatabase,
  clearDatabase,
  resetDatabase,
  createDefaultAdmin,
  getDatabaseStats
};

// Run seeding if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'seed';
  
  const commands = {
    seed: seedDatabase,
    clear: clearDatabase,
    reset: resetDatabase,
    stats: async () => {
      const stats = await getDatabaseStats();
      if (stats) {
        console.log('📊 Database Statistics:');
        console.log(`   Total Users: ${stats.users}`);
        console.log(`   Active Users: ${stats.activeUsers}`);
        console.log(`   Admin Users: ${stats.adminUsers}`);
        console.log(`   Faculty Users: ${stats.facultyUsers}`);
        console.log(`   Student Users: ${stats.studentUsers}`);
      }
      return stats !== null;
    }
  };
  
  if (commands[command]) {
    commands[command]()
      .then((success) => {
        process.exit(success ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Command failed:', error.message);
        process.exit(1);
      });
  } else {
    console.error('❌ Unknown command. Available commands: seed, clear, reset, stats');
    process.exit(1);
  }
}
