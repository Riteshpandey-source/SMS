import api from './api';

// Daily Attendance Service
export const dailyAttendanceService = {
  // Create new attendance session
  createSession: async (sessionData) => {
    const response = await api.post('/daily-attendance/sessions', sessionData);
    return response.data;
  },

  // Get attendance session details
  getSession: async (sessionId) => {
    const response = await api.get(`/daily-attendance/sessions/${sessionId}`);
    return response.data;
  },

  // Get faculty attendance sessions
  getFacultySessions: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const response = await api.get(`/daily-attendance/faculty/sessions?${queryParams}`);
    return response.data;
  },

  getFacultySubjectSummary: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const response = await api.get(`/daily-attendance/faculty/summary?${queryParams}`);
    return response.data;
  },

  getFacultyAccessConfig: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const response = await api.get(`/daily-attendance/faculty/access-config?${queryParams}`);
    return response.data;
  },

  // Update individual student attendance
  updateStudentAttendance: async (sessionId, studentData) => {
    const response = await api.put(`/daily-attendance/sessions/${sessionId}/student`, studentData);
    return response.data;
  },

  // Bulk update student attendance
  bulkUpdateAttendance: async (sessionId, attendanceData) => {
    const response = await api.put(`/daily-attendance/sessions/${sessionId}/bulk`, {
      attendanceData
    });
    return response.data;
  },

  // Submit attendance session
  submitSession: async (sessionId) => {
    const response = await api.post(`/daily-attendance/sessions/${sessionId}/submit`);
    return response.data;
  },

  // Get student attendance records
  getStudentAttendance: async (studentId, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const response = await api.get(`/daily-attendance/student/${studentId}?${queryParams}`);
    return response.data;
  },

  // Get department daily attendance (all students in department)
  getDepartmentAttendance: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    console.log('🌐 DailyAttendanceService: getDepartmentAttendance called');
    console.log('🌐 Filters:', filters);
    console.log('🌐 Query params:', queryParams.toString());
    
    const response = await api.get(`/daily-attendance/department?${queryParams}`);
    
    console.log('🌐 Department daily attendance response:', response.data);
    return response.data;
  },

  // Get department daily attendance (PUBLIC - no authentication required)
  getPublicDepartmentAttendance: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    console.log('🌐 DailyAttendanceService: getPublicDepartmentAttendance called');
    console.log('🌐 Filters:', filters);
    
    // Get base URL from environment or use default
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const url = `${baseURL}/daily-attendance/public/department?${queryParams}`;
    
    console.log('🌐 Fetching from:', url);
    
    // Use fetch directly without auth token
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      throw new Error(`Failed to fetch public attendance data: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🌐 Public department daily attendance response:', data);
    return data;
  },

  // Get attendance statistics
  getStatistics: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const response = await api.get(`/daily-attendance/statistics?${queryParams}`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/daily-attendance/health');
    return response.data;
  },

  // Add guest student to session (manually added by faculty)
  addGuestStudent: async (sessionId, guestData) => {
    const response = await api.post(`/daily-attendance/sessions/${sessionId}/guest`, guestData);
    return response.data;
  },

  // Remove student from session
  removeStudent: async (sessionId, studentEmail) => {
    const response = await api.delete(`/daily-attendance/sessions/${sessionId}/student/${encodeURIComponent(studentEmail)}`);
    return response.data;
  }
};

export default dailyAttendanceService;
