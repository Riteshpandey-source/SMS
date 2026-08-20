const AcademicRecord = require('../models/AcademicRecord');
const User = require('../models/User');

// Get public regular attendance (no authentication required)
const getPublicRegularAttendance = async (req, res) => {
  try {
    const { department, academicYear } = req.query;

    if (!department || !academicYear) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Department and academic year are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('📊 Getting public regular attendance:', { department, academicYear });

    // Find all academic records for the department and year
    const records = await AcademicRecord.find({
      department,
      academicYear: parseInt(academicYear)
    })
      .populate('studentId', 'name email rollNumber')
      .select('studentId attendance overallAttendance isDebarred debarredSubjects')
      .lean();

    console.log('📊 Found records:', records.length);

    // Format the response
    const studentsData = records.map(record => ({
      studentId: record.studentId?._id,
      studentName: record.studentId?.name,
      studentEmail: record.studentId?.email,
      rollNumber: record.studentId?.rollNumber,
      attendance: record.attendance || [],
      overallAttendance: record.overallAttendance || 0,
      isDebarred: record.isDebarred || false,
      debarredSubjects: record.debarredSubjects || []
    }));

    res.json({
      success: true,
      data: {
        students: studentsData,
        total: studentsData.length,
        department,
        academicYear: parseInt(academicYear)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get public regular attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_PUBLIC_ATTENDANCE_ERROR',
        message: 'Failed to retrieve public attendance data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get student's academic records
const getAcademicRecords = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semester } = req.query;
    
    // Check if user is accessing their own records or is faculty/admin
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Students can only access their own academic records',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query
    const query = { studentId };
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query)
      .populate('studentId', 'name email department academicYear')
      .sort({ academicYear: -1, semester: -1 });

    res.json({
      success: true,
      data: {
        records,
        total: records.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get academic records error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ACADEMIC_RECORDS_ERROR',
        message: 'Failed to retrieve academic records',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get attendance records
const getAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semester, subjectCode } = req.query;

    // Check access permissions
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Students can only access their own attendance records',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query
    const query = { studentId };
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (semester) query.semester = semester;

    const records = await AcademicRecord.find(query)
      .populate('studentId', 'name email department academicYear')
      .select('academicYear semester attendance attendanceSummary overallAttendance isDebarred debarredSubjects updatedAt')
      .sort({ updatedAt: -1 }); // Sort by latest first

    // Get the most recent record
    const latestRecord = records.length > 0 ? records[0] : null;

    if (!latestRecord) {
      return res.json({
        success: true,
        data: {
          attendance: [],
          summary: null,
          overallAttendance: 0
        },
        timestamp: new Date().toISOString()
      });
    }

    // Filter by subject if specified
    let attendanceArray = latestRecord.attendance || [];
    if (subjectCode && typeof subjectCode === 'string') {
      attendanceArray = attendanceArray.filter(att => att.subjectCode === subjectCode.toUpperCase());
    }

    res.json({
      success: true,
      data: {
        attendance: attendanceArray,
        summary: latestRecord.attendanceSummary,
        overallAttendance: latestRecord.overallAttendance,
        isDebarred: latestRecord.isDebarred,
        debarredSubjects: latestRecord.debarredSubjects,
        student: latestRecord.studentId,
        academicYear: latestRecord.academicYear,
        semester: latestRecord.semester
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ATTENDANCE_ERROR',
        message: 'Failed to retrieve attendance records',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update attendance (Faculty/Admin only)
const updateAttendance = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { attendedClasses, totalClasses, academicYear, semester, subjectCode, subjectName } = req.body;

    // Only faculty and admin can update attendance
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can update attendance',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate input types
    if (typeof attendedClasses !== 'number' || typeof totalClasses !== 'number') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ATTENDANCE_DATA',
          message: 'attendedClasses and totalClasses must be numbers',
          details: {
            attendedClasses: {
              expected: 'number',
              received: typeof attendedClasses
            },
            totalClasses: {
              expected: 'number',
              received: typeof totalClasses
            }
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate input values
    if (attendedClasses < 0 || totalClasses < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ATTENDANCE_VALUES',
          message: 'Attendance values cannot be negative',
          details: {
            attendedClasses,
            totalClasses
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    if (attendedClasses > totalClasses) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ATTENDANCE_VALUES',
          message: 'Attended classes cannot exceed total classes',
          details: {
            attendedClasses,
            totalClasses,
            message: `Attended (${attendedClasses}) > Total (${totalClasses})`
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Always fetch student data first to ensure they exist
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STUDENT_NOT_FOUND',
          message: 'Student not found',
          details: {
            studentId
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find or create academic record - guaranteed creation
    let academicRecord = await AcademicRecord.findOne({
      studentId,
      academicYear: academicYear || student.academicYear || 1,
      semester: semester || 'current'
    });

    if (!academicRecord) {
      // Create new academic record with proper initialization
      academicRecord = new AcademicRecord({
        studentId,
        academicYear: academicYear || student.academicYear || 1,
        semester: semester || 'current',
        department: student.department,
        attendance: [],
        midTermMarks: [],
        overallAttendance: 0,
        isDebarred: false,
        debarredSubjects: []
      });
      
      console.log('Created new academic record for student:', studentId);
    }

    // Update attendance with subject information
    await academicRecord.updateAttendance(
      subjectId, 
      attendedClasses, 
      totalClasses,
      subjectCode,
      subjectName
    );

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      data: {
        attendance: academicRecord.attendance.find(att => att.subjectId === subjectId),
        summary: academicRecord.attendanceSummary,
        isDebarred: academicRecord.isDebarred,
        debarredSubjects: academicRecord.debarredSubjects,
        overallAttendance: academicRecord.overallAttendance
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    console.error('Request body:', req.body);
    console.error('Student ID:', req.params.studentId);
    console.error('Subject ID:', req.params.subjectId);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_ATTENDANCE_ERROR',
        message: 'Failed to update attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Bulk update attendance (Faculty/Admin only)
const bulkUpdateAttendance = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { studentId, subjectId, attendedClasses, totalClasses }
    const { academicYear, semester } = req.body;

    // Only faculty and admin can bulk update attendance
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can bulk update attendance',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_BULK_DATA',
          message: 'Updates array is required and cannot be empty',
          timestamp: new Date().toISOString()
        }
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    // Process each update
    for (const update of updates) {
      try {
        const { studentId, subjectId, attendedClasses, totalClasses } = update;

        // Validate individual update
        if (!studentId || !subjectId || attendedClasses < 0 || totalClasses < 0 || attendedClasses > totalClasses) {
          results.failed.push({
            studentId,
            subjectId,
            error: 'Invalid data'
          });
          continue;
        }

        // Find or create academic record
        let academicRecord = await AcademicRecord.findOne({
          studentId,
          academicYear: academicYear || 1,
          semester: semester || 'current'
        });

        if (!academicRecord) {
          const student = await User.findById(studentId);
          if (!student) {
            results.failed.push({
              studentId,
              subjectId,
              error: 'Student not found'
            });
            continue;
          }

          academicRecord = new AcademicRecord({
            studentId,
            academicYear: academicYear || student.academicYear,
            semester: semester || 'current',
            department: student.department
          });
        }

        // Update attendance
        await academicRecord.updateAttendance(subjectId, attendedClasses, totalClasses);

        results.successful.push({
          studentId,
          subjectId,
          attendedClasses,
          totalClasses,
          percentage: Math.round((attendedClasses / totalClasses) * 10000) / 100
        });

      } catch (updateError) {
        results.failed.push({
          studentId: update.studentId,
          subjectId: update.subjectId,
          error: updateError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk attendance update completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      data: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk update attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_UPDATE_ATTENDANCE_ERROR',
        message: 'Failed to bulk update attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get attendance analytics
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { department, academicYear, semester, subjectCode } = req.query;

    // Only faculty and admin can view analytics
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can view attendance analytics',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build match criteria
    const matchCriteria = {};
    if (department) matchCriteria.department = department;
    if (academicYear) matchCriteria.academicYear = parseInt(academicYear);
    if (semester) matchCriteria.semester = semester;

    // Get overall statistics
    const overallStats = await AcademicRecord.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          averageAttendance: { $avg: '$overallAttendance' },
          debarredCount: { $sum: { $cond: ['$isDebarred', 1, 0] } },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    // Get subject-wise statistics
    const subjectStats = await AcademicRecord.aggregate([
      { $match: matchCriteria },
      { $unwind: '$attendance' },
      ...(subjectCode && typeof subjectCode === 'string' ? [{ $match: { 'attendance.subjectCode': subjectCode.toUpperCase() } }] : []),
      {
        $group: {
          _id: '$attendance.subjectCode',
          subjectName: { $first: '$attendance.subjectName' },
          totalStudents: { $sum: 1 },
          averageAttendance: { $avg: '$attendance.percentage' },
          debarredCount: { $sum: { $cond: ['$attendance.isDebarred', 1, 0] } },
          minAttendance: { $min: '$attendance.percentage' },
          maxAttendance: { $max: '$attendance.percentage' }
        }
      },
      { $sort: { averageAttendance: -1 } }
    ]);

    // Get attendance distribution
    const attendanceDistribution = await AcademicRecord.aggregate([
      { $match: matchCriteria },
      {
        $bucket: {
          groupBy: '$overallAttendance',
          boundaries: [0, 50, 60, 70, 75, 80, 90, 100],
          default: 'other',
          output: {
            count: { $sum: 1 },
            students: { $push: '$studentId' }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || {
          totalStudents: 0,
          averageAttendance: 0,
          debarredCount: 0,
          totalRecords: 0
        },
        subjectWise: subjectStats,
        distribution: attendanceDistribution,
        filters: {
          department,
          academicYear,
          semester,
          subjectCode
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get attendance analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ATTENDANCE_ANALYTICS_ERROR',
        message: 'Failed to retrieve attendance analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get debarred students list
const getDebarredStudents = async (req, res) => {
  try {
    const { department, academicYear, semester } = req.query;

    // Only faculty and admin can view debarred students
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can view debarred students list',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query
    const query = { isDebarred: true };
    if (department) query.department = department;
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (semester) query.semester = semester;

    const debarredStudents = await AcademicRecord.find(query)
      .populate('studentId', 'name email department academicYear')
      .select('studentId academicYear semester debarredSubjects overallAttendance attendance')
      .sort({ overallAttendance: 1 });

    // Format the response
    const formattedStudents = debarredStudents.map(record => ({
      student: record.studentId,
      academicYear: record.academicYear,
      semester: record.semester,
      overallAttendance: record.overallAttendance,
      debarredSubjects: record.debarredSubjects,
      subjectDetails: record.attendance
        .filter(att => att.isDebarred)
        .map(att => ({
          subjectCode: att.subjectCode,
          subjectName: att.subjectName,
          percentage: att.percentage,
          required: att.requiredPercentage,
          deficit: att.requiredPercentage - att.percentage
        }))
    }));

    res.json({
      success: true,
      data: {
        debarredStudents: formattedStudents,
        total: formattedStudents.length,
        summary: {
          totalDebarred: formattedStudents.length,
          averageAttendance: formattedStudents.length > 0 
            ? formattedStudents.reduce((sum, s) => sum + s.overallAttendance, 0) / formattedStudents.length 
            : 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get debarred students error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DEBARRED_STUDENTS_ERROR',
        message: 'Failed to retrieve debarred students list',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Helper function to calculate grade from marks
const calculateGrade = (obtainedMarks, maxMarks) => {
  const percentage = (obtainedMarks / maxMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 35) return 'D';
  return 'F';
};

// Update student's mid-term marks
const updateMidTermMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { marks, academicYear, semester } = req.body;

    console.log('📊 UPDATE MARKS REQUEST:');
    console.log('   Student ID:', studentId);
    console.log('   Marks count:', marks?.length);
    console.log('   Academic Year:', academicYear);
    console.log('   Marks data:', JSON.stringify(marks, null, 2));

    // Only faculty and admin can update marks
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can update marks',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate marks array structure
    if (!Array.isArray(marks)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MARKS_DATA',
          message: 'Marks must be an array',
          details: {
            field: 'marks',
            expected: 'array',
            received: typeof marks
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Allow empty array for deleting all marks
    // if (marks.length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     error: {
    //       code: 'INVALID_MARKS_DATA',
    //       message: 'Marks array cannot be empty',
    //       details: {
    //         field: 'marks',
    //         expected: 'non-empty array',
    //         received: 'empty array'
    //       },
    //       timestamp: new Date().toISOString()
    //     }
    //   });
    // }

    // Validate each mark entry (skip if empty array for deletion)
    const validationErrors = [];
    if (marks.length > 0) {
      marks.forEach((mark, index) => {
      // Check required fields
      if (!mark.subjectCode) {
        validationErrors.push({
          index: index + 1,
          field: 'subjectCode',
          message: `Mark ${index + 1}: subjectCode is required`
        });
      }

      // Validate obtainedMarks
      if (mark.obtainedMarks === undefined || mark.obtainedMarks === null) {
        validationErrors.push({
          index: index + 1,
          field: 'obtainedMarks',
          message: `Mark ${index + 1}: obtainedMarks is required`
        });
      } else if (typeof mark.obtainedMarks !== 'number') {
        validationErrors.push({
          index: index + 1,
          field: 'obtainedMarks',
          message: `Mark ${index + 1}: obtainedMarks must be a number, received ${typeof mark.obtainedMarks}`
        });
      } else {
        const maxMarks = mark.maxMarks || 100;
        
        // Check for negative marks
        if (mark.obtainedMarks < 0) {
          validationErrors.push({
            index: index + 1,
            field: 'obtainedMarks',
            message: `Mark ${index + 1}: obtainedMarks cannot be negative`
          });
        }
        
        // Check if marks exceed maximum
        if (mark.obtainedMarks > maxMarks) {
          validationErrors.push({
            index: index + 1,
            field: 'obtainedMarks',
            message: `Mark ${index + 1}: obtainedMarks (${mark.obtainedMarks}) cannot exceed maxMarks (${maxMarks})`
          });
        }
      }

      // Validate maxMarks if provided
      if (mark.maxMarks !== undefined && mark.maxMarks !== null) {
        if (typeof mark.maxMarks !== 'number') {
          validationErrors.push({
            index: index + 1,
            field: 'maxMarks',
            message: `Mark ${index + 1}: maxMarks must be a number, received ${typeof mark.maxMarks}`
          });
        } else if (mark.maxMarks <= 0) {
          validationErrors.push({
            index: index + 1,
            field: 'maxMarks',
            message: `Mark ${index + 1}: maxMarks must be greater than 0`
          });
        }
      }
      });
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MARKS_VALIDATION_FAILED',
          message: 'Marks validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find or create academic record
    let academicRecord = await AcademicRecord.findOne({
      studentId,
      academicYear: academicYear || 1,
      semester: semester || 'current'
    });

    if (!academicRecord) {
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      academicRecord = new AcademicRecord({
        studentId,
        academicYear: academicYear || student.academicYear || 1,
        semester: semester || 'current',
        department: student.department
      });
    }

    // Replace entire marks array (this allows deletion)
    // Clear existing marks and add new ones
    console.log('📊 BEFORE UPDATE - Existing marks count:', academicRecord.midTermMarks.length);
    
    academicRecord.midTermMarks = marks.map(mark => {
      const maxMarks = mark.maxMarks || 100;
      const grade = calculateGrade(mark.obtainedMarks, maxMarks);
      
      return {
        subjectCode: mark.subjectCode,
        subjectName: mark.subjectName || `Subject ${mark.subjectCode}`,
        subjectId: mark.subjectId || mark.subjectCode,
        maxMarks: maxMarks,
        obtainedMarks: mark.obtainedMarks,
        grade: grade,
        examDate: mark.examDate || new Date(),
        createdAt: mark.createdAt || new Date(),
        updatedAt: new Date(),
        updatedBy: req.user._id
      };
    });

    console.log('📊 AFTER UPDATE - New marks count:', academicRecord.midTermMarks.length);
    console.log('📊 Saving to database...');
    
    await academicRecord.save();
    
    console.log('✅ SAVED SUCCESSFULLY - Final marks count:', academicRecord.midTermMarks.length);

    res.json({
      success: true,
      message: 'Mid-term marks updated successfully',
      data: {
        midTermMarks: academicRecord.midTermMarks,
        marks: academicRecord.midTermMarks, // For backward compatibility
        studentId
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update mid-term marks error:', error);
    console.error('Request body:', req.body);
    console.error('Student ID:', req.params.studentId);
    
    // Send detailed error for debugging
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_MIDTERM_MARKS_ERROR',
        message: 'Failed to update mid-term marks',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get student's mid-term marks
const getMidTermMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semester } = req.query;

    console.log('📊 GET MARKS REQUEST:', { studentId, academicYear, semester });

    // Check access permissions
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Students can only access their own marks',
          timestamp: new Date().toISOString()
        }
      });
    }

    const query = { studentId };
    if (academicYear) query.academicYear = parseInt(academicYear);
    if (semester) query.semester = semester;

    console.log('📊 QUERY:', query);

    // If no filters specified, get the latest record by updatedAt
    const academicRecord = await AcademicRecord.findOne(query)
      .populate('studentId', 'name email department academicYear')
      .select('midTermMarks academicYear semester updatedAt')
      .sort({ updatedAt: -1 }); // Sort by latest first

    console.log('📊 FOUND RECORD:', academicRecord ? {
      id: academicRecord._id,
      academicYear: academicRecord.academicYear,
      semester: academicRecord.semester,
      marksCount: academicRecord.midTermMarks?.length || 0,
      marks: academicRecord.midTermMarks
    } : 'NO RECORD FOUND');

    if (!academicRecord) {
      console.log('📊 NO RECORD - Returning empty data');
      return res.json({
        success: true,
        data: {
          marks: [],
          total: 0
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log('📊 RETURNING MARKS:', {
      count: academicRecord.midTermMarks?.length || 0,
      academicYear: academicRecord.academicYear,
      semester: academicRecord.semester
    });

    res.json({
      success: true,
      data: {
        midTermMarks: academicRecord.midTermMarks || [],
        marks: academicRecord.midTermMarks || [], // Keep both for compatibility
        total: academicRecord.midTermMarks?.length || 0,
        student: academicRecord.studentId,
        academicYear: academicRecord.academicYear,
        semester: academicRecord.semester
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get mid-term marks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_MIDTERM_MARKS_ERROR',
        message: 'Failed to retrieve mid-term marks',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Update student debarment status
const updateStudentDebarment = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subject, isDebarred, reason } = req.body;

    // Only faculty and admin can update debarment
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can update debarment status',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find academic record
    let academicRecord = await AcademicRecord.findOne({
      studentId,
      academicYear: { $exists: true }
    }).sort({ academicYear: -1 });

    if (!academicRecord) {
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'STUDENT_NOT_FOUND',
            message: 'Student not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      academicRecord = new AcademicRecord({
        studentId,
        academicYear: student.academicYear || 1,
        semester: 'current',
        department: student.department
      });
    }

    // Update manual debarment
    if (!academicRecord.manualDebarments) {
      academicRecord.manualDebarments = new Map();
    }

    const key = `${subject}`;
    if (isDebarred) {
      academicRecord.manualDebarments.set(key, {
        isDebarred: true,
        reason: reason || 'Manual debarment by faculty',
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    } else {
      academicRecord.manualDebarments.set(key, {
        isDebarred: false,
        reason: reason || 'Manual override by faculty',
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    }

    await academicRecord.save();

    res.json({
      success: true,
      message: `Student ${isDebarred ? 'debarred from' : 'undebarred from'} ${subject}`,
      data: {
        studentId,
        subject,
        isDebarred,
        reason,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update student debarment error:', error);
    console.error('Request body:', req.body);
    console.error('Student ID:', req.params.studentId);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_DEBARMENT_ERROR',
        message: 'Failed to update debarment status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get student's debarment status
const getStudentDebarments = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check access permissions
    if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Students can only access their own debarment status',
          timestamp: new Date().toISOString()
        }
      });
    }

    const academicRecord = await AcademicRecord.findOne({
      studentId,
      academicYear: { $exists: true }
    })
    .populate('studentId', 'name email department academicYear')
    .sort({ academicYear: -1 });

    if (!academicRecord) {
      return res.json({
        success: true,
        data: {
          debarments: [],
          manualDebarments: {},
          isDebarred: false
        },
        timestamp: new Date().toISOString()
      });
    }

    // Convert Map to Object for JSON response
    const manualDebarments = {};
    if (academicRecord.manualDebarments) {
      for (let [key, value] of academicRecord.manualDebarments) {
        manualDebarments[key] = value;
      }
    }

    res.json({
      success: true,
      data: {
        debarments: academicRecord.debarredSubjects || [],
        manualDebarments,
        isDebarred: academicRecord.isDebarred || false,
        student: academicRecord.studentId,
        academicYear: academicRecord.academicYear
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get student debarments error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DEBARMENTS_ERROR',
        message: 'Failed to retrieve debarment status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Delete attendance record (Faculty/Admin only)
const deleteAttendance = async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;

    // Only faculty and admin can delete attendance
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Only faculty and admin can delete attendance',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find academic record
    const academicRecord = await AcademicRecord.findOne({
      studentId,
      academicYear: { $exists: true }
    }).sort({ academicYear: -1 });

    if (!academicRecord) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ACADEMIC_RECORD_NOT_FOUND',
          message: 'Academic record not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete attendance
    await academicRecord.deleteAttendance(subjectId);

    res.json({
      success: true,
      message: 'Attendance deleted successfully',
      data: {
        studentId,
        subjectId,
        remainingAttendance: academicRecord.attendance
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_ATTENDANCE_ERROR',
        message: 'Failed to delete attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get department attendance - all students in a department
const getDepartmentAttendance = async (req, res) => {
  try {
    const { department, academicYear, semester } = req.query;
    
    if (!department) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DEPARTMENT_REQUIRED',
          message: 'Department parameter is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query for students in the department
    const studentQuery = { department, role: 'student' };
    if (academicYear) studentQuery.academicYear = parseInt(academicYear);

    // Get all students in the department
    const students = await User.find(studentQuery)
      .select('name email department academicYear rollNumber')
      .sort({ name: 1 });

    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          students: [],
          total: 0,
          department,
          academicYear: academicYear ? parseInt(academicYear) : null
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get academic records for all students
    const studentIds = students.map(student => student._id);
    const recordQuery = { studentId: { $in: studentIds } };
    if (academicYear) recordQuery.academicYear = parseInt(academicYear);
    if (semester) recordQuery.semester = semester;

    const academicRecords = await AcademicRecord.find(recordQuery);

    // Map attendance data to students with percentage calculation
    const studentsWithAttendance = students.map(student => {
      const studentRecord = academicRecords.find(record => 
        record.studentId.toString() === student._id.toString()
      );

      // Process attendance data to ensure percentage is calculated
      let processedAttendance = [];
      if (studentRecord && studentRecord.attendance) {
        processedAttendance = studentRecord.attendance.map(att => {
          const attendedClasses = att.attendedClasses || 0;
          const totalClasses = att.totalClasses || 0;
          const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
          
          return {
            subjectCode: att.subjectCode,
            subjectName: att.subjectName,
            attendedClasses,
            totalClasses,
            percentage
          };
        });
      }

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        department: student.department,
        academicYear: student.academicYear,
        rollNumber: student.rollNumber,
        attendance: processedAttendance
      };
    });

    res.json({
      success: true,
      data: {
        students: studentsWithAttendance,
        total: studentsWithAttendance.length,
        department,
        academicYear: academicYear ? parseInt(academicYear) : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get department attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DEPARTMENT_ATTENDANCE_ERROR',
        message: 'Failed to retrieve department attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get all students attendance (for admin/faculty view)
const getAllStudentsAttendance = async (req, res) => {
  try {
    const { academicYear, semester } = req.query;
    
    // Check if user has permission (admin or faculty)
    if (req.user.role === 'student') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Students cannot access all students attendance data',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Build query for students
    const studentQuery = { role: 'student' };
    if (academicYear) studentQuery.academicYear = parseInt(academicYear);

    // Get all students
    const students = await User.find(studentQuery)
      .select('name email department academicYear rollNumber')
      .sort({ department: 1, academicYear: 1, name: 1 });

    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          students: [],
          total: 0,
          academicYear: academicYear ? parseInt(academicYear) : null
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get academic records for all students
    const studentIds = students.map(student => student._id);
    const recordQuery = { studentId: { $in: studentIds } };
    if (academicYear) recordQuery.academicYear = parseInt(academicYear);
    if (semester) recordQuery.semester = semester;

    const academicRecords = await AcademicRecord.find(recordQuery);

    // Map attendance data to students with percentage calculation
    const studentsWithAttendance = students.map(student => {
      const studentRecord = academicRecords.find(record => 
        record.studentId.toString() === student._id.toString()
      );

      // Process attendance data to ensure percentage is calculated
      let processedAttendance = [];
      if (studentRecord && studentRecord.attendance) {
        processedAttendance = studentRecord.attendance.map(att => {
          const attendedClasses = att.attendedClasses || 0;
          const totalClasses = att.totalClasses || 0;
          const percentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 0;
          
          return {
            subjectCode: att.subjectCode,
            subjectName: att.subjectName,
            attendedClasses,
            totalClasses,
            percentage
          };
        });
      }

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        department: student.department,
        academicYear: student.academicYear,
        rollNumber: student.rollNumber,
        attendance: processedAttendance
      };
    });

    res.json({
      success: true,
      data: {
        students: studentsWithAttendance,
        total: studentsWithAttendance.length,
        academicYear: academicYear ? parseInt(academicYear) : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get all students attendance error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_ALL_STUDENTS_ATTENDANCE_ERROR',
        message: 'Failed to retrieve all students attendance',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getPublicRegularAttendance,
  getAcademicRecords,
  getAttendance,
  updateAttendance,
  deleteAttendance,
  bulkUpdateAttendance,
  getAttendanceAnalytics,
  getDebarredStudents,
  updateMidTermMarks,
  getMidTermMarks,
  updateStudentDebarment,
  getStudentDebarments,
  getDepartmentAttendance,
  getAllStudentsAttendance
};