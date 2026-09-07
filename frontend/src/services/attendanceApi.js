import api from './api';

export const attendanceApi = {
  // Overview
  getOverview: (date, filters = {}) => api.get(`/attendance/overview`, { params: { date, ...filters } }),
  
  // Records
  getRecords: (filters) => api.get('/attendance/records', { params: filters }),
  addManualRecord: (data) => api.post('/attendance/records/manual', data),
  getEmployeeHistory: (employeeId, params) => api.get(`/attendance/employee/${employeeId}/history`, { params }),
  
  // Regularization
  getRegularizationRequests: (filters) => api.get('/attendance/regularization', { params: filters }),
  createRegularizationRequest: (data) => api.post('/attendance/regularization', data),
  updateRegularizationRequest: (id, data) => api.patch(`/attendance/regularization/${id}`, data),
  
  // Shifts
  getShifts: () => api.get('/attendance/shifts'),
  createShift: (data) => api.post('/attendance/shifts', data)
};
