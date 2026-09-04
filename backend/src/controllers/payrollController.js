const db = require('../config/db');

class PayrollController {
  // 1. Employee Salary Management
  async getEmployeeSalaries(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      
      const query = `
        SELECT 
          u.id as user_id, u.first_name, u.last_name, e.employee_code as employee_id, d.name as department, deg.name as designation,
          COALESCE(es.ctc, 0) as ctc, COALESCE(es.base_salary, 0) as base_salary,
          es.bank_name, es.account_no, es.ifsc_code, COALESCE(es.bank_verification_status, 'Pending') as bank_verification_status
        FROM users u
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations deg ON e.designation_id = deg.id
        LEFT JOIN employee_salaries es ON u.id = es.user_id
        WHERE u.organization_id = ? AND u.status = 'ACTIVE'
      `;
      const [salaries] = await db.query(query, [organizationId]);
      
      res.status(200).json({
        success: true,
        data: salaries
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEmployeeSalary(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { user_id, ctc, base_salary, bank_name, account_no, ifsc_code, bank_verification_status } = req.body;

      if (!user_id) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      // Check if user belongs to org
      const [user] = await db.query(`SELECT id FROM users WHERE id = ? AND organization_id = ?`, [user_id, organizationId]);
      if (user.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Upsert
      await db.query(`
        INSERT INTO employee_salaries (user_id, organization_id, ctc, base_salary, bank_name, account_no, ifsc_code, bank_verification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ctc = VALUES(ctc),
          base_salary = VALUES(base_salary),
          bank_name = VALUES(bank_name),
          account_no = VALUES(account_no),
          ifsc_code = VALUES(ifsc_code),
          bank_verification_status = VALUES(bank_verification_status)
      `, [user_id, organizationId, ctc || 0, base_salary || 0, bank_name || '', account_no || '', ifsc_code || '', bank_verification_status || 'Pending']);

      res.status(200).json({
        success: true,
        message: 'Employee salary updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Payroll Runs
  async getPayrollRuns(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const [runs] = await db.query(`
        SELECT r.*, u.first_name as processed_by_first, u.last_name as processed_by_last
        FROM payroll_runs r
        LEFT JOIN users u ON r.processed_by = u.id
        WHERE r.organization_id = ?
        ORDER BY r.run_year DESC, r.run_month DESC
      `, [organizationId]);
      
      res.status(200).json({
        success: true,
        data: runs
      });
    } catch (error) {
      next(error);
    }
  }

  // Preview Payroll calculates leaves and deductions but doesn't save to payslips yet
  async previewPayrollRun(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { month, year } = req.query; // month is string e.g. "September", year is "2026"

      if (!month || !year) {
        return res.status(400).json({ success: false, message: 'Month and Year are required' });
      }

      // 1. Fetch all active employees and their salaries
      const query = `
        SELECT 
          u.id as user_id, u.first_name, u.last_name, e.employee_code as employee_id, d.name as department, deg.name as designation,
          COALESCE(es.ctc, 0) as ctc, COALESCE(es.base_salary, 0) as base_salary,
          COALESCE(es.bank_verification_status, 'Pending') as bank_verification_status
        FROM users u
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations deg ON e.designation_id = deg.id
        LEFT JOIN employee_salaries es ON u.id = es.user_id
        WHERE u.organization_id = ? AND u.status = 'ACTIVE'
      `;
      const [employees] = await db.query(query, [organizationId]);

      // 2. Map month string to number to calculate days
      const monthMap = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const monthIndex = monthMap[month];
      if (monthIndex === undefined) {
        return res.status(400).json({ success: false, message: 'Invalid month' });
      }

      const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();

      // 3. Fetch unpaid leaves for all employees for this month
      // This query assumes leave_requests has start_date and end_date and status = 'APPROVED'
      // To properly calculate exact days falling in this month is complex in SQL, we'll do a simplified approach
      // For now, if a leave starts in this month, we take its duration.
      // (A robust system handles date overlapping)
      
      const [unpaidLeaves] = await db.query(`
        SELECT user_id, SUM(DATEDIFF(end_date, start_date) + 1) as total_unpaid_days
        FROM leave_requests
        WHERE organization_id = ? 
        AND status = 'APPROVED' 
        AND leave_type_id IN (SELECT id FROM leave_types WHERE name = 'Unpaid Leave')
        AND MONTH(start_date) = ? AND YEAR(start_date) = ?
        GROUP BY user_id
      `, [organizationId, monthIndex + 1, year]);

      const unpaidMap = {};
      unpaidLeaves.forEach(l => {
        unpaidMap[l.user_id] = l.total_unpaid_days;
      });

      // 4. Calculate for each employee
      const previewData = employees.map(emp => {
        const ctc = parseFloat(emp.ctc);
        const monthlyGross = ctc / 12; // Standard CTC/12 assumption
        
        const unpaidDays = unpaidMap[emp.user_id] || 0;
        const payableDays = Math.max(0, totalDaysInMonth - unpaidDays);
        
        // Loss of Pay calculation
        const perDayGross = monthlyGross / totalDaysInMonth;
        let lopAmount = unpaidDays * perDayGross;

        // Basic Statutory Deductions (Simplified example)
        let pfDeduction = 0;
        if (monthlyGross > 0) {
          // Standard PF is 12% of Basic, capping Basic at 15000 for PF calculation (simplified)
          let basic = emp.base_salary > 0 ? parseFloat(emp.base_salary) : monthlyGross * 0.5;
          let pfBasic = Math.min(basic, 15000);
          pfDeduction = pfBasic * 0.12;
        }

        let totalDeductions = lopAmount + pfDeduction;
        let netPay = monthlyGross - totalDeductions;

        return {
          user_id: emp.user_id,
          name: `${emp.first_name} ${emp.last_name}`,
          employeeId: emp.employee_id,
          department: emp.department,
          designation: emp.designation,
          bankStatus: emp.bank_verification_status,
          monthlyGross: monthlyGross,
          payableDays: payableDays,
          unpaidDays: unpaidDays,
          deductions: totalDeductions,
          netPay: netPay,
          breakdown: {
            basic: emp.base_salary > 0 ? emp.base_salary : monthlyGross * 0.5,
            hra: monthlyGross * 0.2, // example structure
            lop: lopAmount,
            pf: pfDeduction
          },
          status: emp.bank_verification_status === 'Verified' ? 'Ready' : 'Review'
        };
      });

      res.status(200).json({
        success: true,
        data: {
          month,
          year,
          totalDaysInMonth,
          employees: previewData
        }
      });
    } catch (error) {
      console.error("Preview error", error);
      next(error);
    }
  }

  async processPayrollRun(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { month, year, employees } = req.body;

      if (!month || !year || !employees || !Array.isArray(employees)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
      }

      // Check if already processed
      const [existingRun] = await db.query(`
        SELECT id, status FROM payroll_runs 
        WHERE organization_id = ? AND run_month = ? AND run_year = ?
      `, [organizationId, month, year]);

      if (existingRun.length > 0 && existingRun[0].status === 'Processed') {
        return res.status(400).json({ success: false, message: 'Payroll for this month is already processed' });
      }

      // Start transaction
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        let totalGross = 0;
        let totalNet = 0;
        employees.forEach(emp => {
          totalGross += emp.monthlyGross;
          totalNet += emp.netPay;
        });

        let runId;
        if (existingRun.length > 0) {
          runId = existingRun[0].id;
          await connection.query(`
            UPDATE payroll_runs SET status = 'Processed', total_gross = ?, total_net = ?, processed_by = ?
            WHERE id = ?
          `, [totalGross, totalNet, req.user.id, runId]);
          
          // Delete existing payslips for overwrite
          await connection.query(`DELETE FROM payslips WHERE payroll_run_id = ?`, [runId]);
        } else {
          const [insertRun] = await connection.query(`
            INSERT INTO payroll_runs (organization_id, run_month, run_year, status, total_gross, total_net, processed_by)
            VALUES (?, ?, ?, 'Processed', ?, ?, ?)
          `, [organizationId, month, year, totalGross, totalNet, req.user.id]);
          runId = insertRun.insertId;
        }

        // Insert Payslips
        for (let emp of employees) {
          await connection.query(`
            INSERT INTO payslips (payroll_run_id, user_id, organization_id, payable_days, gross_pay, deductions, net_pay, status, breakdown)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
          `, [runId, emp.user_id, organizationId, emp.payableDays, emp.monthlyGross, emp.deductions, emp.netPay, JSON.stringify(emp.breakdown)]);
        }

        await connection.commit();
        res.status(200).json({
          success: true,
          message: 'Payroll processed successfully'
        });
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error("Process error", error);
      next(error);
    }
  }

  async getPayslips(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const [payslips] = await db.query(`
        SELECT p.*, r.run_month, r.run_year, u.first_name, u.last_name, e.employee_code as employee_id, d.name as department, deg.name as designation
        FROM payslips p
        JOIN payroll_runs r ON p.payroll_run_id = r.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations deg ON e.designation_id = deg.id
        WHERE p.organization_id = ?
        ORDER BY r.run_year DESC, r.run_month DESC
      `, [organizationId]);
      
      res.status(200).json({
        success: true,
        data: payslips
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PayrollController();
