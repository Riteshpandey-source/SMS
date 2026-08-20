import api from './api';

export const loginUser = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const getFacultySubjects = async () => {
  const response = await api.get('/faculty/subjects');
  return response.data.subjects;
};

export const getStudentsByClass = async ({ classId, subjectId }) => {
  const response = await api.get(`/faculty/classes/${classId}/students`, {
    params: { subjectId }
  });
  return response.data.students;
};

export const submitAttendance = async (payload) => {
  const response = await api.post('/attendance', payload);
  return response.data;
};

export const getStudentSummary = async (studentId) => {
  const response = await api.get(`/students/${studentId}/summary`);
  return response.data;
};

export const getStudentAttendance = async (studentId) => {
  const response = await api.get(`/students/${studentId}/attendance`);
  return response.data.attendance;
};
