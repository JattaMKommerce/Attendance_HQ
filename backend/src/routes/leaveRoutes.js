const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const holidayController = require('../controllers/holidayController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorizeRole('HR_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN')); // Entire module is for HR Admin now

// Dashboard & Calendar
router.get('/dashboard', leaveController.getDashboardMetrics);
router.get('/calendar', leaveController.getCalendarLeaves);

// Balances
router.get('/balances', leaveController.getAllBalances);
router.post('/balances/adjust', leaveController.adjustBalance);

// Holidays
router.get('/holidays', holidayController.getHolidays);
router.post('/holidays', holidayController.createHoliday);
router.put('/holidays/:id', holidayController.updateHoliday);
router.delete('/holidays/:id', holidayController.deleteHoliday);

// Requests
router.get('/requests', leaveController.getLeaveRequests);
router.post('/:id/review', leaveController.reviewLeaveRequest);

// Types and Policies
router.get('/types', leaveController.getLeaveTypes);
router.post('/types', leaveController.createLeaveType);
router.put('/types/:id', leaveController.updateLeaveType);

module.exports = router;
