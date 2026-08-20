const AcademicRecord = require('../models/AcademicRecord');

// Grade calculation utilities
const gradeUtils = {
  // Calculate grade from percentage
  calculateGrade(percentage) {
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
  },

  // Get grade points from grade
  getGradePoints(grade) {
    const gradePointsMap = {
      'A+': 10, 'A': 9, 'A-': 8.5,
      'B+': 8, 'B': 7, 'B-': 6.5,
      'C+': 6, 'C': 5, 'C-': 4.5,
      'D': 4, 'F': 0
    };
    return gradePointsMap[grade] || 0;
  },

  // Get grade description
  getGradeDescription(grade) {
    const descriptions = {
      'A+': 'Outstanding',
      'A': 'Excellent',
      'A-': 'Very Good',
      'B+': 'Good',
      'B': 'Above Average',
      'B-': 'Average',
      'C+': 'Below Average',
      'C': 'Satisfactory',
      'C-': 'Poor',
      'D': 'Very Poor',
      'F': 'Fail'
    };
    return descriptions[grade] || 'Unknown';
  },

  // Check if grade is passing
  isPassingGrade(grade) {
    return grade !== 'F';
  }
};

// CGPA/SGPA calculation utilities
const gpaUtils = {
  // Calculate SGPA for a semester
  calculateSGPA(finalMarks, subjects) {
    if (!finalMarks || finalMarks.length === 0) {
      return 0;
    }

    let totalGradePoints = 0;
    let totalCredits = 0;

    finalMarks.forEach(mark => {
      const subject = subjects.find(s => s.subjectId === mark.subjectId);
      if (subject && mark.gradePoints !== undefined) {
        totalGradePoints += mark.gradePoints * subject.credits;
        totalCredits += subject.credits;
      }
    });

    return totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
  },

  // Calculate CGPA across multiple semesters
  async calculateCGPA(studentId) {
    try {
      const records = await AcademicRecord.find({ studentId }).sort({ academicYear: 1, semester: 1 });
      
      if (!records || records.length === 0) {
        return 0;
      }

      let totalGradePoints = 0;
      let totalCredits = 0;

      records.forEach(record => {
        if (record.sgpa > 0 && record.totalCredits > 0) {
          totalGradePoints += record.sgpa * record.totalCredits;
          totalCredits += record.totalCredits;
        }
      });

      return totalCredits > 0 ? Math.round((totalGradePoints / totalCredits) * 100) / 100 : 0;
    } catch (error) {
      console.error('Error calculating CGPA:', error);
      return 0;
    }
  },

  // Get GPA classification
  getGPAClassification(gpa) {
    if (gpa >= 9.0) return { class: 'First Class with Distinction', description: 'Outstanding' };
    if (gpa >= 7.5) return { class: 'First Class', description: 'Excellent' };
    if (gpa >= 6.0) return { class: 'Second Class', description: 'Good' };
    if (gpa >= 5.0) return { class: 'Third Class', description: 'Average' };
    if (gpa >= 4.0) return { class: 'Pass Class', description: 'Satisfactory' };
    return { class: 'Fail', description: 'Below Standard' };
  }
};

// Attendance calculation utilities
const attendanceUtils = {
  // Calculate attendance percentage
  calculateAttendancePercentage(attendedClasses, totalClasses) {
    if (totalClasses === 0) return 0;
    return Math.round((attendedClasses / totalClasses) * 10000) / 100;
  },

  // Check if student is debarred
  isDebarred(attendancePercentage, requiredPercentage = 75) {
    return attendancePercentage < requiredPercentage;
  },

  // Calculate classes needed to reach required percentage
  calculateClassesNeeded(currentAttended, currentTotal, requiredPercentage = 75) {
    if (currentTotal === 0) return 0;
    
    const currentPercentage = (currentAttended / currentTotal) * 100;
    if (currentPercentage >= requiredPercentage) return 0;

    // Calculate how many consecutive classes need to be attended
    let classesNeeded = 0;
    let attended = currentAttended;
    let total = currentTotal;

    while ((attended / total) * 100 < requiredPercentage) {
      attended++;
      total++;
      classesNeeded++;
      
      // Safety check to prevent infinite loop
      if (classesNeeded > 100) break;
    }

    return classesNeeded;
  },

  // Get attendance status
  getAttendanceStatus(percentage, requiredPercentage = 75) {
    if (percentage >= requiredPercentage) {
      return { status: 'good', message: 'Attendance is satisfactory' };
    } else if (percentage >= requiredPercentage - 5) {
      return { status: 'warning', message: 'Attendance is below required but not critical' };
    } else {
      return { status: 'critical', message: 'Student is debarred due to low attendance' };
    }
  }
};

