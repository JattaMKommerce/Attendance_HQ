import api from './api';

export const getEmployees = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.department_id) queryParams.append('department_id', filters.department_id);
  if (filters.status) queryParams.append('status', filters.status);
  
  const response = await api.get(`/employees?${queryParams.toString()}`);
  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (data) => {
  const response = await api.post('/employees', data);
  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await api.put(`/employees/${id}`, data);
  return response.data;
};

export const updateEmployeeStatus = async (id, status) => {
  const response = await api.patch(`/employees/${id}/status`, { status });
  return response.data;
};

export const resendInvitation = async (id) => {
  const response = await api.post(`/employees/${id}/resend-invite`);
  return response.data;
};

export const getLookups = async () => {
  const response = await api.get('/employees/lookups');
  return response.data;
};

export const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await api.post('/employees/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('document', file);
  const response = await api.post('/employees/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await api.post('/employees/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getEmployeeIdCardUrl = (id) => {
  return `${api.defaults.baseURL}/employees/${id}/id-card`;
};
