const mongoose = require('mongoose');

// Subject schema for embedded subjects
const subjectSchema = new mongoose.Schema({
  subjectId: {
    type: String,
    required: [true, 'Subject ID is required']
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true,
    trim: true
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [6, 'Credits cannot exceed 6']
  },
  faculty: {
    type: String,
    required: [true, 'Faculty name is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL']
  }
}, { _id: false });

// Attendance record schema
const attendanceSchema = new mongoose.Schema({
  subjectId: {
    type: String,
    required: [true, 'Subject ID is required']
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required']
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true
  },
  totalClasses: {
    type: Number,
    required: [true, 'Total classes is required'],
    min: [0, 'Total classes cannot be negative'],
    default: 0
  },
  attendedClasses: {
    type: Number,
    required: [true, 'Attended classes is required'],
    min: [0, 'Attended classes cannot be negative'],
    default: 0,
    validate: {
      validator: function(value) {
        return value <= this.totalClasses;
      },
      message: 'Attended classes cannot exceed total classes'
    }
  },
  percentage: {
    type: Number,
    min: [0, 'Attendance percentage cannot be negative'],
    max: [100, 'Attendance percentage cannot exceed 100'],
    default: 0
  },
  requiredPercentage: {
    type: Number,
    default: 75,
    min: [0, 'Required percentage cannot be negative'],
    max: [100, 'Required percentage cannot exceed 100']
  },
  isDebarred: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Mid-term marks schema
const midTermMarksSchema = new mongoose.Schema({
  subjectId: {
    type: String,
    required: false // Made optional since we can generate from subjectCode
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required']
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true
  },
  maxMarks: {
    type: Number,
    required: [true, 'Maximum marks is required'],
    min: [1, 'Maximum marks must be at least 1']
  },
  obtainedMarks: {
    type: Number,
    required: [true, 'Obtained marks is required'],
    min: [0, 'Obtained marks cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.maxMarks;
      },
      message: 'Obtained marks cannot exceed maximum marks'
    }
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    uppercase: true
  },
  gradePoints: {
    type: Number,
    min: [0, 'Grade points cannot be negative'],
    max: [10, 'Grade points cannot exceed 10']
  },
  examDate: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  }
}, { _id: false });

// Final marks schema
const finalMarksSchema = new mongoose.Schema({
  subjectId: {
    type: String,
    required: [true, 'Subject ID is required']
  },
  subjectName: {
    type: String,
    required: [true, 'Subject name is required']
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1']
  },
  internalMarks: {
    type: Number,
    min: [0, 'Internal marks cannot be negative'],
    default: 0
  },
  externalMarks: {
    type: Number,
    min: [0, 'External marks cannot be negative'],
    default: 0
  },
  totalMarks: {
    type: Number,
    min: [0, 'Total marks cannot be negative']
  },
  maxMarks: {
    type: Number,
    required: [true, 'Maximum marks is required'],
    min: [1, 'Maximum marks must be at least 1']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    uppercase: true
  },
  gradePoints: {
    type: Number,
    min: [0, 'Grade points cannot be negative'],
    max: [10, 'Grade points cannot exceed 10']
  },
  passed: {
    type: Boolean,
    default: false
  },
  examDate: {
    type: Date
  }
}, { _id: false });

