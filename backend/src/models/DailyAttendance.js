const mongoose = require('mongoose');

const resolveAttendanceStudentKey = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (typeof value.toString === 'function' && value.toString() !== '[object Object]') {
      return value.toString();
    }
  }
  return '';
};

// Daily attendance record schema
const dailyAttendanceSchema = new mongoose.Schema({
  // Multi-Tenant Identifier
  tenantId: {
    type: String,
    required: [true, 'Tenant ID is required'],
    index: true,
    trim: true
  },

  // Date for which attendance is being marked
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },

  // Subject information
  subjectId: {
    type: String,
    required: [true, 'Subject ID is required'],
    index: true
  },

  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true,
    trim: true
  },

  subjectName: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },

  // Faculty who marked the attendance
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Faculty ID is required'],
    index: true
  },

  facultyName: {
    type: String,
    required: [true, 'Faculty name is required'],
    trim: true
  },

  // Academic information
  department: {
    type: String,
    required: [true, 'Department is required'],
    index: true
  },

  academicYear: {
    type: Number,
    required: [true, 'Academic year is required'],
    min: [1, 'Academic year must be at least 1'],
    max: [4, 'Academic year must be at most 4'],
    index: true
  },

  semester: {
    type: String,
    required: [true, 'Semester is required'],
    default: 'current'
  },

  // Class timing information
  classStartTime: {
    type: String,
    required: [true, 'Class start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },

  classEndTime: {
    type: String,
    required: [true, 'Class end time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide valid time format (HH:MM)']
  },

  // Student attendance records for this class
  studentAttendance: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false  // Changed to false to allow guest students
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    studentEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    rollNumber: {
      type: String,
      trim: true
    },
    isGuest: {
      type: Boolean,
      default: false  // True if student is not in database (manually added)
    },
    isPresent: {
      type: Boolean,
      default: true // By default all students are present
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [100, 'Remarks cannot exceed 100 characters']
    }
  }],

  // Summary statistics
  totalStudents: {
    type: Number,
    default: 0
  },

  presentCount: {
    type: Number,
    default: 0
  },

  absentCount: {
    type: Number,
    default: 0
  },

  attendancePercentage: {
    type: Number,
    min: [0, 'Attendance percentage cannot be negative'],
    max: [100, 'Attendance percentage cannot exceed 100'],
    default: 100
  },

  // Status of attendance marking
  status: {
    type: String,
    enum: ['draft', 'submitted', 'locked'],
    default: 'draft'
  },

  // Additional information
  classType: {
    type: String,
    enum: ['lecture', 'practical', 'tutorial', 'seminar', 'exam'],
    default: 'lecture'
  },

  location: {
    type: String,
    trim: true,
    maxlength: [50, 'Location cannot exceed 50 characters']
  },

  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  },

  // Metadata
  submittedAt: {
    type: Date
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
dailyAttendanceSchema.index({ date: 1, subjectId: 1, department: 1, academicYear: 1 });
dailyAttendanceSchema.index({ facultyId: 1, date: -1 });
dailyAttendanceSchema.index({ 'studentAttendance.studentId': 1, date: -1 });
dailyAttendanceSchema.index({ department: 1, academicYear: 1, date: -1 });
dailyAttendanceSchema.index({ tenantId: 1, date: -1 });

// Unique constraint to prevent duplicate attendance for same subject on same date
// Include facultyId so two different faculty can run classes for same subject/time without clashing
dailyAttendanceSchema.index(
  { date: 1, subjectId: 1, classStartTime: 1, facultyId: 1 },
  { unique: true, name: 'date_subject_time_faculty_unique' }
);

// Virtual for formatted date
dailyAttendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for class duration
dailyAttendanceSchema.virtual('classDuration').get(function() {
  const start = new Date(`1970-01-01T${this.classStartTime}:00`);
  const end = new Date(`1970-01-01T${this.classEndTime}:00`);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Pre-save middleware to calculate statistics
dailyAttendanceSchema.pre('save', function(next) {
  // Calculate attendance statistics
  this.totalStudents = this.studentAttendance.length;
  this.presentCount = this.studentAttendance.filter(s => s.isPresent).length;
  this.absentCount = this.totalStudents - this.presentCount;

  // Calculate attendance percentage
  if (this.totalStudents > 0) {
    this.attendancePercentage = Math.round((this.presentCount / this.totalStudents) * 10000) / 100;
  } else {
    this.attendancePercentage = 0;
  }

  // Update submitted timestamp if status changed to submitted
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }

  next();
});

// Instance method to mark student attendance
dailyAttendanceSchema.methods.markStudentAttendance = function(studentId, isPresent, markedBy, remarks = '') {
  // Find student by studentId (for regular students) or by email (for guest students)
  const studentRecord = this.studentAttendance.find(s => {
    // For guest students, studentId might be null, so we need to match by email or index
    if (s.studentId && studentId) {
      return s.studentId.toString() === studentId.toString();
    }
    // For guest students without studentId, match by the studentId being passed as email
    if (s.isGuest && !s.studentId) {
      return s.studentEmail === studentId || s._id.toString() === studentId.toString();
    }
    return false;
  });

  if (studentRecord) {
    studentRecord.isPresent = isPresent;
    studentRecord.markedAt = new Date();
    studentRecord.markedBy = markedBy;
    studentRecord.remarks = remarks;
  } else {
    throw new Error('Student not found in attendance list');
  }

  return this.save();
};

// Instance method to bulk mark attendance
dailyAttendanceSchema.methods.bulkMarkAttendance = function(attendanceData, markedBy) {
  let updatedCount = 0;

  attendanceData.forEach(({ entryId, studentId, studentEmail, isPresent, remarks }) => {
    const targetKey = resolveAttendanceStudentKey(studentId);
    const targetEntryKey = resolveAttendanceStudentKey(entryId);
    const studentRecord = this.studentAttendance.find((s) => {
      const recordEntryKey = resolveAttendanceStudentKey(s._id);
      const recordStudentKey = resolveAttendanceStudentKey(s.studentId);
      const recordEmailKey = (s.studentEmail || '').toLowerCase();
      const lookupEmailKey = (studentEmail || '').toLowerCase();
      const recordFallbackKey = recordEmailKey || resolveAttendanceStudentKey(s._id);

      return (
        (targetEntryKey && recordEntryKey === targetEntryKey) ||
        (targetKey && (recordStudentKey === targetKey || recordFallbackKey === targetKey)) ||
        (lookupEmailKey && recordEmailKey === lookupEmailKey)
      );
    });

    if (studentRecord) {
      studentRecord.isPresent = isPresent;
      studentRecord.markedAt = new Date();
      studentRecord.markedBy = markedBy;
      studentRecord.remarks = remarks || '';
      updatedCount += 1;
    }
  });

  if (updatedCount === 0 && attendanceData.length > 0) {
    throw new Error('No matching students found while updating attendance');
  }

  return this.save();
};

// Instance method to add student to attendance
dailyAttendanceSchema.methods.addStudent = function(studentData, markedBy) {
  const existingStudent = this.studentAttendance.find(s =>
    s.studentId.toString() === studentData.studentId.toString()
  );

  if (existingStudent) {
    throw new Error('Student already exists in attendance list');
  }

  this.studentAttendance.push({
    studentId: studentData.studentId,
    studentName: studentData.studentName,
    studentEmail: studentData.studentEmail,
    rollNumber: studentData.rollNumber,
    isPresent: true, // Default present
    markedBy: markedBy,
    remarks: ''
  });

  return this.save();
};

// Instance method to remove student from attendance
dailyAttendanceSchema.methods.removeStudent = function(studentId) {
  this.studentAttendance = this.studentAttendance.filter(s =>
    s.studentId.toString() !== studentId.toString()
  );

  return this.save();
};

// Instance method to submit attendance
dailyAttendanceSchema.methods.submitAttendance = function(submittedBy) {
  if (this.status === 'locked') {
    throw new Error('Cannot modify locked attendance');
  }

  this.status = 'submitted';
  this.submittedAt = new Date();
  this.lastModifiedBy = submittedBy;

  return this.save();
};

// Static method to get attendance for a student
dailyAttendanceSchema.statics.getStudentAttendance = function(studentId, filters = {}) {
  const query = {};
  const normalizedStudentId = resolveAttendanceStudentKey(studentId);
  const orConditions = [];

  if (mongoose.isValidObjectId(normalizedStudentId)) {
    orConditions.push({ 'studentAttendance.studentId': normalizedStudentId });
  }

  if (filters.studentEmail) {
    orConditions.push({ 'studentAttendance.studentEmail': filters.studentEmail.toLowerCase() });
  }

  if (!orConditions.length) {
    return Promise.resolve([]);
  }

  query.$or = orConditions;

  // Add date range filter
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  // Add subject filter
  if (filters.subjectCode) {
    query.subjectCode = filters.subjectCode.toUpperCase();
  }

  // Add department filter
  if (filters.department) {
    query.department = filters.department;
  }

  // Add academic year filter
  if (filters.academicYear) {
    query.academicYear = filters.academicYear;
  }

  return this.find(query)
    .populate('facultyId', 'name email')
    .sort({ date: -1 })
    .select('date subjectCode subjectName facultyName classStartTime classEndTime studentAttendance status classType location')
    .then((sessions) =>
      sessions
        .map((session) => {
          const matchedAttendance = (session.studentAttendance || []).filter((entry) => {
            const recordStudentId = resolveAttendanceStudentKey(entry.studentId);
            const recordEmail = (entry.studentEmail || '').toLowerCase();
            const targetEmail = (filters.studentEmail || '').toLowerCase();

            return recordStudentId === normalizedStudentId || (targetEmail && recordEmail === targetEmail);
          });

          if (!matchedAttendance.length) {
            return null;
          }

          const sessionObject = session.toObject ? session.toObject() : session;
          return {
            ...sessionObject,
            studentAttendance: matchedAttendance
          };
        })
        .filter(Boolean)
    );
};

// Static method to get attendance summary for a student
dailyAttendanceSchema.statics.getStudentAttendanceSummary = function(studentId, filters = {}) {
  const normalizedStudentId = resolveAttendanceStudentKey(studentId);
  const matchOrConditions = [];

  if (mongoose.isValidObjectId(normalizedStudentId)) {
    matchOrConditions.push({
      'studentAttendance.studentId': new mongoose.Types.ObjectId(normalizedStudentId)
    });
  }

  if (filters.studentEmail) {
    matchOrConditions.push({ 'studentAttendance.studentEmail': filters.studentEmail.toLowerCase() });
  }

  if (!matchOrConditions.length) {
    return Promise.resolve([]);
  }

  const matchStage = {
    $or: matchOrConditions
  };

  // Add filters
  if (filters.startDate || filters.endDate) {
    matchStage.date = {};
    if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
  }

  if (filters.subjectCode) {
    matchStage.subjectCode = filters.subjectCode.toUpperCase();
  }

  if (filters.department) {
    matchStage.department = filters.department;
  }

  if (filters.academicYear) {
    matchStage.academicYear = filters.academicYear;
  }

  // By default include submitted and draft sessions for student view so totals reflect classes created but not yet submitted
  if (filters.status) {
    matchStage.status = filters.status;
  } else {
    matchStage.status = { $in: ['submitted', 'draft'] };
  }

  return this.aggregate([
    { $match: matchStage },
    { $unwind: '$studentAttendance' },
    {
      $match: {
        $or: matchOrConditions
      }
    },
    {
      $group: {
        _id: {
          subjectCode: '$subjectCode',
          subjectName: '$subjectName',
          date: '$date'
        },
        subjectCode: { $first: '$subjectCode' },
        subjectName: { $first: '$subjectName' },
        // absent if any record for this student on that date is false
        isPresent: {
          $min: { $cond: [{ $eq: ['$studentAttendance.isPresent', true] }, 1, 0] }
        }
      }
    },
    {
      $group: {
        _id: {
          subjectCode: '$subjectCode',
          subjectName: '$subjectName'
        },
        totalClasses: { $sum: 1 }, // per unique date
        attendedClasses: { $sum: '$isPresent' },
        absentClasses: { $sum: { $subtract: [1, '$isPresent'] } }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $round: [
            { $multiply: [{ $divide: ['$attendedClasses', '$totalClasses'] }, 100] },
            2
          ]
        },
        isDebarred: {
          $lt: [
            { $multiply: [{ $divide: ['$attendedClasses', '$totalClasses'] }, 100] },
            75
          ]
        }
      }
    },
    {
      $project: {
        _id: 0,
        subjectCode: '$_id.subjectCode',
        subjectName: '$_id.subjectName',
        totalClasses: 1,
        attendedClasses: 1,
        absentClasses: 1,
        attendancePercentage: 1,
        isDebarred: 1
      }
    },
    { $sort: { subjectCode: 1 } }
  ]);
};

// Static method to get faculty attendance records
dailyAttendanceSchema.statics.getFacultyAttendanceRecords = function(facultyId, filters = {}) {
  const query = { facultyId };

  // Add date range filter
  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  // Add subject filter
  if (filters.subjectCode) {
    query.subjectCode = filters.subjectCode.toUpperCase();
  }

  if (filters.subjectCodes && filters.subjectCodes.length > 0) {
    query.subjectCode = { $in: filters.subjectCodes.map(code => code.toUpperCase()) };
  }

  if (filters.academicYear) {
    query.academicYear = filters.academicYear;
  }

  if (filters.academicYears && filters.academicYears.length > 0) {
    query.academicYear = { $in: filters.academicYears };
  }

  // Add status filter
  if (filters.status) {
    query.status = filters.status;
  }

  return this.find(query)
    .sort({ date: -1, classStartTime: 1 })
    .select('date subjectCode subjectName classStartTime classEndTime totalStudents presentCount absentCount attendancePercentage status classType location');
};

// Static method to get attendance statistics
dailyAttendanceSchema.statics.getAttendanceStatistics = function(filters = {}) {
  const matchStage = {};

  // Add filters
  if (filters.startDate || filters.endDate) {
    matchStage.date = {};
    if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
  }

  if (filters.department) {
    matchStage.department = filters.department;
  }

  if (filters.academicYear) {
    matchStage.academicYear = filters.academicYear;
  }

  if (filters.facultyId) {
    matchStage.facultyId = new mongoose.Types.ObjectId(filters.facultyId);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        totalStudentRecords: { $sum: '$totalStudents' },
        totalPresentRecords: { $sum: '$presentCount' },
        totalAbsentRecords: { $sum: '$absentCount' },
        averageAttendance: { $avg: '$attendancePercentage' }
      }
    },
    {
      $addFields: {
        overallAttendancePercentage: {
          $round: [
            { $multiply: [{ $divide: ['$totalPresentRecords', '$totalStudentRecords'] }, 100] },
            2
          ]
        }
      }
    }
  ]);
};

