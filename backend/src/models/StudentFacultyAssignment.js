const mongoose = require('mongoose');

const studentFacultyAssignmentSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    trim: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    validate: {
      validator: async function(studentId) {
        const User = mongoose.model('User');
        const user = await User.findById(studentId);
        return user && user.role === 'student';
      },
      message: 'Referenced user must be a student'
    }
  },
  
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Faculty reference is required'],
    validate: {
      validator: async function(facultyId) {
        const User = mongoose.model('User');
        const user = await User.findById(facultyId);
        return user && user.role === 'faculty';
      },
      message: 'Referenced user must be faculty'
    }
  },
  
  academicYear: {
    type: Number,
    required: [true, 'Academic year is required'],
    min: [1, 'Academic year must be between 1 and 4'],
    max: [4, 'Academic year must be between 1 and 4'],
    validate: {
      validator: function(year) {
        return Number.isInteger(year) && year >= 1 && year <= 4;
      },
      message: 'Academic year must be an integer between 1 and 4'
    }
  },
  
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: {
      values: ['CS', 'ECE', 'ME', 'CE', 'EE', 'IT', 'CHE', 'Administration'],
      message: 'Invalid department code'
    },
    uppercase: true,
    trim: true
  },
  
  assignedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  
  assignmentSource: {
    type: String,
    enum: {
      values: ['automatic', 'manual', 'admin'],
      message: 'Assignment source must be automatic, manual, or admin'
    },
    default: 'automatic',
    required: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Optional metadata for tracking assignment changes
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.assignmentSource === 'manual' || this.assignmentSource === 'admin';
    }
  },
  
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
studentFacultyAssignmentSchema.index({ student: 1, faculty: 1 }); // Compound index for relationship queries
studentFacultyAssignmentSchema.index({ student: 1, isActive: 1 }); // Student's active assignments
studentFacultyAssignmentSchema.index({ faculty: 1, isActive: 1 }); // Faculty's active assignments
studentFacultyAssignmentSchema.index({ academicYear: 1, department: 1 }); // Year-department queries
studentFacultyAssignmentSchema.index({ assignedAt: -1 }); // Recent assignments
studentFacultyAssignmentSchema.index({ isActive: 1, createdAt: -1 }); // Active assignments by creation date

// Ensure unique active assignments between student and faculty
studentFacultyAssignmentSchema.index(
  { student: 1, faculty: 1, isActive: 1 },
  { 
    unique: true, 
    partialFilterExpression: { isActive: true },
    name: 'unique_active_assignment'
  }
);

// Compound index for efficient assignment lookups
studentFacultyAssignmentSchema.index({
  department: 1,
  academicYear: 1,
  isActive: 1
});

