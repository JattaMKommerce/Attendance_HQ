import api from './api';

export const rosterApi = {
  getRoster: (filters) => api.get('/roster', { params: filters }),
  bulkAssign: (data) => api.post('/roster/bulk-assign', data),
  updateIndividual: (id, data) => api.patch(`/roster/individual/${id}`, data),
  publishRoster: (data) => api.post('/roster/publish', data),
  copyRoster: (data) => api.post('/roster/copy', data),
  getTemplates: () => api.get('/roster/templates'),
  applyTemplate: (data) => api.post('/roster/templates/apply', data)
};
