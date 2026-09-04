const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorizeRole('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'PAYROLL_MANAGER'));

router.get('/salaries', payrollController.getEmployeeSalaries);
router.post('/salaries', payrollController.updateEmployeeSalary);

router.get('/runs', payrollController.getPayrollRuns);
router.get('/preview', payrollController.previewPayrollRun);
router.post('/process', payrollController.processPayrollRun);

router.get('/payslips', payrollController.getPayslips);

module.exports = router;
