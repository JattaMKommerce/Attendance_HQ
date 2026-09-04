import api from './api';

export const leaveApi = {
  getLeaveTypes: () => api.get('/leaves/types'),
  createLeaveType: (data) => api.post('/leaves/types', data),
  
  getRequests: (filters) => api.get('/leaves/requests', { params: filters }),
  reviewRequest: (id, data) => api.post(`/leaves/${id}/review`, data),
  
  getDashboardMetrics: () => api.get('/leaves/dashboard'),
  getCalendarLeaves: (startDate, endDate) => api.get('/leaves/calendar', { params: { startDate, endDate } }),
  
  getAllBalances: (search) => api.get('/leaves/balances', { params: { search } }),
  adjustBalance: (data) => api.post('/leaves/balances/adjust', data),
  
  // Holidays
  getHolidays: (params) => api.get('/leaves/holidays', { params }),
  createHoliday: (data) => api.post('/leaves/holidays', data),
  updateHoliday: (id, data) => api.put(`/leaves/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/leaves/holidays/${id}`),
  
  downloadDocument: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' })
};
