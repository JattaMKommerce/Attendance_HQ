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
        WHERE u.organization_id = ? AND u.status = 'active'
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

      // 1. Fetch all active employees, their salaries and monthly paid leave quota
      const query = `
        SELECT 
          u.id as user_id, u.first_name, u.last_name, e.id as employee_db_id, e.employee_code as employee_id, d.name as department, deg.name as designation,
          COALESCE(NULLIF(e.gross_salary, 0), NULLIF(es.ctc / 12, 0), es.ctc, 0) as gross_salary,
          COALESCE(NULLIF(e.basic_salary, 0), es.base_salary, 0) as base_salary,
          COALESCE(e.deductions, 0) as other_deductions,
          COALESCE(e.monthly_paid_leaves, 1) as monthly_paid_leaves,
          COALESCE(es.bank_verification_status, 'Verified') as bank_verification_status
        FROM users u
        LEFT JOIN employees e ON u.id = e.user_id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations deg ON e.designation_id = deg.id
        LEFT JOIN employee_salaries es ON u.id = es.user_id
        WHERE u.organization_id = ? AND u.status = 'active'
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
      const targetMonthNum = monthIndex + 1;

      // 3. Fetch approved leaves for all employees for this month
      // Note: leave_requests has employee_id only (no user_id column)
      const [leaveRows] = await db.query(`
        SELECT lr.employee_id, SUM(lr.total_days) as total_leaves
        FROM leave_requests lr
        WHERE lr.organization_id = ? 
          AND lr.status = 'approved'
          AND MONTH(lr.start_date) = ? AND YEAR(lr.start_date) = ?
        GROUP BY lr.employee_id
      `, [organizationId, targetMonthNum, year]);

      const leaveMap = {};
      leaveRows.forEach(l => {
        if (l.employee_id) leaveMap[`emp_${l.employee_id}`] = parseFloat(l.total_leaves) || 0;
      });

      // 4. Fetch absent marks from attendance_records for this month
      const [absentRows] = await db.query(`
        SELECT employee_id, COUNT(*) as absent_count
        FROM attendance_records
        WHERE organization_id = ?
          AND status = 'absent'
          AND MONTH(date) = ? AND YEAR(date) = ?
        GROUP BY employee_id
      `, [organizationId, targetMonthNum, year]);

      const attendanceAbsentMap = {};
      absentRows.forEach(a => {
        attendanceAbsentMap[a.employee_id] = parseInt(a.absent_count, 10) || 0;
      });

      // 5. Calculate salary, company 1-paid-leave quota, and excess absence LOP deduction
      const previewData = employees.map(emp => {
        const monthlyGross = parseFloat(emp.gross_salary) || 0;
        const perDayGross = totalDaysInMonth > 0 ? (monthlyGross / totalDaysInMonth) : 0;
        
        // Sum total absence days from attendance records and approved leaves
        const leavesTaken = leaveMap[`emp_${emp.employee_db_id}`] || leaveMap[`user_${emp.user_id}`] || 0;
        const attendanceAbsents = attendanceAbsentMap[emp.employee_db_id] || 0;
        // Total time-off is the combined or maximum of recorded absences
        const totalAbsenceDays = Math.max(leavesTaken, attendanceAbsents);

        // Company policy: 1 Paid Leave allowed per month (default 1)
        const paidQuota = emp.monthly_paid_leaves !== null ? parseInt(emp.monthly_paid_leaves, 10) : 1;
        
        let paidLeavesUsed = 0;
        let unpaidDays = 0;
        
        if (totalAbsenceDays <= paidQuota) {
          paidLeavesUsed = totalAbsenceDays;
          unpaidDays = 0;
        } else {
          paidLeavesUsed = paidQuota;
          unpaidDays = totalAbsenceDays - paidQuota;
        }

        const payableDays = Math.max(0, totalDaysInMonth - unpaidDays);
        
        // Loss of Pay (LOP) amount for unpaid days
        const lopAmount = Math.round(unpaidDays * perDayGross);

        // Standard PF or statutory deductions (if applicable)
        let pfDeduction = 0;
        if (monthlyGross > 0 && emp.base_salary > 0) {
          const pfBasic = Math.min(parseFloat(emp.base_salary), 15000);
          pfDeduction = Math.round(pfBasic * 0.12);
        }

        const otherDeductions = parseFloat(emp.other_deductions) || 0;
        const totalDeductions = lopAmount + pfDeduction + otherDeductions;
        const netPay = Math.max(0, Math.round(monthlyGross - totalDeductions));

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
          paidLeavesAllowed: paidQuota,
          paidLeavesUsed: paidLeavesUsed,
          absentDays: totalAbsenceDays,
          deductions: totalDeductions,
          netPay: netPay,
          breakdown: {
            basic: emp.base_salary > 0 ? parseFloat(emp.base_salary) : Math.round(monthlyGross * 0.5),
            hra: Math.round(monthlyGross * 0.2),
            lop: lopAmount,
            pf: pfDeduction,
            other: otherDeductions,
            paidLeaveCoveredDays: paidLeavesUsed,
            unpaidDeductedDays: unpaidDays,
            dailyRate: Math.round(perDayGross)
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
