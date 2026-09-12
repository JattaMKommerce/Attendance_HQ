const express = require('express');
const router = express.Router();
const employeePortalController = require('../controllers/employeePortalController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Apply auth middleware to all employee portal routes
router.use(authenticate);

// Aggregated Dashboard
router.get('/dashboard', employeePortalController.getDashboard);

// Profile
router.get('/profile', employeePortalController.getMyProfile);
router.put('/profile', employeePortalController.updateMyProfile);
router.post('/photo', upload.single('photo'), employeePortalController.uploadMyPhoto);

// Attendance
router.get('/attendance/today', employeePortalController.getTodayAttendance);
router.post('/attendance/check-in', employeePortalController.checkIn);
router.post('/attendance/check-out', employeePortalController.checkOut);
router.get('/attendance', employeePortalController.getMyAttendanceHistory);

// Leave
router.get('/leaves/types', employeePortalController.getLeaveTypes);
router.get('/leaves/balance', employeePortalController.getMyLeaveBalance);
router.get('/leaves', employeePortalController.getMyLeaves);
router.post('/leaves', upload.single('document'), employeePortalController.applyLeave);
router.delete('/leaves/:id', employeePortalController.cancelLeave);

// Payslips
router.get('/payslips', employeePortalController.getMyPayslips);
router.get('/payslips/:id/download', employeePortalController.downloadPayslip);

// Documents
router.get('/documents', employeePortalController.getMyDocuments);
router.post('/documents', upload.single('document'), employeePortalController.uploadMyDocument);
router.get('/documents/:id/download', employeePortalController.downloadMyDocument);

// Announcements
router.get('/announcements', employeePortalController.getAnnouncements);

// Notifications
router.get('/notifications', employeePortalController.getMyNotifications);
router.patch('/notifications/:id/read', employeePortalController.markNotificationRead);
router.patch('/notifications/read-all', employeePortalController.markAllNotificationsRead);

// Directory
router.get('/directory', employeePortalController.getDirectory);

// Settings
router.post('/change-password', employeePortalController.changePassword);

// Shifts & Holidays
router.get('/shift', employeePortalController.getMyShift);
router.get('/holidays', employeePortalController.getHolidays);

module.exports = router;