// Academic analytics utilities
const analyticsUtils = {
  // Calculate class statistics
  async getClassStatistics(department, academicYear, semester) {
    try {
      const stats = await AcademicRecord.getClassStatistics(department, academicYear, semester);
      return stats[0] || {
        totalStudents: 0,
        averageCGPA: 0,
        averageSGPA: 0,
        averageAttendance: 0,
        debarredCount: 0
      };
    } catch (error) {
      console.error('Error getting class statistics:', error);
      return null;
    }
  },

  // Get subject-wise performance
  async getSubjectPerformance(subjectCode, department, academicYear, semester) {
    try {
      const records = await AcademicRecord.find({
        department,
        academicYear,
        semester,
        'midTermMarks.subjectCode': subjectCode
      });

      if (!records || records.length === 0) {
        return null;
      }

      const performances = [];
      records.forEach(record => {
        const subjectMark = record.midTermMarks.find(mark => mark.subjectCode === subjectCode);
        if (subjectMark) {
          performances.push({
            studentId: record.studentId,
            percentage: subjectMark.percentage,
            grade: subjectMark.grade,
            gradePoints: subjectMark.gradePoints
          });
        }
      });

      // Calculate statistics
      const totalStudents = performances.length;
      const averagePercentage = performances.reduce((sum, p) => sum + p.percentage, 0) / totalStudents;
      const averageGradePoints = performances.reduce((sum, p) => sum + p.gradePoints, 0) / totalStudents;
      
      const gradeDistribution = {};
      performances.forEach(p => {
        gradeDistribution[p.grade] = (gradeDistribution[p.grade] || 0) + 1;
      });

      const passCount = performances.filter(p => p.grade !== 'F').length;
      const passPercentage = (passCount / totalStudents) * 100;

      return {
        subjectCode,
        totalStudents,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        averageGradePoints: Math.round(averageGradePoints * 100) / 100,
        passPercentage: Math.round(passPercentage * 100) / 100,
        gradeDistribution,
        highestScore: Math.max(...performances.map(p => p.percentage)),
        lowestScore: Math.min(...performances.map(p => p.percentage))
      };
    } catch (error) {
      console.error('Error getting subject performance:', error);
      return null;
    }
  },

  // Get student ranking
  async getStudentRanking(studentId, department, academicYear, semester) {
    try {
      const records = await AcademicRecord.find({
        department,
        academicYear,
        semester
      }).sort({ cgpa: -1, sgpa: -1 });

      const studentIndex = records.findIndex(record => 
        record.studentId.toString() === studentId.toString()
      );

      if (studentIndex === -1) {
        return null;
      }

      return {
        rank: studentIndex + 1,
        totalStudents: records.length,
        percentile: Math.round(((records.length - studentIndex) / records.length) * 100)
      };
    } catch (error) {
      console.error('Error getting student ranking:', error);
      return null;
    }
  }
};

// Academic record utilities
const recordUtils = {
  // Format academic record for display
  formatAcademicRecord(record) {
    return {
      id: record._id,
      studentId: record.studentId,
      academicYear: record.academicYear,
      semester: record.semester,
      department: record.department,
      cgpa: record.cgpa,
      sgpa: record.sgpa,
      totalCredits: record.totalCredits,
      earnedCredits: record.earnedCredits,
      overallAttendance: record.overallAttendance,
      isDebarred: record.isDebarred,
      debarredSubjects: record.debarredSubjects,
      academicStatus: record.academicStatus,
      attendanceSummary: record.attendanceSummary,
      marksSummary: record.marksSummary,
      gpaClassification: gpaUtils.getGPAClassification(record.cgpa),
      lastCalculated: record.lastCalculated,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  },

  // Validate academic year progression
  validateAcademicProgression(currentYear, currentSemester, newYear, newSemester) {
    // Simple validation - can be made more complex based on institution rules
    if (newYear < currentYear) {
      return { valid: false, message: 'Cannot move to a previous academic year' };
    }
    
    if (newYear === currentYear && newSemester <= currentSemester) {
      return { valid: false, message: 'Cannot move to a previous or same semester' };
    }
    
    if (newYear > currentYear + 1) {
      return { valid: false, message: 'Cannot skip academic years' };
    }
    
    return { valid: true, message: 'Academic progression is valid' };
  },

  // Generate academic transcript
  async generateTranscript(studentId) {
    try {
      const records = await AcademicRecord.find({ studentId })
        .populate('studentId', 'name email department academicYear')
        .sort({ academicYear: 1, semester: 1 });

      if (!records || records.length === 0) {
        return null;
      }

      const student = records[0].studentId;
      const overallCGPA = await gpaUtils.calculateCGPA(studentId);
      
      return {
        student: {
          name: student.name,
          email: student.email,
          department: student.department,
          currentYear: student.academicYear
        },
        overallCGPA,
        gpaClassification: gpaUtils.getGPAClassification(overallCGPA),
        semesters: records.map(record => ({
          academicYear: record.academicYear,
          semester: record.semester,
          sgpa: record.sgpa,
          totalCredits: record.totalCredits,
          earnedCredits: record.earnedCredits,
          overallAttendance: record.overallAttendance,
          subjects: record.subjects,
          finalMarks: record.finalMarks,
          academicStatus: record.academicStatus
        })),
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating transcript:', error);
      return null;
    }
  }
};

module.exports = {
  gradeUtils,
  gpaUtils,
  attendanceUtils,
  analyticsUtils,
  recordUtils
};