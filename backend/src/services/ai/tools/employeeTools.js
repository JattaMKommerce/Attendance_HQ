/**
 * Employee Backend Tools for AI Assistant
 */

const db = require('../../../config/db');
const employeeService = require('../../employeeService');

/**
 * Get profile for self (employee)
 */
async function getMyProfile(organizationId, userContext) {
  if (!userContext.employee_id) {
    return {
      success: false,
      message: 'No employee record is linked to your user account.'
    };
  }

  const [rows] = await db.query(
    `SELECT e.*, d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.id = ? AND e.organization_id = ?`,
    [userContext.employee_id, organizationId]
  );

  if (rows.length === 0) {
    return { success: false, message: 'Employee profile not found.' };
  }

  const emp = rows[0];
  const message = `Here is your profile information:
• **Name**: ${emp.first_name} ${emp.last_name}
• **Employee ID**: ${emp.employee_code}
• **Department**: ${emp.department_name || 'Unassigned'}
• **Designation**: ${emp.designation_name || 'Unassigned'}
• **Email**: ${emp.email}
• **Phone**: ${emp.phone || 'Not provided'}
• **Joining Date**: ${emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : 'N/A'}
• **Status**: ${emp.status.toUpperCase()}`;

  return {
    success: true,
    message,
    data: emp
  };
}

/**
 * Update personal profile (phone, emergency contact, address)
 */
async function updateMyProfile(organizationId, userContext, params) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your user account.' };
  }

  const { phone, emergency_contact, emergency_phone, current_address } = params;

  await db.query(
    `UPDATE employees SET
       phone = COALESCE(?, phone),
       emergency_contact_name = COALESCE(?, emergency_contact_name),
       emergency_contact_phone = COALESCE(?, emergency_contact_phone),
       current_address = COALESCE(?, current_address)
     WHERE id = ? AND organization_id = ?`,
    [
      phone || null,
      emergency_contact || null,
      emergency_phone || null,
      current_address || null,
      userContext.employee_id,
      organizationId
    ]
  );

  const updatedFields = [];
  if (phone) updatedFields.push(`phone number to ${phone}`);
  if (emergency_contact) updatedFields.push(`emergency contact to ${emergency_contact}`);
  if (emergency_phone) updatedFields.push(`emergency phone to ${emergency_phone}`);
  if (current_address) updatedFields.push(`address to ${current_address}`);

  const summary = updatedFields.length > 0 ? updatedFields.join(', ') : 'details';
  return {
    success: true,
    message: `Done. Your ${summary} has been updated successfully.`
  };
}

/**
 * Get details for another employee (Admin/Manager)
 */
async function getEmployeeDetails(organizationId, employee) {
  const [rows] = await db.query(
    `SELECT e.*, d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.id = ? AND e.organization_id = ?`,
    [employee.id, organizationId]
  );

  if (rows.length === 0) {
    return { success: false, message: 'Employee not found.' };
  }

  const emp = rows[0];
  const message = `**${emp.first_name} ${emp.last_name}** (${emp.employee_code}):
• **Department**: ${emp.department_name || 'Unassigned'}
• **Designation**: ${emp.designation_name || 'Unassigned'}
• **Status**: ${emp.status.toUpperCase()}
• **Email**: ${emp.email}
• **Phone**: ${emp.phone || 'Not provided'}
• **Joining Date**: ${emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : 'N/A'}`;

  return {
    success: true,
    message,
    data: emp
  };
}

/**
 * Update employee record (designation, phone, etc.)
 */
async function updateEmployee(organizationId, employee, updateFields) {
  const updates = {};
  if (updateFields.designation_id) updates.designation_id = updateFields.designation_id;
  if (updateFields.department_id) updates.department_id = updateFields.department_id;
  if (updateFields.phone) updates.phone = updateFields.phone;
  if (updateFields.email) updates.email = updateFields.email;

  await employeeService.updateEmployee(organizationId, employee.id, updates);

  let details = [];
  if (updateFields.designation_name) details.push(`designation to ${updateFields.designation_name}`);
  if (updateFields.department_name) details.push(`department to ${updateFields.department_name}`);
  if (updateFields.phone) details.push(`phone number to ${updateFields.phone}`);

  const changeText = details.length > 0 ? details.join(' and ') : 'profile';
  return {
    success: true,
    message: `Done. ${employee.first_name}'s ${changeText} has been updated.`
  };
}

