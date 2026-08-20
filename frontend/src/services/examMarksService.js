import api from './api';

const examMarksService = {
  saveMarks: async (payload) => {
    const res = await api.post('/exam-marks/bulk', payload);
    return res.data;
  },
  getFacultyMarks: async (params = {}) => {
    const res = await api.get('/exam-marks/faculty', { params });
    return res.data;
  },
  getStudentMarks: async (studentId, params = {}) => {
    const res = await api.get(`/exam-marks/student/${studentId}`, { params });
    return res.data;
  }
};

export default examMarksService;
