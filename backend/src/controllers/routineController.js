const Routine = require('../models/Routine');
const User = require('../models/User');
const { getFileInfo } = require('../middleware/fileUpload');

// Admin: upload a routine file
const uploadRoutine = async (req, res, next) => {
  try {
    const { title, department, academicYear, section } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Title and routine file are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const routine = await Routine.create({
      title: title.trim(),
      department: (department || req.user.department || '').toUpperCase(),
      academicYear: academicYear ? Number(academicYear) : undefined,
      section: section ? section.toUpperCase() : undefined,
      file: {
        ...getFileInfo(req.file),
        url: `${req.protocol}://${req.get('host')}/uploads/routines/${req.file.filename}`
      },
      uploadedBy: req.user._id
    });

    return res.status(201).json({
      success: true,
      data: routine,
      message: 'Routine uploaded successfully'
    });
  } catch (error) {
    return next(error);
  }
};

// List routines for the current user role
const listRoutines = async (req, res, next) => {
  try {
    const user = req.user;
    const { department, academicYear } = req.query;
    const filters = [{ isActive: true }];

    const pushYearFilter = (yearValue) => {
      if (Array.isArray(yearValue) && yearValue.length > 0) {
        filters.push({
          $or: [
            { academicYear: { $exists: false } },
            { academicYear: null },
            { academicYear: { $in: yearValue.map((y) => Number(y)) } }
          ]
        });
        return;
      }

      if (yearValue === undefined || yearValue === null || yearValue === '') return;

      filters.push({
        $or: [
          { academicYear: { $exists: false } },
          { academicYear: null },
          { academicYear: Number(yearValue) }
        ]
      });
    };

    switch (user.role) {
      case 'admin': {
        if (department) filters.push({ department: department.toUpperCase() });
        if (academicYear) pushYearFilter(academicYear);
        break;
      }
      case 'faculty': {
        filters.push({ department: user.department });
        pushYearFilter(academicYear || user.accessibleYears || []);
        break;
      }
      case 'student': {
        filters.push({ department: user.department });
        pushYearFilter(user.academicYear);
        if (user.section) {
          filters.push({
            $or: [
              { section: { $exists: false } },
              { section: null },
              { section: user.section.toUpperCase() }
            ]
          });
        }
        break;
      }
      case 'parent': {
        let child = null;
        if (user.childId) {
          child = await User.findById(user.childId).select('department academicYear section');
        }

        const effectiveDept = (department || child?.department || user.department || '').toUpperCase();
        if (effectiveDept) filters.push({ department: effectiveDept });
        pushYearFilter(academicYear || child?.academicYear);

        if (child?.section) {
          filters.push({
            $or: [
              { section: { $exists: false } },
              { section: null },
              { section: child.section.toUpperCase() }
            ]
          });
        }
        break;
      }
      default:
        break;
    }

    const routines = await Routine.find({ $and: filters })
      .populate('uploadedBy', 'name role department')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: routines,
      count: routines.length
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  uploadRoutine,
  listRoutines
};