// Virtual for assignment duration
studentFacultyAssignmentSchema.virtual('assignmentDuration').get(function() {
  if (this.assignedAt) {
    const now = new Date();
    const diffTime = Math.abs(now - this.assignedAt);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return 0;
});

// Virtual for assignment status display
studentFacultyAssignmentSchema.virtual('statusDisplay').get(function() {
  return {
    isActive: this.isActive,
    source: this.assignmentSource,
    duration: this.assignmentDuration,
    lastUpdated: this.lastUpdated
  };
});

// Pre-save middleware to update lastUpdated timestamp
studentFacultyAssignmentSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// Pre-save middleware to validate student-faculty department matching
studentFacultyAssignmentSchema.pre('save', async function(next) {
  try {
    const User = mongoose.model('User');
    
    // Get student and faculty details
    const [student, faculty] = await Promise.all([
      User.findById(this.student).select('department academicYear role'),
      User.findById(this.faculty).select('department accessibleYears role')
    ]);
    
    if (!student || !faculty) {
      return next(new Error('Student or faculty not found'));
    }
    
    // Validate roles
    if (student.role !== 'student') {
      return next(new Error('Referenced student must have student role'));
    }
    
    if (faculty.role !== 'faculty') {
      return next(new Error('Referenced faculty must have faculty role'));
    }
    
    // Validate department matching
    if (student.department !== faculty.department) {
      return next(new Error('Student and faculty must be from the same department'));
    }
    
    // Validate academic year accessibility
    if (!faculty.accessibleYears || !faculty.accessibleYears.includes(student.academicYear)) {
      return next(new Error('Faculty does not have access to student\'s academic year'));
    }
    
    // Set assignment metadata from user data
    this.academicYear = student.academicYear;
    this.department = student.department;
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find student's assigned faculty
studentFacultyAssignmentSchema.statics.getStudentFaculty = function(studentId, includeInactive = false) {
  const query = { student: studentId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .populate('faculty', 'name email department accessibleYears avatar lastLogin')
    .sort({ assignedAt: -1 });
};

// Static method to find faculty's assigned students
studentFacultyAssignmentSchema.statics.getFacultyStudents = function(facultyId, includeInactive = false) {
  const query = { faculty: facultyId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .populate('student', 'name email department academicYear avatar lastLogin')
    .sort({ assignedAt: -1 });
};

// Static method to find assignments by year and department
studentFacultyAssignmentSchema.statics.getAssignmentsByYearDept = function(year, department, includeInactive = false) {
  const query = { academicYear: year, department: department };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return this.find(query)
    .populate('student', 'name email academicYear')
    .populate('faculty', 'name email accessibleYears')
    .sort({ assignedAt: -1 });
};

// Static method to get assignment statistics
studentFacultyAssignmentSchema.statics.getAssignmentStats = async function() {
  const stats = await this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: {
          department: '$department',
          academicYear: '$academicYear'
        },
        totalAssignments: { $sum: 1 },
        uniqueStudents: { $addToSet: '$student' },
        uniqueFaculty: { $addToSet: '$faculty' }
      }
    },
    {
      $project: {
        department: '$_id.department',
        academicYear: '$_id.academicYear',
        totalAssignments: 1,
        studentCount: { $size: '$uniqueStudents' },
        facultyCount: { $size: '$uniqueFaculty' },
        _id: 0
      }
    },
    {
      $sort: { department: 1, academicYear: 1 }
    }
  ]);
  
  return stats;
};

// Static method to find unassigned students
studentFacultyAssignmentSchema.statics.getUnassignedStudents = async function() {
  const User = mongoose.model('User');
  
  // Get all active students
  const allStudents = await User.find({ 
    role: 'student', 
    isActive: true 
  }).select('_id name email department academicYear');
  
  // Get students with active assignments
  const assignedStudentIds = await this.distinct('student', { isActive: true });
  
  // Filter out assigned students
  const unassignedStudents = allStudents.filter(
    student => !assignedStudentIds.some(id => id.equals(student._id))
  );
  
  return unassignedStudents;
};

// Static method to deactivate assignments
studentFacultyAssignmentSchema.statics.deactivateAssignments = function(query) {
  return this.updateMany(
    { ...query, isActive: true },
    { 
      isActive: false, 
      lastUpdated: new Date() 
    }
  );
};

// Static method to bulk create assignments
studentFacultyAssignmentSchema.statics.createBulkAssignments = async function(assignments) {
  // Validate all assignments before creating
  const validatedAssignments = [];
  
  for (const assignment of assignments) {
    try {
      const newAssignment = new this(assignment);
      await newAssignment.validate();
      validatedAssignments.push(assignment);
    } catch (error) {
      console.error(`Invalid assignment: ${error.message}`, assignment);
    }
  }
  
  if (validatedAssignments.length === 0) {
    throw new Error('No valid assignments to create');
  }
  
  return this.insertMany(validatedAssignments, { ordered: false });
};

// Instance method to deactivate this assignment
studentFacultyAssignmentSchema.methods.deactivate = function() {
  this.isActive = false;
  this.lastUpdated = new Date();
  return this.save();
};

// Instance method to reactivate this assignment
studentFacultyAssignmentSchema.methods.reactivate = function() {
  this.isActive = true;
  this.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.model('StudentFacultyAssignment', studentFacultyAssignmentSchema);