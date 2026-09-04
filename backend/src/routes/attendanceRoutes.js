const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorizePermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// Overview
router.get('/overview', authorizePermission('attendance.view'), attendanceController.getOverview);

// Records
router.get('/records', authorizePermission('attendance.view'), attendanceController.getRecords);
router.post('/records/manual', authorizePermission('attendance.create'), attendanceController.addManualRecord);

// Regularization
router.get('/regularization', authorizePermission('attendance.view'), attendanceController.getRegularizationRequests);
router.post('/regularization', authorizePermission('attendance.create'), attendanceController.createRegularizationRequest);
router.patch('/regularization/:id', authorizePermission('attendance.approve'), attendanceController.updateRegularizationRequest);

// Shifts
router.get('/shifts', authorizePermission('attendance.view'), attendanceController.getShifts);
router.post('/shifts', authorizePermission('attendance.manage_shifts'), attendanceController.createShift);

module.exports = router;
