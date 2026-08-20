import api from './api';

class AcademicService {
  // Format marks data for backend API
  formatMarksForBackend(marksData) {
    if (!Array.isArray(marksData)) {
      console.warn('formatMarksForBackend: marksData is not an array', marksData);
      return [];
    }

    return marksData.map(mark => ({
      subjectCode: (mark.subjectCode || mark.code || '')?.toString().toUpperCase(),
      subjectName: mark.subjectName || mark.name || `Subject ${mark.subjectCode || mark.code || ''}`,
      subjectId: mark.subjectId || mark.subjectCode || mark.code || mark.id,
      obtainedMarks: parseFloat(mark.obtainedMarks || mark.marks || 0),
      maxMarks: parseFloat(mark.maxMarks || 100),
      examDate: mark.examDate || new Date().toISOString()
    }));
  }

  // Format attendance data for backend API
  formatAttendanceForBackend(attendanceData) {
    return {
      attendedClasses: parseInt(attendanceData.attendedClasses || attendanceData.attended || 0, 10),
      totalClasses: parseInt(attendanceData.totalClasses || attendanceData.total || 0, 10),
      subjectCode: attendanceData.subjectCode?.toString().toUpperCase(),
      subjectName: attendanceData.subjectName || `Subject ${attendanceData.subjectCode || ''}`,
      academicYear: attendanceData.academicYear || 1,
      semester: attendanceData.semester || 'current'
    };
  }

  // Get student's academic records
  async getAcademicRecords(studentId, academicYear = null, semester = null) {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (semester) params.append('semester', semester);
      
      const queryString = params.toString();
      const url = `/academic/records/${studentId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch academic records:', error);
      throw this.handleError(error);
    }
  }

  // Get student's attendance records
  async getAttendance(studentId, academicYear = null, semester = null, subjectCode = null) {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (semester) params.append('semester', semester);
      if (subjectCode) params.append('subjectCode', subjectCode);
      
      const queryString = params.toString();
      const url = `/academic/attendance/${studentId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      throw this.handleError(error);
    }
  }

