const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusbuddy');

const Note = require('../src/models/Note');
const User = require('../src/models/User');

async function addSampleNotes() {
  try {
    console.log('Adding sample notes...');

    // Find or create a sample admin user
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@campusbuddy.com',
        password: 'password123',
        role: 'admin',
        department: 'Administration',
        isActive: true
      });
      await adminUser.save();
      console.log('Created admin user');
    }

    // Find or create a sample faculty user
    let facultyUser = await User.findOne({ role: 'faculty', department: 'CS' });
    if (!facultyUser) {
      facultyUser = new User({
        name: 'Dr. John Smith',
        email: 'john.smith@campusbuddy.com',
        password: 'password123',
        role: 'faculty',
        department: 'CS',
        accessibleYears: [1, 2, 3, 4],
        isActive: true
      });
      await facultyUser.save();
      console.log('Created faculty user');
    }

    // Sample notes data
    const sampleNotes = [
      {
        title: 'Introduction to Programming',
        description: 'Basic programming concepts for beginners',
        filename: 'intro-programming.pdf',
        originalName: 'Introduction to Programming.pdf',
        filePath: '/uploads/notes/intro-programming.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        subject: 'Programming',
        department: 'CS',
        academicYear: [1],
        category: 'lecture',
        tags: ['programming', 'basics', 'introduction'],
        uploadedBy: adminUser._id,
        uploaderRole: 'admin',
        isPublic: true,
        isApproved: true,
        status: 'active'
      },
      {
        title: 'Data Structures and Algorithms',
        description: 'Comprehensive guide to DSA concepts',
        filename: 'dsa-guide.pdf',
        originalName: 'Data Structures and Algorithms.pdf',
        filePath: '/uploads/notes/dsa-guide.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf',
        subject: 'Data Structures',
        department: 'CS',
        academicYear: [2, 3],
        category: 'lecture',
        tags: ['algorithms', 'data-structures', 'programming'],
        uploadedBy: facultyUser._id,
        uploaderRole: 'faculty',
        isPublic: true,
        isApproved: true,
        status: 'active'
      },
      {
        title: 'Database Management Systems',
        description: 'Complete DBMS notes with SQL examples',
        filename: 'dbms-notes.pdf',
        originalName: 'Database Management Systems.pdf',
        filePath: '/uploads/notes/dbms-notes.pdf',
        fileSize: 1536000,
        mimeType: 'application/pdf',
        subject: 'Database Systems',
        department: 'CS',
        academicYear: [3, 4],
        category: 'lecture',
        tags: ['database', 'sql', 'dbms'],
        uploadedBy: adminUser._id,
        uploaderRole: 'admin',
        isPublic: true,
        isApproved: true,
        status: 'active'
      },
      {
        title: 'Web Development Basics',
        description: 'HTML, CSS, and JavaScript fundamentals',
        filename: 'web-dev-basics.pdf',
        originalName: 'Web Development Basics.pdf',
        filePath: '/uploads/notes/web-dev-basics.pdf',
        fileSize: 1792000,
        mimeType: 'application/pdf',
        subject: 'Web Development',
        department: 'CS',
        academicYear: [2],
        category: 'lecture',
        tags: ['html', 'css', 'javascript', 'web'],
        uploadedBy: facultyUser._id,
        uploaderRole: 'faculty',
        isPublic: true,
        isApproved: true,
        status: 'active'
      }
    ];

    // Clear existing notes
    await Note.deleteMany({});
    console.log('Cleared existing notes');

    // Insert sample notes
    const insertedNotes = await Note.insertMany(sampleNotes);
    console.log(`Inserted ${insertedNotes.length} sample notes`);

    // Log the inserted notes
    insertedNotes.forEach(note => {
      console.log(`- ${note.title} (${note.department}, Year ${note.academicYear.join(', ')}) by ${note.uploaderRole}`);
    });

    console.log('Sample notes added successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error adding sample notes:', error);
    process.exit(1);
  }
}

addSampleNotes();