// Main Academic Record schema
const academicRecordSchema = new mongoose.Schema({
  // Multi-Tenant Identifier
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    trim: true
  },

  // Student reference
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  
  // Academic period information
  academicYear: {
    type: Number,
    required: [true, 'Academic year is required'],
    min: [1, 'Academic year must be at least 1'],
    max: [9999, 'Academic year must be a valid year']
  },
  
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true
  },
  
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['CS', 'ECE', 'ME', 'EE', 'IT', 'CSAI', 'AIDS', 'CIVIL']
  },
  
  // Academic performance metrics
  cgpa: {
    type: Number,
    min: [0, 'CGPA cannot be negative'],
    max: [10, 'CGPA cannot exceed 10'],
    default: 0
  },
  
  sgpa: {
    type: Number,
    min: [0, 'SGPA cannot be negative'],
    max: [10, 'SGPA cannot exceed 10'],
    default: 0
  },
  
  totalCredits: {
    type: Number,
    min: [0, 'Total credits cannot be negative'],
    default: 0
  },
  
  earnedCredits: {
    type: Number,
    min: [0, 'Earned credits cannot be negative'],
    default: 0
  },
  
  // Overall attendance
  overallAttendance: {
    type: Number,
    min: [0, 'Overall attendance cannot be negative'],
    max: [100, 'Overall attendance cannot exceed 100'],
    default: 0
  },
  
  // Debarment status
  isDebarred: {
    type: Boolean,
    default: false
  },
  
  debarredSubjects: [{
    type: String,
    trim: true
  }],

  // Manual debarments by faculty
  manualDebarments: {
    type: Map,
    of: {
      isDebarred: {
        type: Boolean,
        required: true
      },
      reason: {
        type: String,
        trim: true,
        maxlength: [200, 'Reason cannot exceed 200 characters']
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    },
    default: new Map()
  },
  
  // Enrolled subjects
  subjects: [subjectSchema],
  
  // Attendance records
  attendance: [attendanceSchema],
  
  // Mid-term marks
  midTermMarks: [midTermMarksSchema],
  
  // Final marks
  finalMarks: [finalMarksSchema],
  
  // Academic status
  academicStatus: {
    type: String,
    enum: ['active', 'probation', 'suspended', 'graduated', 'dropped'],
    default: 'active'
  },
  
  // Additional information
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  
  // Metadata
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
academicRecordSchema.index({ studentId: 1, academicYear: 1, semester: 1 }, { unique: true });
academicRecordSchema.index({ department: 1 });
academicRecordSchema.index({ academicYear: 1 });
academicRecordSchema.index({ isDebarred: 1 });
academicRecordSchema.index({ academicStatus: 1 });

// Virtual for attendance summary
academicRecordSchema.virtual('attendanceSummary').get(function() {
  if (!this.attendance || this.attendance.length === 0) {
    return {
      totalSubjects: 0,
      averageAttendance: 0,
      debarredCount: 0,
      criticalSubjects: []
    };
  }
  
  const totalSubjects = this.attendance.length;
  const totalPercentage = this.attendance.reduce((sum, att) => sum + att.percentage, 0);
  const averageAttendance = totalSubjects > 0 ? totalPercentage / totalSubjects : 0;
  const debarredCount = this.attendance.filter(att => att.isDebarred).length;
  const criticalSubjects = this.attendance
    .filter(att => att.percentage < att.requiredPercentage && att.percentage >= att.requiredPercentage - 5)
    .map(att => ({
      subjectCode: att.subjectCode,
      subjectName: att.subjectName,
      percentage: att.percentage,
      required: att.requiredPercentage
    }));
  
  return {
    totalSubjects,
    averageAttendance: Math.round(averageAttendance * 100) / 100,
    debarredCount,
    criticalSubjects
  };
});

// Virtual for marks summary
academicRecordSchema.virtual('marksSummary').get(function() {
  if (!this.midTermMarks || this.midTermMarks.length === 0) {
    return {
      totalSubjects: 0,
      averagePercentage: 0,
      averageGradePoints: 0,
      highestScore: null,
      lowestScore: null
    };
  }
  
  const totalSubjects = this.midTermMarks.length;
  const totalPercentage = this.midTermMarks.reduce((sum, mark) => sum + mark.percentage, 0);
  const totalGradePoints = this.midTermMarks.reduce((sum, mark) => sum + (mark.gradePoints || 0), 0);
  const averagePercentage = totalSubjects > 0 ? totalPercentage / totalSubjects : 0;
  const averageGradePoints = totalSubjects > 0 ? totalGradePoints / totalSubjects : 0;
  
  const sortedMarks = [...this.midTermMarks].sort((a, b) => b.percentage - a.percentage);
  const highestScore = sortedMarks[0] ? {
    subjectCode: sortedMarks[0].subjectCode,
    percentage: sortedMarks[0].percentage,
    grade: sortedMarks[0].grade
  } : null;
  
  const lowestScore = sortedMarks[sortedMarks.length - 1] ? {
    subjectCode: sortedMarks[sortedMarks.length - 1].subjectCode,
    percentage: sortedMarks[sortedMarks.length - 1].percentage,
    grade: sortedMarks[sortedMarks.length - 1].grade
  } : null;
  
  return {
    totalSubjects,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    averageGradePoints: Math.round(averageGradePoints * 100) / 100,
    highestScore,
    lowestScore
  };
});

// Pre-save middleware to calculate attendance percentages
academicRecordSchema.pre('save', function(next) {
  // Calculate attendance percentages
  this.attendance.forEach(att => {
    if (att.totalClasses > 0) {
      att.percentage = Math.round((att.attendedClasses / att.totalClasses) * 10000) / 100;
      att.isDebarred = att.percentage < att.requiredPercentage;
    } else {
      att.percentage = 0;
      att.isDebarred = false;
    }
    att.lastUpdated = new Date();
  });
  
  // Calculate overall attendance
  if (this.attendance.length > 0) {
    const totalPercentage = this.attendance.reduce((sum, att) => sum + att.percentage, 0);
    this.overallAttendance = Math.round((totalPercentage / this.attendance.length) * 100) / 100;
  }
  
  // Update debarment status
  this.debarredSubjects = this.attendance
    .filter(att => att.isDebarred)
    .map(att => att.subjectCode);
  this.isDebarred = this.debarredSubjects.length > 0;
  
  // Update academic status based on performance
  this.updateAcademicStatus();
  
  // Update last calculated timestamp
  this.lastCalculated = new Date();
  
  next();
});

// Pre-save middleware to calculate marks percentages and grades
academicRecordSchema.pre('save', function(next) {
  // Calculate mid-term marks percentages and grades
  this.midTermMarks.forEach(mark => {
    // Generate subjectId if missing
    if (!mark.subjectId && mark.subjectCode) {
      mark.subjectId = mark.subjectCode;
    }
    
    if (mark.maxMarks > 0) {
      mark.percentage = Math.round((mark.obtainedMarks / mark.maxMarks) * 10000) / 100;
      mark.grade = this.calculateGrade(mark.percentage);
      mark.gradePoints = this.getGradePoints(mark.grade);
    }
  });
  
  // Calculate final marks
  this.finalMarks.forEach(mark => {
    mark.totalMarks = mark.internalMarks + mark.externalMarks;
    if (mark.maxMarks > 0) {
      mark.percentage = Math.round((mark.totalMarks / mark.maxMarks) * 10000) / 100;
      mark.grade = this.calculateGrade(mark.percentage);
      mark.gradePoints = this.getGradePoints(mark.grade);
      mark.passed = mark.percentage >= 40; // Assuming 40% is passing
    }
  });
  
  this.lastCalculated = new Date();
  next();
});

// Instance method to calculate grade from percentage
academicRecordSchema.methods.calculateGrade = function(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 40) return 'D';
  return 'F';
};

