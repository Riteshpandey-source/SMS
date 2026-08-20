import api from './api';

/**
 * Admin Hierarchy Service
 * Handles API calls for faculty-student hierarchy in admin panel
 */

export const adminHierarchyService = {
  /**
   * Get all faculty with student counts, grouped by department
   * @param {Object} filters - Optional filters { department, year }
   * @returns {Promise<Object>} Faculty hierarchy data
   */
  getFacultyHierarchy: async (filters = {}) => {
    try {
      const params = {};
      
      if (filters.department) {
        params.department = filters.department;
      }
      
      if (filters.year) {
        params.year = filters.year;
      }
      
      const response = await api.get('/admin/faculty-hierarchy', { params });
      
      return {
        success: true,
        data: response.data.data,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Get faculty hierarchy error:', error);
      
      return {
        success: false,
        error: {
          message: error.response?.data?.error?.message || 'Failed to fetch faculty hierarchy',
          code: error.response?.data?.error?.code || 'FETCH_ERROR',
          details: error.response?.data?.error?.details || error.message
        }
      };
    }
  },

  /**
   * Get students assigned to a specific faculty member
   * @param {string} facultyId - Faculty member's ID
   * @returns {Promise<Object>} Faculty's students data
   */
  getFacultyStudents: async (facultyId) => {
    try {
      if (!facultyId) {
        throw new Error('Faculty ID is required');
      }
      
      const response = await api.get(`/admin/faculty/${facultyId}/students`);
      
      return {
        success: true,
        data: response.data.data,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Get faculty students error:', error);
      
      return {
        success: false,
        error: {
          message: error.response?.data?.error?.message || 'Failed to fetch faculty students',
          code: error.response?.data?.error?.code || 'FETCH_ERROR',
          details: error.response?.data?.error?.details || error.message
        }
      };
    }
  },

  /**
   * Get detailed student information including academic records and parent info
   * @param {string} studentId - Student's ID
   * @returns {Promise<Object>} Student details data
   */
  getStudentDetails: async (studentId) => {
    try {
      if (!studentId) {
        throw new Error('Student ID is required');
      }
      
      const response = await api.get(`/admin/students/${studentId}/details`);
      
      return {
        success: true,
        data: response.data.data,
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Get student details error:', error);
      
      return {
        success: false,
        error: {
          message: error.response?.data?.error?.message || 'Failed to fetch student details',
          code: error.response?.data?.error?.code || 'FETCH_ERROR',
          details: error.response?.data?.error?.details || error.message
        }
      };
    }
  },

  /**
   * Search faculty by name or email
   * @param {string} query - Search query
   * @param {Array} facultyList - List of faculty to search through
   * @returns {Array} Filtered faculty list
   */
  searchFaculty: (query, facultyList) => {
    if (!query || !facultyList) return facultyList;
    
    const searchTerm = query.toLowerCase().trim();
    
    return facultyList.filter(faculty => 
      faculty.name.toLowerCase().includes(searchTerm) ||
      faculty.email.toLowerCase().includes(searchTerm) ||
      faculty.department.toLowerCase().includes(searchTerm)
    );
  },

  /**
   * Search students by name or email
   * @param {string} query - Search query
   * @param {Array} studentList - List of students to search through
   * @returns {Array} Filtered student list
   */
  searchStudents: (query, studentList) => {
    if (!query || !studentList) return studentList;
    
    const searchTerm = query.toLowerCase().trim();
    
    return studentList.filter(student => 
      student.name.toLowerCase().includes(searchTerm) ||
      student.email.toLowerCase().includes(searchTerm) ||
      student.department.toLowerCase().includes(searchTerm)
    );
  },

  /**
   * Get department color for visual coding
   * @param {string} department - Department code
   * @returns {Object} Color classes for the department
   */
  getDepartmentColor: (department) => {
    const colors = {
      'CS': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
      'ECE': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
      'ME': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
      'EE': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      'IT': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
      'CSAI': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
      'AIDS': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
      'CIVIL': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
      'Administration': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
    };
    
    return colors[department] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  },

  /**
   * Format academic year display
   * @param {number} year - Academic year (1-4)
   * @returns {string} Formatted year string
   */
  formatAcademicYear: (year) => {
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };
    return `${year}${suffixes[year] || 'th'} Year`;
  },

  /**
   * Calculate overall grade from marks
   * @param {Array} marks - Array of subject marks
   * @returns {Object} Overall grade info
   */
  calculateOverallGrade: (marks) => {
    if (!marks || marks.length === 0) {
      return { grade: 'N/A', percentage: 0, totalObtained: 0, totalMax: 0 };
    }
    
    let totalObtained = 0;
    let totalMax = 0;
    
    marks.forEach(mark => {
      totalObtained += mark.marksObtained || 0;
      totalMax += mark.totalMarks || 0;
    });
    
    const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';
    
    return { grade, percentage, totalObtained, totalMax };
  }
};

export default adminHierarchyService;
