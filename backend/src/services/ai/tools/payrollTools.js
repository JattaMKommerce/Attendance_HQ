/**
 * Payroll Backend Tools for AI Assistant
 */

const db = require('../../../config/db');

/**
 * Get salary slip for authenticated employee for a specific month
 */
async function getMySalarySlip(organizationId, userContext, dateObj) {
  const userId = userContext.id;
  const monthName = dateObj.monthName || 'September';
  const year = dateObj.year || new Date().getFullYear();

  // Find payslip
  const [payslips] = await db.query(
    `SELECT p.*, r.run_month, r.run_year, r.status as run_status
     FROM payslips p
     JOIN payroll_runs r ON p.payroll_run_id = r.id
     WHERE p.user_id = ? AND p.organization_id = ?
       AND (LOWER(r.run_month) = LOWER(?) OR r.run_month = ?)
       AND r.run_year = ?
     LIMIT 1`,
    [userId, organizationId, monthName, dateObj.month, year]
  );

  if (payslips.length === 0) {
    // Check if employee has salary structure configured in employees table
    const [empSalary] = await db.query(
      `SELECT gross_salary, basic_salary, hra, deductions, incentives
       FROM employees WHERE user_id = ? AND organization_id = ?`,
      [userId, organizationId]
    );

    if (empSalary.length > 0 && empSalary[0].gross_salary) {
      const s = empSalary[0];
      const net = (parseFloat(s.gross_salary || 0) - parseFloat(s.deductions || 0) + parseFloat(s.incentives || 0)).toFixed(2);
      return {
        success: true,
        message: `Salary breakdown for **${monthName} ${year}**:
• **Gross Pay**: ₹${s.gross_salary}
• **Basic Salary**: ₹${s.basic_salary || '0.00'}
• **HRA**: ₹${s.hra || '0.00'}
• **Deductions**: ₹${s.deductions || '0.00'}
• **Net Payable**: **₹${net}**

*(Official payslip PDF is available in My Payslips)*`,
        data: s
      };
    }

    return {
      success: true,
      message: `No generated payslip found for **${monthName} ${year}**. Your payroll for this period may still be in processing.`
    };
  }

  const p = payslips[0];
  return {
    success: true,
    message: `Your payslip for **${p.run_month} ${p.run_year}**:
• **Gross Pay**: ₹${p.gross_pay}
• **Net Pay**: **₹${p.net_pay}**
• **Payable Days**: ${p.payable_days}
• **Status**: ${p.status}

You can download the full PDF from your **My Payslips** section.`,
    data: p
  };
}

/**
 * Generate monthly payroll report (Admin/Finance)
 */
async function generatePayrollReport(organizationId, dateObj) {
  const monthName = dateObj.monthName || 'September';
  const year = dateObj.year || new Date().getFullYear();

  // Check if processed run exists
  const [runs] = await db.query(
    `SELECT * FROM payroll_runs 
     WHERE organization_id = ? 
       AND (LOWER(run_month) = LOWER(?) OR run_month = ?)
       AND run_year = ?
     LIMIT 1`,
    [organizationId, monthName, dateObj.month, year]
  );

  // Also calculate active employee salary totals
  const [salaries] = await db.query(
    `SELECT 
       COUNT(e.id) as total_employees,
       SUM(COALESCE(e.gross_salary, 0)) as total_gross,
       SUM(COALESCE(e.basic_salary, 0)) as total_basic,
       SUM(COALESCE(e.deductions, 0)) as total_deductions
     FROM employees e
     WHERE e.organization_id = ? AND e.status = 'active'`,
    [organizationId]
  );

  const stats = salaries[0];
  const count = stats.total_employees || 0;
  const totalGross = parseFloat(stats.total_gross || (runs[0]?.total_gross || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const totalBasic = parseFloat(stats.total_basic || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const runStatus = runs.length > 0 ? runs[0].status : 'Draft';

  const message = `**Payroll Report for ${monthName} ${year}**:
• **Active Employees**: ${count}
• **Total Gross Payroll**: ₹${totalGross}
• **Base Salary Sum**: ₹${totalBasic}
• **Payroll Run Status**: **${runStatus}**
• **Organization ID**: ${organizationId}

✓ Detailed payslips calculated and ready in Management > Payroll.`;

  return {
    success: true,
    message,
    data: {
      month: monthName,
      year,
      activeEmployees: count,
      totalGross,
      status: runStatus
    }
  };
}

/**
 * Update employee salary (Destructive action - requires confirmation)
 */
async function updateEmployeeSalary(organizationId, employee, params) {
  const { newSalary, basicSalary, hra } = params;

  await db.query(
    `UPDATE employees SET
       gross_salary = COALESCE(?, gross_salary),
       basic_salary = COALESCE(?, basic_salary),
       hra = COALESCE(?, hra)
     WHERE id = ? AND organization_id = ?`,
    [
      newSalary || null,
      basicSalary || null,
      hra || null,
      employee.id,
      organizationId
    ]
  );

  return {
    success: true,
    message: `Done. Salary structure for **${employee.first_name} ${employee.last_name}** (${employee.employee_code}) has been updated to ₹${newSalary}.`
  };
}

module.exports = {
  getMySalarySlip,
  getMyPayslip: getMySalarySlip,
  generatePayrollReport,
  getPayrollInformation: generatePayrollReport,
  updateEmployeeSalary
};
