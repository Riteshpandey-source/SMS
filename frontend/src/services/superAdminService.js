import api from './api';

export const superAdminService = {
  getDashboardMetrics: async () => {
    const response = await api.get('/super-admin/dashboard');
    return response.data;
  },

  getAllTenants: async (params) => {
    const response = await api.get('/super-admin/tenants', { params });
    return response.data;
  },

  getTenantById: async (id) => {
    const response = await api.get(`/super-admin/tenants/${id}`);
    return response.data;
  },

  updateTenantStatus: async (id, status) => {
    const response = await api.patch(`/super-admin/tenants/${id}/status`, { status });
    return response.data;
  },

  deleteTenant: async (id) => {
    const response = await api.delete(`/super-admin/tenants/${id}`);
    return response.data;
  }
};
