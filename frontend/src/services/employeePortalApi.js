/**
 * Employee Portal API Service
 * Maps to backend /api/employee routes.
 * All calls are scoped to the authenticated employee by the server.
 */

import api from './api';

export const employeePortalApi = {
  // ─── AUTH / ME ─────────────────────────────────────────────────────────────
  getMe: () => api.get('/auth/me'),

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  getDashboard: () => api.get('/employee/dashboard'),

  // ─── PROFILE ───────────────────────────────────────────────────────────────
  getMyProfile: () => api.get('/employee/profile'),
  updateMyProfile: (data) => api.put('/employee/profile', data),
  uploadPhoto: (formData) => api.post('/employee/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword: (data) => api.post('/employee/change-password', data),

  // ─── ATTENDANCE ────────────────────────────────────────────────────────────
  getTodayAttendance: () => api.get('/employee/attendance/today'),
  checkIn: (data = {}) => api.post('/employee/attendance/check-in', data),
  checkOut: (data = {}) => api.post('/employee/attendance/check-out', data),
  getMyAttendance: (params) => api.get('/employee/attendance', { params }),

  // ─── SHIFT & HOLIDAYS ──────────────────────────────────────────────────────
  getMyShift: () => api.get('/employee/shift'),
  getHolidays: () => api.get('/employee/holidays'),

  // ─── LEAVE MANAGEMENT ──────────────────────────────────────────────────────
  getLeaveTypes: () => api.get('/employee/leaves/types'),
  getMyLeaveBalance: () => api.get('/employee/leaves/balance'),
  getMyLeaves: (params) => api.get('/employee/leaves', { params }),
  applyLeave: (formData) => api.post('/employee/leaves', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  cancelLeave: (id) => api.delete(`/employee/leaves/${id}`),

  // ─── PAYSLIPS ──────────────────────────────────────────────────────────────
  getMyPayslips: (params) => api.get('/employee/payslips', { params }),
  downloadPayslip: (id) => api.get(`/employee/payslips/${id}/download`, { responseType: 'blob' }),

  // ─── DOCUMENTS ─────────────────────────────────────────────────────────────
  getMyDocuments: () => api.get('/employee/documents'),
  uploadMyDocument: (formData) => api.post('/employee/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadMyDocument: (id) => api.get(`/employee/documents/${id}/download`, { responseType: 'blob' }),

  // ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────
  getAnnouncements: () => api.get('/employee/announcements'),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  getMyNotifications: () => api.get('/employee/notifications'),
  markNotificationRead: (id) => api.patch(`/employee/notifications/${id}/read`),
  markAllNotificationsRead: () => api.patch('/employee/notifications/read-all'),

  // ─── DIRECTORY ─────────────────────────────────────────────────────────────
  getDirectory: (params) => api.get('/employee/directory', { params }),
};