/**
 * Deactivate employee record (Destructive action - executed after confirmation)
 */
async function deactivateEmployee(organizationId, employee, userId) {
  await employeeService.updateEmployeeStatus(organizationId, employee.id, 'inactive', userId);

  // Also deactivate associated user account if present
  if (employee.user_id) {
    await db.query('UPDATE users SET status = "inactive" WHERE id = ?', [employee.user_id]);
  }

  return {
    success: true,
    message: `Done. Employee ${employee.first_name} ${employee.last_name} (${employee.employee_code}) has been deactivated and their HRMS access has been revoked.`
  };
}

/**
 * Get employees who joined during the current month
 */
async function getJoinedThisMonth(organizationId, dateObj) {
  const year = dateObj.year;
  const month = dateObj.month;

  const [rows] = await db.query(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.joining_date,
            d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? 
       AND YEAR(e.joining_date) = ? 
       AND MONTH(e.joining_date) = ?
     ORDER BY e.joining_date DESC`,
    [organizationId, year, month]
  );

  if (rows.length === 0) {
    return {
      success: true,
      message: `No employees joined in ${dateObj.monthName} ${year}.`,
      data: []
    };
  }

  const list = rows
    .map(e => `• **${e.first_name} ${e.last_name}** (${e.employee_code}) - ${e.designation_name || 'Unassigned'} in ${e.department_name || 'General'}, Joined: ${new Date(e.joining_date).toISOString().split('T')[0]}`)
    .join('\n');

  return {
    success: true,
    message: `Found ${rows.length} employee(s) who joined in ${dateObj.monthName} ${year}:\n\n${list}`,
    data: rows
  };
}

/**
 * Show all employees in a specific department
 */
async function getEmployeesByDepartment(organizationId, department) {
  const [rows] = await db.query(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.status,
            des.name as designation_name
     FROM employees e
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? AND e.department_id = ? AND e.status = 'active'
     ORDER BY e.first_name ASC`,
    [organizationId, department.id]
  );

  if (rows.length === 0) {
    return {
      success: true,
      message: `No active employees found in the ${department.name} department.`,
      data: []
    };
  }

  const list = rows
    .map(e => `• **${e.first_name} ${e.last_name}** (${e.employee_code}) - ${e.designation_name || 'Unassigned'}`)
    .join('\n');

  return {
    success: true,
    message: `There are ${rows.length} active employee(s) in the **${department.name}** department:\n\n${list}`,
    data: rows
  };
}

/**
 * List all employees with filters (Admin)
 */
async function listEmployees(organizationId, params = {}) {
  const filters = {};
  if (params.department_id) filters.department_id = params.department_id;
  if (params.status) filters.status = params.status;
  if (params.search) filters.search = params.search;

  const result = await employeeService.getEmployees(organizationId, filters);
  const emps = result.employees || [];

  if (emps.length === 0) {
    return {
      success: true,
      message: 'No employees found matching the specified criteria.',
      data: []
    };
  }

  const list = emps.slice(0, 15).map(e => 
    `• **${e.first_name} ${e.last_name}** (${e.employee_code}) - ${e.designation_name || 'General'}, ${e.department_name || 'General'} [${(e.status || 'ACTIVE').toUpperCase()}]`
  ).join('\n');

  const countMessage = emps.length > 15 
    ? `Showing 15 of **${result.total}** employee(s):\n\n${list}\n\n*(Use specific filters or names to narrow down results)*`
    : `Found **${result.total}** employee(s):\n\n${list}`;

  return {
    success: true,
    message: countMessage,
    data: emps
  };
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getEmployeeDetails,
  getEmployee: getEmployeeDetails,
  listEmployees,
  updateEmployee,
  deactivateEmployee,
  getJoinedThisMonth,
  getEmployeesByDepartment
};
