/**
 * Department Backend Tools for AI Assistant
 */

const db = require('../../../config/db');

/**
 * Create a new department
 */
async function createDepartment(organizationId, departmentName, description = null) {
  if (!departmentName) {
    return { success: false, message: 'Department name is required.' };
  }

  const cleanName = departmentName.trim();

  // Check if exists
  const [existing] = await db.query(
    'SELECT * FROM departments WHERE organization_id = ? AND LOWER(name) = LOWER(?)',
    [organizationId, cleanName]
  );

  if (existing.length > 0) {
    return {
      success: true,
      message: `The department **${existing[0].name}** already exists in your organization (ID: ${existing[0].id}).`,
      data: existing[0]
    };
  }

  const [result] = await db.query(
    'INSERT INTO departments (organization_id, name, description) VALUES (?, ?, ?)',
    [organizationId, cleanName, description || `Department created via AI Assistant`]
  );

  return {
    success: true,
    message: `Done. New department **${cleanName}** has been created successfully.`,
    data: { id: result.insertId, name: cleanName }
  };
}

/**
 * Assign / move an employee to a department
 */
async function assignEmployeeDepartment(organizationId, employee, department) {
  await db.query(
    'UPDATE employees SET department_id = ? WHERE id = ? AND organization_id = ?',
    [department.id, employee.id, organizationId]
  );

  return {
    success: true,
    message: `Done. **${employee.first_name} ${employee.last_name}** (${employee.employee_code}) has been assigned to the **${department.name}** department.`,
    data: {
      employeeId: employee.id,
      departmentId: department.id,
      departmentName: department.name
    }
  };
}

module.exports = {
  createDepartment,
  assignEmployeeDepartment
};
