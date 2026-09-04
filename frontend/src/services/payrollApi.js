import api from './api';

export const payrollApi = {
  getSalaries: () => api.get('/payroll/salaries'),
  updateSalary: (data) => api.post('/payroll/salaries', data),
  
  getRuns: () => api.get('/payroll/runs'),
  previewRun: (month, year) => api.get('/payroll/preview', { params: { month, year } }),
  processRun: (data) => api.post('/payroll/process', data),
  
  getPayslips: () => api.get('/payroll/payslips')
};
