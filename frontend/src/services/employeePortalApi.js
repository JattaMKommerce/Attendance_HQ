/**
 * Employee Portal API Service
 * Maps to existing backend routes. All calls are scoped to the
 * authenticated employee — the backend uses req.user to enforce isolation.
 *
 * Endpoints that don't yet exist on the backend are clearly marked
 * [BACKEND REQUIRED] and fall back to local mock data in the consuming component.
 */

import api from './api';

export const employeePortalApi = {

  // ─── AUTH / PROFILE ────────────────────────────────────────────────────────
  /** Uses existing /auth/me – returns user + roles */
  getMe: () => api.get('/auth/me'),

  /** [BACKEND REQUIRED] PUT /employee/profile  – personal fields only */
  updateMyProfile: (data) => api.put('/employee/profile', data),

  /** [BACKEND REQUIRED] POST /employee/change-password */
  changePassword: (data) => api.post('/employee/change-password', data),

  /** [BACKEND REQUIRED] GET /employee/login-activity */
  getLoginActivity: () => api.get('/employee/login-activity'),

  // ─── EMPLOYEE RECORD ───────────────────────────────────────────────────────
  /**
   * Fetch the employee record for the logged-in user.
   * Uses existing GET /employees/:id with employee_id injected by auth middleware.
   * [BACKEND REQUIRED] if the employee route doesn't auto-resolve "me".
   */
  getMyEmployee: (employeeId) => api.get(`/employees/${employeeId}`),

  /** GET /employees/lookups – departments, designations, managers */
  getLookups: () => api.get('/employees/lookups'),

  // ─── ATTENDANCE ────────────────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] POST /employee/attendance/check-in
   * Body: { timestamp, latitude?, longitude?, device? }
   */
  checkIn: (data) => api.post('/employee/attendance/check-in', data),

  /**
   * [BACKEND REQUIRED] POST /employee/attendance/check-out
   * Body: { timestamp, latitude?, longitude? }
   */
  checkOut: (data) => api.post('/employee/attendance/check-out', data),

  /**
   * [BACKEND REQUIRED] GET /employee/attendance?month=&year=
   * Returns attendance_records rows for the logged-in employee only.
   * Falls back: existing GET /attendance/records filtered by employee_id.
   */
  getMyAttendance: (params) => api.get('/attendance/records', { params }),

  /**
   * [BACKEND REQUIRED] GET /employee/attendance/today
   * Returns today's check_in_time, check_out_time, status, work_duration_minutes.
   */
  getTodayAttendance: () => api.get('/employee/attendance/today'),

  /**
   * Attendance correction request – maps to existing POST /attendance/regularization
   * Body: { employeeId, attendanceDate, requestType, reason, checkInTime?, checkOutTime? }
   */
  requestCorrection: (data) => api.post('/attendance/regularization', data),

  /** [BACKEND REQUIRED] GET /employee/attendance/corrections */
  getMyCorrections: (params) => api.get('/employee/attendance/corrections', { params }),

  // ─── SHIFT & ROSTER ────────────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] GET /employee/shift
   * Returns the employee's current assigned shift details.
   */
  getMyShift: () => api.get('/employee/shift'),

  /**
   * [BACKEND REQUIRED] GET /employee/roster?startDate=&endDate=
   * Returns only the team roster the employee belongs to (department-scoped).
   */
  getMyTeamRoster: (params) => api.get('/employee/roster', { params }),

  // ─── LEAVE ─────────────────────────────────────────────────────────────────
  /**
   * Leave types are org-wide and publicly readable.
   * Existing GET /leaves/types requires HR role. [BACKEND REQUIRED] to open to EMPLOYEE.
   */
  getLeaveTypes: () => api.get('/leaves/types'),

  /**
   * [BACKEND REQUIRED] GET /employee/leaves/balance
   * Returns leave_balances rows for the logged-in employee (all types).
   */
  getMyLeaveBalance: () => api.get('/employee/leaves/balance'),

  /**
   * [BACKEND REQUIRED] GET /employee/leaves?status=&year=
   * Returns leave_requests rows for the logged-in employee.
   */
  getMyLeaves: (params) => api.get('/employee/leaves', { params }),

  /**
   * [BACKEND REQUIRED] POST /employee/leaves
   * Body: FormData { leaveTypeId, startDate, endDate, durationType, reason, document? }
   */
  applyLeave: (formData) => api.post('/employee/leaves', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  /**
   * [BACKEND REQUIRED] DELETE /employee/leaves/:id
   * Only allowed when status = 'pending'.
   */
  cancelLeave: (id) => api.delete(`/employee/leaves/${id}`),

  // ─── HOLIDAYS ──────────────────────────────────────────────────────────────
  /**
   * Existing GET /leaves/holidays – requires HR role currently.
   * [BACKEND REQUIRED] to open to EMPLOYEE role (read-only).
   */
  getHolidays: (params) => api.get('/leaves/holidays', { params }),

  // ─── PAYSLIPS ──────────────────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] GET /employee/payslips?year=
   * Returns payslips rows for the logged-in user only.
   * (Current GET /payroll/payslips returns all org payslips – restricted.)
   */
  getMyPayslips: (params) => api.get('/employee/payslips', { params }),

  /**
   * [BACKEND REQUIRED] GET /employee/payslips/:id/download
   * Returns PDF blob for the employee's own payslip.
   */
  downloadPayslip: (id) =>
    api.get(`/employee/payslips/${id}/download`, { responseType: 'blob' }),

  // ─── DOCUMENTS ─────────────────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] GET /employee/documents
   * Returns documents rows where employee_id = logged-in employee.
   */
  getMyDocuments: () => api.get('/employee/documents'),

  /**
   * [BACKEND REQUIRED] POST /employee/documents
   * FormData: { title, document_type, file }
   */
  uploadMyDocument: (formData) =>
    api.post('/employee/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  /**
   * Download uses existing document route, scoped by document ownership check.
   * GET /documents/:id/download
   */
  downloadMyDocument: (id) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] GET /employee/notifications
   * Returns notifications rows for the logged-in user.
   */
  getMyNotifications: () => api.get('/employee/notifications'),

  /**
   * [BACKEND REQUIRED] PATCH /employee/notifications/:id/read
   */
  markNotificationRead: (id) =>
    api.patch(`/employee/notifications/${id}/read`),

  /**
   * [BACKEND REQUIRED] PATCH /employee/notifications/read-all
   */
  markAllNotificationsRead: () =>
    api.patch('/employee/notifications/read-all'),

  // ─── DIRECTORY ─────────────────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] GET /employee/directory?search=&department=
   * Returns limited public fields: name, designation, department, email, phone.
   * Does NOT expose salary, personal, or HR-sensitive data.
   */
  getDirectory: (params) => api.get('/employee/directory', { params }),

  // ─── DASHBOARD AGGREGATION ─────────────────────────────────────────────────
  /**
   * [BACKEND REQUIRED] GET /employee/dashboard
   * Returns a single aggregated payload:
   *   { todayAttendance, leaveBalance, nextHoliday, latestPayslip,
   *     pendingRequests, notifications, shift }
   */
  getDashboard: () => api.get('/employee/dashboard'),
};
