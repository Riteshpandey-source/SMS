import api from './api';

export const assignmentService = {
  // Get all assignments
  getAllAssignments: async (params = {}) => {
    const response = await api.get('/assignments', { params });
    return response.data;
  },

  // Get assignment statistics
  getAssignmentStats: async () => {
    const response = await api.get('/assignments/stats');
    return response.data;
  },

  // Alias for getAssignmentStats to match calling components
  getAssignmentStatistics: async () => {
    const response = await api.get('/assignments/stats');
    return response.data;
  },

  // Get unassigned users
  getUnassignedUsers: async () => {
    const response = await api.get('/assignments/unassigned');
    return response.data;
  },

  // Create new assignment
  createAssignment: async (assignmentData) => {
    const response = await api.post('/assignments', assignmentData);
    return response.data;
  },

  // Update assignment
  updateAssignment: async (assignmentId, updateData) => {
    const response = await api.put(`/assignments/${assignmentId}`, updateData);
    return response.data;
  },

  // Delete assignment
  deleteAssignment: async (assignmentId) => {
    const response = await api.delete(`/assignments/${assignmentId}`);
    return response.data;
  },

  // Bulk assign students
  bulkAssignStudents: async () => {
    const response = await api.post('/assignments/bulk-assign');
    return response.data;
  },

  // Bulk assign by department
  bulkAssignByDepartment: async (department) => {
    const response = await api.post('/assignments/bulk-assign-department', { department });
    return response.data;
  },

  // Get my assigned faculty (for students)
  getMyFaculty: async () => {
    const response = await api.get('/assignments/my-faculty');
    return response.data;
  },

  // Get my assigned students (for faculty)
  getMyStudents: async () => {
    const response = await api.get('/assignments/my-students');
    return response.data;
  },

  // Refresh assignments
  refreshAssignments: async () => {
    const response = await api.post('/assignments/refresh');
    return response.data;
  },

  // Get audit logs
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/assignments/audit-logs', { params });
    return response.data;
  },

  // Alias for audit logs to support both naming styles in frontend components
  getAssignmentAuditLogs: async (params = {}) => {
    const response = await api.get('/assignments/audit-logs', { params });
    return response.data;
  },

  // Export audit logs
  exportAuditLogs: async (params = {}) => {
    const response = await api.get('/assignments/audit-logs/export', { 
      params,
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `assignment-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  // Get assignment coverage report
  getCoverageReport: async () => {
    const response = await api.get('/assignments/coverage-report');
    return response.data;
  },

  // Get faculty workload report
  getFacultyWorkloadReport: async () => {
    const response = await api.get('/assignments/faculty-workload');
    return response.data;
  }
};