// Instance method to get grade points from grade
academicRecordSchema.methods.getGradePoints = function(grade) {
  const gradePointsMap = {
    'A+': 10, 'A': 9, 'A-': 8.5,
    'B+': 8, 'B': 7, 'B-': 6.5,
    'C+': 6, 'C': 5, 'C-': 4.5,
    'D': 4, 'F': 0
  };
  return gradePointsMap[grade] || 0;
};

// Instance method to calculate SGPA
academicRecordSchema.methods.calculateSGPA = function() {
  if (!this.finalMarks || this.finalMarks.length === 0) {
    return 0;
  }
  
  let totalGradePoints = 0;
  let totalCredits = 0;
  
  this.finalMarks.forEach(mark => {
    const subject = this.subjects.find(s => s.subjectId === mark.subjectId);
    if (subject && mark.gradePoints !== undefined) {
      totalGradePoints += mark.gradePoints * subject.credits;
      totalCredits += subject.credits;
    }
  });
  
  return totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
};

// Instance method to update academic status based on performance
academicRecordSchema.methods.updateAcademicStatus = function() {
  const currentCGPA = this.cgpa || 0;
  const debarredCount = this.debarredSubjects.length;
  const overallAttendance = this.overallAttendance || 0;
  
  // Business logic for academic status
  if (debarredCount >= 3 || overallAttendance < 50) {
    this.academicStatus = 'suspended';
  } else if (debarredCount >= 1 || currentCGPA < 5.0 || overallAttendance < 75) {
    this.academicStatus = 'probation';
  } else if (currentCGPA >= 8.0 && overallAttendance >= 90) {
    this.academicStatus = 'active';
  } else {
    this.academicStatus = 'active';
  }
  
  return this.academicStatus;
};

// Instance method to validate marks entry
academicRecordSchema.methods.validateMarksEntry = function(subjectId, obtainedMarks, maxMarks) {
  // Check if subject exists in enrolled subjects
  const subject = this.subjects.find(s => s.subjectId === subjectId);
  if (!subject) {
    throw new Error(`Subject ${subjectId} is not enrolled for this student`);
  }
  
  // Validate marks range
  if (obtainedMarks < 0 || obtainedMarks > maxMarks) {
    throw new Error(`Marks must be between 0 and ${maxMarks}`);
  }
  
  // Check if marks already exist for this subject
  const existingMark = this.midTermMarks.find(mark => mark.subjectId === subjectId);
  if (existingMark) {
    console.warn(`Marks already exist for subject ${subjectId}. Will be updated.`);
  }
  
  return true;
};