  // Update attendance for a student
  async updateAttendance(studentId, subjectId, attendanceData) {
    try {
      // Validate before formatting
      const validationErrors = this.validateAttendance(attendanceData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Format data for backend
      const formattedData = this.formatAttendanceForBackend(attendanceData);

      console.log('📤 Sending attendance payload:', JSON.stringify(formattedData, null, 2));

      const response = await api.put(`/academic/attendance/${studentId}/${subjectId}`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Failed to update attendance:', error);
      throw this.handleError(error);
    }
  }

  // Delete attendance for a student
  async deleteAttendance(studentId, subjectId) {
    try {
      console.log('🗑️ Deleting attendance:', { studentId, subjectId });
      const response = await api.delete(`/academic/attendance/${studentId}/${subjectId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      throw this.handleError(error);
    }
  }

  // Bulk update attendance
  async bulkUpdateAttendance(updates, academicYear = null, semester = null) {
    try {
      const payload = {
        updates,
        ...(academicYear && { academicYear }),
        ...(semester && { semester })
      };
      
      console.log('📤 Bulk attendance payload:', JSON.stringify(payload, null, 2));
      
      const response = await api.post('/academic/attendance/bulk', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to bulk update attendance:', error);
      throw this.handleError(error);
    }
  }

  // Get mid-term marks
  async getMidTermMarks(studentId, academicYear = null, semester = null) {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (semester) params.append('semester', semester);
      
      const queryString = params.toString();
      const url = `/academic/midterm/${studentId}${queryString ? `?${queryString}` : ''}`;
      
      console.log('📊 AcademicService: Making API call to:', url);
      console.log('📊 AcademicService: Student ID:', studentId, 'Academic Year:', academicYear, 'Semester:', semester);
      
      const response = await api.get(url);
      console.log('📊 AcademicService: API response:', response);
      console.log('📊 AcademicService: Response data structure:', {
        hasData: !!response.data,
        hasMarks: !!response.data?.marks,
        hasMidTermMarks: !!response.data?.midTermMarks,
        marksCount: response.data?.marks?.length || 0,
        midTermMarksCount: response.data?.midTermMarks?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error('📊 AcademicService: Failed to fetch mid-term marks:', error);
      console.error('📊 AcademicService: Error details:', error.response?.data || error.message);
      throw this.handleError(error);
    }
  }

  // Update mid-term marks
  async updateMidTermMarks(studentId, marks, academicYear = null, semester = null) {
    try {
      // Validate before formatting
      const validationErrors = this.validateMarks(marks);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Format data for backend
      const formattedMarks = this.formatMarksForBackend(marks);

      const payload = {
        marks: formattedMarks,
        academicYear: academicYear || 1,
        semester: semester || 'current'
      };

      console.log('📤 Sending marks payload:', JSON.stringify(payload, null, 2));

      const response = await api.put(`/academic/midterm/${studentId}`, payload);
      return response.data;
    } catch (error) {
      console.error('Failed to update mid-term marks:', error);
      throw this.handleError(error);
    }
  }

  // Get student debarment status
  async getStudentDebarments(studentId) {
    try {
      const response = await api.get(`/academic/debarment/${studentId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch debarment status:', error);
      throw this.handleError(error);
    }
  }

  // Update student debarment status
  async updateStudentDebarment(studentId, subject, isDebarred, reason = null) {
    try {
      const payload = {
        subject,
        isDebarred,
        ...(reason && { reason })
      };
      
      const response = await api.put(`/academic/debarment/${studentId}`, payload);
      return response.data;
    } catch (error) {
      console.error('Failed to update debarment status:', error);
      throw this.handleError(error);
    }
  }

  // Get attendance analytics
  async getAttendanceAnalytics(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `/academic/attendance/analytics${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch attendance analytics:', error);
      throw this.handleError(error);
    }
  }

  // Get debarred students list
  async getDebarredStudents(filters = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `/academic/debarred${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch debarred students:', error);
      throw this.handleError(error);
    }
  }

  // Get department attendance - all students in a department
  async getDepartmentAttendance(department, academicYear = null, semester = null) {
    try {
      const params = new URLSearchParams();
      params.append('department', department);
      if (academicYear) params.append('academicYear', academicYear);
      if (semester) params.append('semester', semester);
      
      const queryString = params.toString();
      const url = `/academic/department/attendance?${queryString}`;
      
      console.log('🌐 AcademicService: getDepartmentAttendance called');
      console.log('🌐 AcademicService: URL:', url);
      console.log('🌐 AcademicService: Params:', { department, academicYear, semester });
      
      const response = await api.get(url);
      
      console.log('🌐 AcademicService: Response received');
      console.log('🌐 AcademicService: Response status:', response.status);
      console.log('🌐 AcademicService: Response data structure:', {
        success: response.data?.success,
        hasData: !!response.data?.data,
        studentsCount: response.data?.data?.students?.length || 0,
        department: response.data?.data?.department
      });
      
      if (response.data?.data?.students?.length > 0) {
        const firstStudent = response.data.data.students[0];
        console.log('🌐 AcademicService: Sample student:', {
          name: firstStudent.name,
          department: firstStudent.department,
          attendanceRecords: firstStudent.attendance?.length || 0,
          sampleAttendance: firstStudent.attendance?.[0] || null
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('🌐 AcademicService: getDepartmentAttendance failed:', error);
      console.error('🌐 AcademicService: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw this.handleError(error);
    }
  }

  // Get all students attendance (for admin/faculty view)
  async getAllStudentsAttendance(academicYear = null, semester = null) {
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYear', academicYear);
      if (semester) params.append('semester', semester);
      
      const queryString = params.toString();
      const url = `/academic/all-students/attendance${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all students attendance:', error);
      throw this.handleError(error);
    }
  }

  // Calculate grade from marks
  calculateGrade(obtainedMarks, maxMarks = 100) {
    const percentage = (obtainedMarks / maxMarks) * 100;
    
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 35) return 'D';
    return 'F';
  }

  // Calculate attendance percentage
  calculateAttendancePercentage(attendedClasses, totalClasses) {
    if (totalClasses === 0) return 0;
    return Math.round((attendedClasses / totalClasses) * 10000) / 100;
  }

  // Get attendance status
  getAttendanceStatus(percentage, requiredPercentage = 75) {
    if (percentage >= requiredPercentage) {
      return { 
        status: 'good', 
        message: 'Attendance is satisfactory',
        color: 'green'
      };
    } else if (percentage >= requiredPercentage - 5) {
      return { 
        status: 'warning', 
        message: 'Attendance is below required but not critical',
        color: 'yellow'
      };
    } else {
      return { 
        status: 'critical', 
        message: 'Student is debarred due to low attendance',
        color: 'red'
      };
    }
  }

  // Check if student is debarred based on attendance
  isDebarred(attendancePercentage, requiredPercentage = 75) {
    return attendancePercentage < requiredPercentage;
  }

  // Handle API errors
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(data?.error?.message || 'Invalid request data');
        case 401:
          return new Error('Authentication required');
        case 403:
          return new Error(data?.error?.message || 'Access denied');
        case 404:
          return new Error('Academic record not found');
        case 500:
          return new Error('Server error occurred');
        default:
          return new Error(data?.error?.message || 'An unexpected error occurred');
      }
    } else if (error.request) {
      // Network error
      return new Error('Network error - please check your connection');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  // Validate marks data
  validateMarks(marks, maxMarks = 100) {
    const errors = [];
    
    if (!Array.isArray(marks)) {
      errors.push('Marks must be an array');
      return errors;
    }
    
    marks.forEach((mark, index) => {
      if (!mark.subjectCode) {
        errors.push(`Subject code is required for mark ${index + 1}`);
      }
      
      if (typeof mark.obtainedMarks !== 'number' || mark.obtainedMarks < 0) {
        errors.push(`Invalid obtained marks for ${mark.subjectCode || `mark ${index + 1}`}`);
      }
      
      if (mark.obtainedMarks > (mark.maxMarks || maxMarks)) {
        errors.push(`Obtained marks cannot exceed maximum marks for ${mark.subjectCode || `mark ${index + 1}`}`);
      }
    });
    
    return errors;
  }

  // Validate attendance data
  validateAttendance(attendanceData) {
    const errors = [];
    
    if (typeof attendanceData.attendedClasses !== 'number' || attendanceData.attendedClasses < 0) {
      errors.push('Attended classes must be a non-negative number');
    }
    
    if (typeof attendanceData.totalClasses !== 'number' || attendanceData.totalClasses < 0) {
      errors.push('Total classes must be a non-negative number');
    }
    
    if (attendanceData.attendedClasses > attendanceData.totalClasses) {
      errors.push('Attended classes cannot exceed total classes');
    }
    
    return errors;
  }
}

// Create and export singleton instance
const academicService = new AcademicService();
export default academicService;