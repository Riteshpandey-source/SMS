const ExamMark = require('../models/ExamMark');
const User = require('../models/User');
const StudentFacultyAssignment = require('../models/StudentFacultyAssignment');
const { formatUserForPrivate } = require('../utils/userUtils');

const getFacultyAccess = async (facultyUser) => {
  const faculty = await User.findById(facultyUser._id)
    .select('department accessibleYears accessibleSubjects')
    .lean();

  if (!faculty) throw new Error('Faculty not found');

  const assignments = await StudentFacultyAssignment.find({
    faculty: facultyUser._id,
    isActive: true
  }).populate('student', 'name email rollNumber department academicYear').lean();

  const studentsByYear = assignments.reduce((acc, assignment) => {
    if (!assignment.student) return acc;
    const year = assignment.student.academicYear;
    if (!acc[year]) acc[year] = [];
    acc[year].push({
      id: assignment.student._id,
      name: assignment.student.name,
      email: assignment.student.email,
      rollNumber: assignment.student.rollNumber,
      academicYear: assignment.student.academicYear,
      department: assignment.student.department
    });
    return acc;
  }, {});

  return {
    faculty,
    studentsByYear
  };
};

const createOrUpdateMarks = async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }

    const {
      subjectCode,
      subjectName,
      academicYear,
      examDate,
      assessmentType,
      maxMarks,
      department,
      marks = []
    } = req.body;

    if (!subjectCode || !subjectName || !academicYear || !examDate || !assessmentType || !maxMarks) {
      return res.status(400).json({ success: false, error: 'MISSING_REQUIRED_FIELDS' });
    }

    // Faculty access validation
    if (req.user.role === 'faculty') {
      const access = await getFacultyAccess(req.user);
      if (!access.faculty.accessibleYears?.includes(Number(academicYear))) {
        return res.status(403).json({ success: false, error: 'YEAR_ACCESS_DENIED' });
      }
      const allowedSubjects = (access.faculty.accessibleSubjects || []).map((s) => s.subjectCode);
      if (!allowedSubjects.includes(subjectCode.toUpperCase())) {
        return res.status(403).json({ success: false, error: 'SUBJECT_ACCESS_DENIED' });
      }
    }

    const bulkOps = marks.map((entry) => ({
      updateOne: {
        filter: {
          studentId: entry.studentId,
          facultyId: req.user._id,
          subjectCode: subjectCode.toUpperCase(),
          assessmentType,
          examDate: new Date(examDate)
        },
        update: {
          $set: {
            subjectName,
            department: department || req.user.department,
            academicYear: Number(academicYear),
            maxMarks: Number(maxMarks),
            obtainedMarks: Number(entry.obtainedMarks || 0),
            remarks: entry.remarks || '',
            updatedBy: req.user._id
          },
          $setOnInsert: {
            studentId: entry.studentId,
            facultyId: req.user._id,
            createdBy: req.user._id
          }
        },
        upsert: true
      }
    }));

    if (!bulkOps.length) {
      return res.status(400).json({ success: false, error: 'NO_MARKS_PROVIDED' });
    }

    await ExamMark.bulkWrite(bulkOps, { ordered: false });

    res.json({ success: true, message: 'Marks saved' });
  } catch (error) {
    console.error('createOrUpdateMarks error:', error);
    res.status(500).json({ success: false, error: error.message || 'FAILED_TO_SAVE_MARKS' });
  }
};

const getFacultyMarks = async (req, res) => {
  try {
    const facultyId = req.user.role === 'admin' && req.query.facultyId ? req.query.facultyId : req.user._id;
    const query = { facultyId };
    if (req.query.subjectCode) query.subjectCode = req.query.subjectCode.toUpperCase();
    if (req.query.academicYear) query.academicYear = Number(req.query.academicYear);

    const marks = await ExamMark.find(query)
      .populate('studentId', 'name rollNumber email academicYear')
      .sort({ examDate: -1 });

    res.json({ success: true, data: marks });
  } catch (error) {
    console.error('getFacultyMarks error:', error);
    res.status(500).json({ success: false, error: 'FAILED_TO_FETCH_MARKS' });
  }
};

const getStudentMarks = async (req, res) => {
  try {
    const studentId = req.user.role === 'student' ? req.user._id : req.params.studentId;
    if (req.user.role === 'student' && req.user._id.toString() !== studentId.toString()) {
      return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
    }
    const query = { studentId };
    if (req.query.subjectCode) query.subjectCode = req.query.subjectCode.toUpperCase();
    const marks = await ExamMark.find(query)
      .populate('facultyId', 'name email')
      .sort({ examDate: -1 });
    res.json({ success: true, data: marks });
  } catch (error) {
    console.error('getStudentMarks error:', error);
    res.status(500).json({ success: false, error: 'FAILED_TO_FETCH_STUDENT_MARKS' });
  }
};

module.exports = {
  createOrUpdateMarks,
  getFacultyMarks,
  getStudentMarks
};
