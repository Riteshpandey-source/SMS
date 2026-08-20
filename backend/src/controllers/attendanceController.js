const db = require('../config/database');

const markAttendance = async (req, res, next) => {
  const client = await db.pool.connect();
  let transactionStarted = false;

  try {
    const { classId, subjectId, date, records } = req.body;

    if (!classId || !subjectId || !date || !Array.isArray(records) || !records.length) {
      return res.status(400).json({ success: false, message: 'classId, subjectId, date, and records are required' });
    }

    const subjectResult = await client.query(
      'SELECT id FROM subjects WHERE id = $1 AND class_id = $2 AND faculty_id = $3',
      [subjectId, classId, req.user.id]
    );

    if (!subjectResult.rows.length) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this subject' });
    }

    const duplicateCheck = await client.query(
      'SELECT 1 FROM attendance WHERE subject_id = $1 AND date = $2 LIMIT 1',
      [subjectId, date]
    );

    if (duplicateCheck.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'Attendance has already been submitted for this subject on the selected date'
      });
    }

    await client.query('BEGIN');
    transactionStarted = true;

    for (const record of records) {
      await client.query(
        `INSERT INTO attendance (student_id, faculty_id, subject_id, date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.studentId, req.user.id, subjectId, date, record.status === 'present' ? 'present' : 'absent']
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Attendance submitted successfully'
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    next(error);
  } finally {
    client.release();
  }
};

const getStudentAttendance = async (req, res, next) => {
  try {
    const requestedStudentId = Number(req.params.studentId);
    const studentId = req.user.role === 'student' ? req.user.id : requestedStudentId;

    if (req.user.role === 'student' && requestedStudentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Students can only view their own attendance' });
    }

    const result = await db.query(
      `SELECT
        attendance.id,
        attendance.date,
        attendance.status,
        subjects.id AS subject_id,
        subjects.name AS subject_name,
        subjects.code AS subject_code,
        faculty.name AS faculty_name
      FROM attendance
      INNER JOIN subjects ON subjects.id = attendance.subject_id
      INNER JOIN faculty ON faculty.id = attendance.faculty_id
      WHERE attendance.student_id = $1
      ORDER BY attendance.date DESC, subjects.name`,
      [studentId]
    );

    res.json({ success: true, attendance: result.rows });
  } catch (error) {
    next(error);
  }
};

const getAttendanceSummary = async (req, res, next) => {
  try {
    const requestedStudentId = Number(req.params.studentId);
    const studentId = req.user.role === 'student' ? req.user.id : requestedStudentId;

    if (req.user.role === 'student' && requestedStudentId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Students can only view their own attendance' });
    }

    const summaryResult = await db.query(
      `SELECT
        subjects.id AS subject_id,
        subjects.name AS subject_name,
        subjects.code AS subject_code,
        COUNT(attendance.id) AS total_classes,
        COUNT(attendance.id) FILTER (WHERE attendance.status = 'present') AS present_classes,
        COUNT(attendance.id) FILTER (WHERE attendance.status = 'absent') AS absent_classes,
        ROUND(
          (
            COUNT(attendance.id) FILTER (WHERE attendance.status = 'present')::numeric
            / NULLIF(COUNT(attendance.id), 0)
          ) * 100,
          2
        ) AS attendance_percentage
      FROM attendance
      INNER JOIN subjects ON subjects.id = attendance.subject_id
      WHERE attendance.student_id = $1
      GROUP BY subjects.id, subjects.name, subjects.code
      ORDER BY subjects.name`,
      [studentId]
    );

    const overallResult = await db.query(
      `SELECT
        COUNT(id) AS total_classes,
        COUNT(id) FILTER (WHERE status = 'present') AS present_classes,
        COUNT(id) FILTER (WHERE status = 'absent') AS absent_classes,
        ROUND(
          (
            COUNT(id) FILTER (WHERE status = 'present')::numeric
            / NULLIF(COUNT(id), 0)
          ) * 100,
          2
        ) AS attendance_percentage
      FROM attendance
      WHERE student_id = $1`,
      [studentId]
    );

    res.json({
      success: true,
      overall: overallResult.rows[0],
      subjects: summaryResult.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getStudentAttendance,
  getAttendanceSummary
};
