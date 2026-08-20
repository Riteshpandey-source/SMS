const db = require('../config/database');

const getFacultySubjects = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
        subjects.id,
        subjects.name,
        subjects.code,
        classes.id AS class_id,
        classes.name AS class_name,
        classes.section,
        classes.semester
      FROM subjects
      INNER JOIN classes ON classes.id = subjects.class_id
      WHERE subjects.faculty_id = $1
      ORDER BY classes.name, subjects.name`,
      [req.user.id]
    );

    res.json({ success: true, subjects: result.rows });
  } catch (error) {
    next(error);
  }
};

const getStudentsByClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { subjectId } = req.query;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId query parameter is required' });
    }

    const subjectCheck = await db.query(
      'SELECT id FROM subjects WHERE id = $1 AND class_id = $2 AND faculty_id = $3',
      [subjectId, classId, req.user.id]
    );

    if (!subjectCheck.rows.length) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class or subject' });
    }

    const result = await db.query(
      `SELECT id, name, email, roll_number
      FROM students
      WHERE class_id = $1
      ORDER BY roll_number, name`,
      [classId]
    );

    res.json({ success: true, students: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacultySubjects,
  getStudentsByClass
};
