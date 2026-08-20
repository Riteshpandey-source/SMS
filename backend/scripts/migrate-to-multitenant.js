/**
 * Migration Script: Single-Tenant → Multi-Tenant
 * 
 * This script:
 * 1. Creates a default tenant ("Demo Institution" / tenant_001)
 * 2. Creates a Subscription for the default tenant
 * 3. Updates ALL existing documents across ALL collections to include tenantId: "tenant_001"
 * 4. Creates a Super Admin user (superadmin@campusbuddy.com)
 * 5. Promotes existing "admin" users to "institution_admin"
 * 
 * Run: node backend/scripts/migrate-to-multitenant.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const DEFAULT_TENANT_ID = 'tenant_001';
const SUPER_ADMIN_EMAIL = 'superadmin@campusbuddy.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';

async function migrate() {
  const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusbuddy_dev';
  
  console.log('='.repeat(60));
  console.log('  CampusBuddy Multi-Tenant Migration');
  console.log('='.repeat(60));
  console.log(`\nConnecting to: ${dbUri}`);
  
  await mongoose.connect(dbUri);
  console.log('✓ Connected to MongoDB\n');
  
  const db = mongoose.connection.db;
  
  // ── Step 1: Create Default Tenant ──
  console.log('─── Step 1: Create Default Tenant ───');
  const tenantsCollection = db.collection('tenants');
  
  const existingTenant = await tenantsCollection.findOne({ tenantId: DEFAULT_TENANT_ID });
  if (existingTenant) {
    console.log(`  ⚠ Tenant "${DEFAULT_TENANT_ID}" already exists. Skipping creation.`);
  } else {
    await tenantsCollection.insertOne({
      tenantId: DEFAULT_TENANT_ID,
      name: 'Demo Institution',
      code: 'DEMO',
      type: 'college',
      email: 'admin@demo-institution.edu',
      phone: '',
      domain: 'demo-institution.edu',
      subdomain: 'demo',
      logo: null,
      primaryColor: '#0B1220',
      address: {
        street: '',
        city: 'Jaipur',
        state: 'Rajasthan',
        country: 'India',
        pincode: ''
      },
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      plan: 'professional',
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      studentLimit: 2000,
      facultyLimit: 200,
      status: 'active',
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 8,
      departments: [
        { code: 'CS', name: 'Computer Science', isActive: true },
        { code: 'ECE', name: 'Electronics & Communication', isActive: true },
        { code: 'ME', name: 'Mechanical Engineering', isActive: true },
        { code: 'EE', name: 'Electrical Engineering', isActive: true },
        { code: 'IT', name: 'Information Technology', isActive: true },
        { code: 'CSAI', name: 'CS - Artificial Intelligence', isActive: true },
        { code: 'AIDS', name: 'AI & Data Science', isActive: true },
        { code: 'CIVIL', name: 'Civil Engineering', isActive: true }
      ],
      academicYearConfig: { startMonth: 7, endMonth: 6, maxYears: 4 },
      courses: [],
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  ✓ Created default tenant: "${DEFAULT_TENANT_ID}" (Demo Institution)`);
  }
  
  // ── Step 2: Create Subscription ──
  console.log('\n─── Step 2: Create Subscription ───');
  const subscriptionsCollection = db.collection('subscriptions');
  
  const existingSub = await subscriptionsCollection.findOne({ tenantId: DEFAULT_TENANT_ID });
  if (existingSub) {
    console.log(`  ⚠ Subscription for "${DEFAULT_TENANT_ID}" already exists. Skipping.`);
  } else {
    await subscriptionsCollection.insertOne({
      tenantId: DEFAULT_TENANT_ID,
      plan: 'professional',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      studentLimit: 2000,
      facultyLimit: 200,
      features: ['attendance', 'marks', 'events', 'notes', 'timetable', 'analytics', 'reports', 'bulk-import', 'api-access'],
      billingEmail: 'admin@demo-institution.edu',
      pricePerMonth: 4999,
      currency: 'INR',
      previousPlan: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  ✓ Created subscription for "${DEFAULT_TENANT_ID}"`);
  }
  
  // ── Step 3: Add tenantId to ALL existing documents ──
  console.log('\n─── Step 3: Migrate Existing Data ───');
  
  const collectionsToMigrate = [
    'users',
    'events',
    'notes',
    'dailyattendances',
    'exammarks',
    'studentfacultyassignments',
    'academicrecords',
    'routines',
    'notifications',
    'questions',
    'answers',
    'auditlogs'
  ];
  
  for (const collName of collectionsToMigrate) {
    try {
      const coll = db.collection(collName);
      const countWithout = await coll.countDocuments({ tenantId: { $exists: false } });
      const countNull = await coll.countDocuments({ tenantId: null });
      const countEmpty = await coll.countDocuments({ tenantId: '' });
      const total = countWithout + countNull + countEmpty;
      
      if (total > 0) {
        const result = await coll.updateMany(
          { $or: [{ tenantId: { $exists: false } }, { tenantId: null }, { tenantId: '' }] },
          { $set: { tenantId: DEFAULT_TENANT_ID } }
        );
        console.log(`  ✓ ${collName}: ${result.modifiedCount} documents updated`);
      } else {
        const existing = await coll.countDocuments({});
        console.log(`  ○ ${collName}: ${existing} documents (already migrated or empty)`);
      }
    } catch (err) {
      // Collection might not exist yet
      console.log(`  ○ ${collName}: collection does not exist (skipping)`);
    }
  }
  
  // ── Step 4: Create Super Admin ──
  console.log('\n─── Step 4: Create Super Admin ───');
  const usersCollection = db.collection('users');
  
  const existingSuperAdmin = await usersCollection.findOne({ email: SUPER_ADMIN_EMAIL });
  if (existingSuperAdmin) {
    console.log(`  ⚠ Super Admin "${SUPER_ADMIN_EMAIL}" already exists. Skipping.`);
  } else {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, salt);
    
    await usersCollection.insertOne({
      tenantId: 'platform',
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'super_admin',
      department: 'Administration',
      isActive: true,
      isEmailVerified: true,
      loginAttempts: 0,
      reputation: 0,
      lastActivity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  ✓ Created Super Admin: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`);
  }
  
  // ── Step 5: Promote existing admins to institution_admin ──
  console.log('\n─── Step 5: Promote Admins ───');
  
  const adminResult = await usersCollection.updateMany(
    { role: 'admin', email: { $ne: SUPER_ADMIN_EMAIL } },
    { $set: { role: 'institution_admin' } }
  );
  
  if (adminResult.modifiedCount > 0) {
    console.log(`  ✓ Promoted ${adminResult.modifiedCount} admin(s) to institution_admin`);
  } else {
    console.log(`  ○ No admins to promote (0 found with role "admin")`);
  }
  
  // ── Step 6: Remove old unique email index (if exists) ──
  console.log('\n─── Step 6: Update Indexes ───');
  try {
    const indexes = await usersCollection.indexes();
    const emailOnlyIndex = indexes.find(idx => 
      idx.key && idx.key.email === 1 && !idx.key.tenantId && idx.unique
    );
    
    if (emailOnlyIndex) {
      await usersCollection.dropIndex(emailOnlyIndex.name);
      console.log(`  ✓ Dropped old unique email index: ${emailOnlyIndex.name}`);
    } else {
      console.log(`  ○ No old unique email-only index found`);
    }
    
    // Create compound unique index
    try {
      await usersCollection.createIndex({ email: 1, tenantId: 1 }, { unique: true });
      console.log(`  ✓ Created compound unique index: { email: 1, tenantId: 1 }`);
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log(`  ○ Compound index already exists`);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.log(`  ⚠ Index update error: ${err.message}`);
  }
  
  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log('  Migration Complete!');
  console.log('='.repeat(60));
  
  const totalUsers = await usersCollection.countDocuments({});
  const tenantUsers = await usersCollection.countDocuments({ tenantId: DEFAULT_TENANT_ID });
  const superAdmins = await usersCollection.countDocuments({ role: 'super_admin' });
  const instAdmins = await usersCollection.countDocuments({ role: 'institution_admin' });
  
  console.log(`\n  Total Users:           ${totalUsers}`);
  console.log(`  Users in ${DEFAULT_TENANT_ID}:  ${tenantUsers}`);
  console.log(`  Super Admins:          ${superAdmins}`);
  console.log(`  Institution Admins:    ${instAdmins}`);
  console.log(`\n  Super Admin Login:`);
  console.log(`    Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`    Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log('');
  
  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB');
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n✗ Migration failed:', err);
  process.exit(1);
});