// Instance method to calculate attendance deficit
academicRecordSchema.methods.calculateAttendanceDeficit = function(subjectId) {
  const attendance = this.attendance.find(att => att.subjectCode === subjectId);
  if (!attendance) {
    return null;
  }
  
  const required = attendance.requiredPercentage;
  const current = attendance.percentage;
  
  if (current >= required) {
    return { deficit: 0, classesNeeded: 0, status: 'sufficient' };
  }
  
  const totalClasses = attendance.totalClasses;
  const attendedClasses = attendance.attendedClasses;
  
  // Calculate how many additional classes needed to reach required percentage
  const classesNeeded = Math.ceil(
    (required * totalClasses - 100 * attendedClasses) / (100 - required)
  );
  
  return {
    deficit: Math.round((required - current) * 100) / 100,
    classesNeeded: Math.max(0, classesNeeded),
    status: 'deficit'
  };
};

// Instance method to check eligibility for exams
academicRecordSchema.methods.checkExamEligibility = function() {
  const debarredSubjects = this.debarredSubjects || [];
  const eligibleSubjects = [];
  const ineligibleSubjects = [];
  
  this.subjects.forEach(subject => {
    if (debarredSubjects.includes(subject.subjectCode)) {
      ineligibleSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        reason: 'Attendance below required percentage'
      });
    } else {
      eligibleSubjects.push({
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName
      });
    }
  });
  
  return {
    isEligible: ineligibleSubjects.length === 0,
    eligibleSubjects,
    ineligibleSubjects,
    totalSubjects: this.subjects.length,
    eligibleCount: eligibleSubjects.length,
    ineligibleCount: ineligibleSubjects.length
  };
};

// Instance method to update attendance
academicRecordSchema.methods.updateAttendance = function(subjectId, attendedClasses, totalClasses, subjectCode, subjectName) {
  const attendanceRecord = this.attendance.find(att => att.subjectId === subjectId);
  
  if (attendanceRecord) {
    attendanceRecord.attendedClasses = attendedClasses;
    attendanceRecord.totalClasses = totalClasses;
    // Update subject info if provided
    if (subjectCode) attendanceRecord.subjectCode = subjectCode;
    if (subjectName) attendanceRecord.subjectName = subjectName;
  } else {
    // Try to find subject info from subjects array first, then use provided params
    const subject = this.subjects?.find(s => s.subjectId === subjectId);
    
    this.attendance.push({
      subjectId,
      subjectName: subjectName || subject?.subjectName || `Subject ${subjectId}`,
      subjectCode: subjectCode || subject?.subjectCode || subjectId,
      attendedClasses,
      totalClasses,
      requiredPercentage: 75
    });
  }
  
  return this.save();
};

// Instance method to delete attendance record
academicRecordSchema.methods.deleteAttendance = function(subjectId) {
  this.attendance = this.attendance.filter(att => att.subjectId !== subjectId);
  return this.save();
};

// Instance method to add or update marks
academicRecordSchema.methods.updateMidTermMarks = function(subjectId, obtainedMarks, maxMarks, examDate, remarks) {
  const marksRecord = this.midTermMarks.find(mark => mark.subjectId === subjectId);
  const subject = this.subjects.find(s => s.subjectId === subjectId);
  
  if (!subject) {
    throw new Error('Subject not found in enrolled subjects');
  }
  
  const marksData = {
    subjectId,
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    obtainedMarks,
    maxMarks,
    examDate: examDate || new Date(),
    remarks: remarks || ''
  };
  
  if (marksRecord) {
    Object.assign(marksRecord, marksData);
  } else {
    this.midTermMarks.push(marksData);
  }
  
  return this.save();
};

// Static method to find by student and academic period
academicRecordSchema.statics.findByStudentAndPeriod = function(studentId, academicYear, semester) {
  return this.findOne({ studentId, academicYear, semester });
};

// Static method to get class statistics
academicRecordSchema.statics.getClassStatistics = function(department, academicYear, semester) {
  return this.aggregate([
    { $match: { department, academicYear, semester } },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        averageCGPA: { $avg: '$cgpa' },
        averageSGPA: { $avg: '$sgpa' },
        averageAttendance: { $avg: '$overallAttendance' },
        debarredCount: { $sum: { $cond: ['$isDebarred', 1, 0] } }
      }
    }
  ]);
};

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);