// Static method to get faculty subject-wise student attendance summary
dailyAttendanceSchema.statics.getFacultySubjectSummary = function(facultyId, filters = {}) {
  const matchStage = {
    facultyId: new mongoose.Types.ObjectId(facultyId),
    status: 'submitted'
  };

  if (filters.academicYear) {
    matchStage.academicYear = filters.academicYear;
  }

  if (filters.subjectCode) {
    matchStage.subjectCode = filters.subjectCode.toUpperCase();
  }

  if (filters.startDate || filters.endDate) {
    matchStage.date = {};
    if (filters.startDate) matchStage.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.date.$lte = new Date(filters.endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    { $unwind: '$studentAttendance' },
    {
      $group: {
        _id: {
          subjectCode: '$subjectCode',
          subjectName: '$subjectName',
          studentId: '$studentAttendance.studentId',
          studentName: '$studentAttendance.studentName',
          studentEmail: '$studentAttendance.studentEmail',
          rollNumber: '$studentAttendance.rollNumber'
        },
        totalClasses: { $sum: 1 },
        presentClasses: {
          $sum: { $cond: ['$studentAttendance.isPresent', 1, 0] }
        },
        absentClasses: {
          $sum: { $cond: ['$studentAttendance.isPresent', 0, 1] }
        }
      }
    },
    {
      $addFields: {
        attendancePercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$presentClasses', '$totalClasses'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          subjectCode: '$_id.subjectCode',
          subjectName: '$_id.subjectName'
        },
        students: {
          $push: {
            studentId: '$_id.studentId',
            studentName: '$_id.studentName',
            studentEmail: '$_id.studentEmail',
            rollNumber: '$_id.rollNumber',
            totalClasses: '$totalClasses',
            presentClasses: '$presentClasses',
            absentClasses: '$absentClasses',
            attendancePercentage: '$attendancePercentage'
          }
        },
        totalClassesConducted: { $max: '$totalClasses' }
      }
    },
    {
      $project: {
        _id: 0,
        subjectCode: '$_id.subjectCode',
        subjectName: '$_id.subjectName',
        totalClassesConducted: 1,
        students: 1
      }
    },
    { $sort: { subjectCode: 1 } }
  ]);
};

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
