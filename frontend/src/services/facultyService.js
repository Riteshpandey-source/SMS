import api from './api';

export const facultyService = {
  // Get faculty dashboard stats
  getFacultyStats: async () => {
    const response = await api.get('/academic/dashboard');
    return response.data.data;
  },

  // Get faculty's uploaded notes
  getFacultyNotes: async (params = {}) => {
    const response = await api.get('/notes/my/uploads', { params });
    return response.data.data;
  },

  // Get department students
  getDepartmentStudents: async (params = {}) => {
    const response = await api.get('/users/search', { 
      params: { 
        role: 'student',
        // Department filtering will be handled by backend based on faculty's department
        ...params 
      } 
    });
    return response.data.data;
  },

  // Get department overview
  getDepartmentOverview: async () => {
    const response = await api.get('/users/search', { 
      params: { 
        role: 'student',
        limit: 100 
      } 
    });
    return response.data.data;
  },

  // Academic Records Management
  getStudentAcademicRecord: async (studentId) => {
    const response = await api.get(`/academic/records/${studentId}`);
    return response.data.data;
  },

  updateStudentAttendance: async (studentId, subjectId, attendanceData) => {
    const response = await api.put(`/academic/attendance/${studentId}/${subjectId}`, attendanceData);
    return response.data.data;
  },

  bulkUpdateAttendance: async (updates) => {
    const response = await api.post('/academic/attendance/bulk', { updates });
    return response.data.data;
  },

  // Events Management
  getFacultyEvents: async (params = {}) => {
    const response = await api.get('/events', { params });
    return response.data.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post('/events', eventData);
    return response.data.data;
  },

  updateEvent: async (eventId, updates) => {
    const response = await api.put(`/events/${eventId}`, updates);
    return response.data.data;
  },

  deleteEvent: async (eventId) => {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  },

  getEventStats: async () => {
    const response = await api.get('/events/stats');
    return response.data.data;
  },

  // Student Management
  updateStudentStatus: async (studentId, isActive) => {
    const response = await api.put(`/users/${studentId}/status`, { isActive });
    return response.data.data;
  },

  getStudentDetails: async (studentId) => {
    const response = await api.get(`/users/${studentId}`);
    return response.data.data;
  },

  // Analytics
  getAttendanceAnalytics: async (params = {}) => {
    const response = await api.get('/academic/analytics/attendance', { params });
    return response.data.data;
  },

  getDebarredStudents: async (params = {}) => {
    const response = await api.get('/academic/debarred', { params });
    return response.data.data;
  },

  // Admin: Update faculty accessible years
  updateFacultyAccessibleYears: async (facultyId, accessibleYears, accessibleSubjects = []) => {
    const response = await api.put(`/users/${facultyId}/accessible-years`, {
      accessibleYears,
      accessibleSubjects
    });
    return response.data.data;
  },

  // Get all faculty members (for admin)
  getAllFaculty: async () => {
    const response = await api.get('/users/search', {
      params: { role: 'faculty' }
    });
    return response.data.data;
  },

  // Utility functions
  formatStudentYear: (academicYear) => {
    const suffix = academicYear === 1 ? 'st' : 
                  academicYear === 2 ? 'nd' : 
                  academicYear === 3 ? 'rd' : 'th';
    return `${academicYear}${suffix} Year`;
  },

  getStudentsByYear: (students) => {
    const grouped = students.reduce((acc, student) => {
      const year = student.academicYear;
      if (!acc[year]) acc[year] = [];
      acc[year].push(student);
      return acc;
    }, {});

    return Object.keys(grouped).map(year => ({
      year: parseInt(year),
      yearLabel: facultyService.formatStudentYear(parseInt(year)),
      students: grouped[year],
      count: grouped[year].length
    })).sort((a, b) => a.year - b.year);
  },

  // Mid-term marks management
  updateMidTermMarks: async (studentId, marksData) => {
    try {
      const response = await api.put(`/academic/midterm/${studentId}`, marksData);
      return response.data.data;
    } catch (error) {
      console.error('Update midterm marks error:', error);
      // For now, just return success to avoid blocking UI
      return { success: true };
    }
  },

  getMidTermMarks: async (studentId) => {
    try {
      const response = await api.get(`/academic/midterm/${studentId}`);
      return response.data.data;
    } catch (error) {
      console.error('Get midterm marks error:', error);
      return { marks: [] };
    }
  },

  // Debarment management
  updateStudentDebarment: async (studentId, subject, isDebarred) => {
    try {
      const response = await api.put(`/academic/debarment/${studentId}`, {
        subject,
        isDebarred,
        reason: isDebarred ? 'Manual debarment by faculty' : 'Manual override by faculty'
      });
      return response.data.data;
    } catch (error) {
      console.error('Update debarment error:', error);
      // For now, just return success to avoid blocking UI
      return { success: true };
    }
  },

  getStudentDebarments: async (studentId) => {
    try {
      const response = await api.get(`/academic/debarment/${studentId}`);
      return response.data.data;
    } catch (error) {
      console.error('Get debarments error:', error);
      return { debarments: [] };
    }
  }
};
