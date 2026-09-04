const express = require('express');
const rosterController = require('../controllers/rosterController');
const { authenticate, authorizePermission } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

// We use 'attendance.manage_shifts' as the permission for roster management
router.get('/', authorizePermission('attendance.view'), rosterController.getRoster);
router.post('/bulk-assign', authorizePermission('attendance.manage_shifts'), rosterController.bulkAssign);
router.patch('/individual/:id', authorizePermission('attendance.manage_shifts'), rosterController.updateIndividual);
router.post('/publish', authorizePermission('attendance.manage_shifts'), rosterController.publishRoster);
router.post('/copy', authorizePermission('attendance.manage_shifts'), rosterController.copyRoster);

router.get('/templates', authorizePermission('attendance.view'), rosterController.getTemplates);
router.post('/templates/apply', authorizePermission('attendance.manage_shifts'), rosterController.applyTemplate);

module.exports = router;
