import api from './api';

export const routineService = {
  getRoutines: async (params = {}) => {
    const response = await api.get('/routines', { params });
    return response.data;
  },
  uploadRoutine: async (formData) => {
    const response = await api.post('/routines', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};
