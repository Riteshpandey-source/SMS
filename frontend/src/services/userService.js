import api from './api';

export const userService = {
  // Get user profile
  getProfile: async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const role = storedUser ? JSON.parse(storedUser).role : null;
      if (role === 'parent') {
        const response = await api.get('/auth/parent/profile');
        const parentData = response.data.data.parent;
        return {
          user: parentData,
          stats: {},
          child: parentData.child
        };
      }
    } catch (e) {
      console.warn('Failed to parse parent role/fetch parent profile:', e);
    }
    const response = await api.get('/users/profile');
    return response.data.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data.data;
  },

  // Get dashboard data
  getDashboard: async () => {
    const response = await api.get('/users/dashboard');
    return response.data.data;
  },

  // Search users
  searchUsers: async (params) => {
    const response = await api.get('/users/search', { params });
    return response.data.data;
  },

  // Get user by ID
  getUserById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data.data;
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  // Delete avatar
  deleteAvatar: async () => {
    const response = await api.delete('/users/avatar');
    return response.data;
  },

  // Get avatar info
  getAvatarInfo: async (userId) => {
    const response = await api.get(`/users/avatar-info/${userId}`);
    return response.data.data;
  },

  // Get user preferences
  getPreferences: async () => {
    const response = await api.get('/users/preferences');
    return response.data.data;
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    const response = await api.put('/users/preferences', preferences);
    return response.data.data;
  },

  // Deactivate account
  deactivateAccount: async (password) => {
    const response = await api.post('/users/deactivate', { password });
    return response.data;
  },

  // Get avatar URL
  getAvatarUrl: (userId, size = 'medium') => {
    if (!userId) return null;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return `${baseUrl.replace('/api', '')}/api/users/avatar/${userId}/${size}`;
  },

  // Get all students (admin only)
  getStudents: async (params = {}) => {
    const response = await api.get('/users/students', { params });
    return response.data;
  },

  // Get all faculty (admin only)
  getFaculty: async (params = {}) => {
    const response = await api.get('/users/faculty', { params });
    return response.data;
  },

  // Get all users (admin only)
  getAllUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  }
};