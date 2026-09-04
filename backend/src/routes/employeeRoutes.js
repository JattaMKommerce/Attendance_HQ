const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, authorizePermission } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authenticate);

// File Uploads
router.post('/upload-photo', authorizePermission('employee.create'), upload.single('photo'), employeeController.uploadPhoto);
router.post('/upload-document', authorizePermission('employee.create'), upload.single('document'), employeeController.uploadDocument);
router.post('/upload-resume', authorizePermission('employee.create'), upload.single('resume'), employeeController.uploadResume);

// Get lookups for dropdowns (Departments, Designations, Managers)
router.get('/lookups', authorizePermission('employee.view'), employeeController.getLookups);

// Standard CRUD
router.get('/', authorizePermission('employee.view'), employeeController.getEmployees);
router.get('/:id', authorizePermission('employee.view'), employeeController.getEmployeeById);
router.get('/:id/id-card', authorizePermission('employee.view'), employeeController.getEmployeeIdCard);
router.post('/', authorizePermission('employee.create'), employeeController.createEmployee);
router.put('/:id', authorizePermission('employee.update'), employeeController.updateEmployee);
router.patch('/:id/status', authorizePermission('employee.manage_status'), employeeController.updateEmployeeStatus);

module.exports = router;
