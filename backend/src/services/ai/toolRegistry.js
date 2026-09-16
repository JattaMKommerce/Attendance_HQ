/**
 * Controlled Tool Registry & Permission Contracts for HRMS AI Command Center (Phase 2)
 * 
 * Every AI tool declares:
 * - name: Canonical identifier
 * - description: Human/LLM description
 * - allowedRoles: Array of authorized roles
 * - requiredPermission: Specific permission key
 * - requiresOrgContext: boolean (enforces tenant boundary)
 * - selfScoped: boolean (restricts employee users to their own record)
 * - requiresConfirmation: boolean (intercepts sensitive/destructive actions)
 * - requiresAudit: boolean (enforces audit logging)
 * - parameters: Object defining expected schema
 */

const TOOL_REGISTRY = {
  // ─── ADMIN TOOLS ──────────────────────────────────────────────────────────

  'get_employee': {
    name: 'get_employee',
    description: 'Fetch an employee record by code, ID, or name',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'employee:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      employee: { type: 'string', required: true, description: 'Employee code, ID, or name' }
    }
  },

  'list_employees': {
    name: 'list_employees',
    description: 'List employees with optional department or status filters',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'employee:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      department: { type: 'string', required: false, description: 'Filter by department' },
      status: { type: 'string', required: false, description: 'Filter by employee status' },
      filter: { type: 'string', required: false }
    }
  },

  'get_employee_details': {
    name: 'get_employee_details',
    description: 'Retrieve complete profile details for a specific employee',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'employee:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      employee: { type: 'string', required: true, description: 'Employee code, ID, or name' }
    }
  },

  'create_employee': {
    name: 'create_employee',
    description: 'Create a new employee and execute multi-step onboarding workflow',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'employee:create',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: true,
    requiresAudit: true,
    parameters: {
      name: { type: 'string', required: true },
      departmentName: { type: 'string', required: true },
      designationName: { type: 'string', required: true },
      joiningDate: { type: 'string', required: false },
      email: { type: 'string', required: false }
    }
  },

  'update_employee': {
    name: 'update_employee',
    description: 'Update employee designation, department, phone, or contact details',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'employee:update',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      employee: { type: 'string', required: true },
      designation: { type: 'string', required: false },
      department: { type: 'string', required: false },
      phone: { type: 'string', required: false }
    }
  },

  'deactivate_employee': {
    name: 'deactivate_employee',
    description: 'Deactivate an employee record and disable account access',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'employee:delete',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: true,
    requiresAudit: true,
    parameters: {
      employee: { type: 'string', required: true, description: 'Employee code, ID, or name' }
    }
  },

  'get_attendance': {
    name: 'get_attendance',
    description: 'View organization, department, or absentee attendance records',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'attendance:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      date: { type: 'string', required: false },
      department: { type: 'string', required: false },
      filter: { type: 'string', required: false }
    }
  },

  'get_absent_today': {
    name: 'get_absent_today',
    description: 'List employees absent on a specific date',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'attendance:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      date: { type: 'string', required: false, description: 'Date in YYYY-MM-DD format' }
    }
  },

  'get_leave_requests': {
    name: 'get_leave_requests',
    description: 'View pending and approved leave requests across the organization',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'leave:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      employee: { type: 'string', required: false },
      action: { type: 'string', required: false }
    }
  },

  'get_payroll_information': {
    name: 'get_payroll_information',
    description: 'View monthly payroll reports, totals, and compensation structures',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'payroll:view_all',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      month: { type: 'number', required: false },
      year: { type: 'number', required: false }
    }
  },

  'update_employee_salary': {
    name: 'update_employee_salary',
    description: 'Update employee base salary and compensation structure',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN'],
    requiredPermission: 'payroll:update',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: true,
    requiresAudit: true,
    parameters: {
      employee: { type: 'string', required: true },
      basicSalary: { type: 'number', required: false },
      grossSalary: { type: 'number', required: false }
    }
  },

  // ─── ORGANIZATIONAL ANALYTICS TOOLS (Phase 3B) ───────────────────────────

  'compare_department_attendance': {
    name: 'compare_department_attendance',
    description: 'Compare attendance and absenteeism rates between two departments over a specified time period',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      department1: { type: 'string', required: true, description: 'First department name to compare' },
      department2: { type: 'string', required: true, description: 'Second department name to compare' },
      period: { type: 'string', required: false, description: 'Time period or quarter (e.g. Q3, this month)' },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false }
    }
  },

  'get_absenteeism_rate': {
    name: 'get_absenteeism_rate',
    description: 'Get absenteeism rates across departments and identify department with highest absenteeism',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      period: { type: 'string', required: false, description: 'Time period (e.g. this month, last month)' },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false }
    }
  },

  'get_leave_utilization': {
    name: 'get_leave_utilization',
    description: 'Query employees or departments with high leave utilization exceeding a threshold',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      thresholdPercent: { type: 'number', required: false, description: 'Utilization percentage threshold (e.g. 50)' },
      groupBy: { type: 'string', required: false, description: 'Group by employee or department' },
      year: { type: 'number', required: false }
    }
  },

  'get_employee_tenure': {
    name: 'get_employee_tenure',
    description: 'Calculate average employee tenure, tenure distribution brackets, and department tenure averages',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'get_employees_joined_range': {
    name: 'get_employees_joined_range',
    description: 'Count and list employees who joined within a specific date range or period',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      period: { type: 'string', required: false },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false }
    }
  },

  'get_consecutive_absences': {
    name: 'get_consecutive_absences',
    description: 'Detect employees who have been absent for 3 or more consecutive working days',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      consecutiveDays: { type: 'number', required: false, description: 'Number of consecutive days (default 3)' },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false }
    }
  },

  'get_department_headcount': {
    name: 'get_department_headcount',
    description: 'Get headcount breakdown and workforce percentage across all departments',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'get_attendance_trends': {
    name: 'get_attendance_trends',
    description: 'Analyze organization attendance trends and direction over time',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      period: { type: 'string', required: false },
      startDate: { type: 'string', required: false },
      endDate: { type: 'string', required: false }
    }
  },

  'get_leave_trends': {
    name: 'get_leave_trends',
    description: 'Analyze monthly leave application volume, approval rates, and top leave types',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      year: { type: 'number', required: false }
    }
  },

  'get_insights': {
    name: 'get_insights',
    description: 'Fetch proactive HR intelligence insights, alerts, and anomalies',
    allowedRoles: ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'analytics:view',
    requiresOrgContext: true,
    selfScoped: false,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      severity: { type: 'string', required: false, description: 'CRITICAL, WARNING, or INFO' },
      status: { type: 'string', required: false, description: 'unread, read, or all' },
      type: { type: 'string', required: false, description: 'CONSECUTIVE_ABSENCE, HIGH_ABSENTEEISM, etc.' }
    }
  },

  // ─── EMPLOYEE TOOLS (Self-Scoped) ──────────────────────────────────────────


  'get_my_profile': {
    name: 'get_my_profile',
    description: 'View own employee profile information',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'profile:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'get_my_attendance': {
    name: 'get_my_attendance',
    description: 'View own attendance summary and working hours for a given period',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'attendance:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      date: { type: 'string', required: false },
      month: { type: 'number', required: false }
    }
  },

  'get_my_leave_balance': {
    name: 'get_my_leave_balance',
    description: 'View own allocated and remaining leave balances',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'leave:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      leaveType: { type: 'string', required: false }
    }
  },

  'get_my_leave_requests': {
    name: 'get_my_leave_requests',
    description: 'View own leave applications and their current approval statuses',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'leave:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'apply_leave': {
    name: 'apply_leave',
    description: 'Submit a leave application for self',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'leave:apply_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      startDate: { type: 'string', required: true },
      endDate: { type: 'string', required: false },
      leaveType: { type: 'string', required: false },
      reason: { type: 'string', required: false }
    }
  },

  'get_my_payslip': {
    name: 'get_my_payslip',
    description: 'View or download own salary slip and net earnings',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'PAYROLL_MANAGER', 'FINANCE'],
    requiredPermission: 'payroll:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      month: { type: 'number', required: false },
      year: { type: 'number', required: false }
    }
  },

  'check_in': {
    name: 'check_in',
    description: 'Clock in for daily attendance',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'attendance:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'check_out': {
    name: 'check_out',
    description: 'Clock out for daily attendance',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'attendance:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'cancel_my_leave': {
    name: 'cancel_my_leave',
    description: 'Cancel own pending leave request',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'leave:cancel_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      requestId: { type: 'number', required: false }
    }
  },

  'update_my_profile': {
    name: 'update_my_profile',
    description: 'Update own contact phone or emergency details',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'profile:update_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {
      phone: { type: 'string', required: false },
      emergency_contact: { type: 'string', required: false },
      emergency_phone: { type: 'string', required: false }
    }
  },

  'get_my_onboarding_status': {
    name: 'get_my_onboarding_status',
    description: 'View own onboarding task completion progress',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'onboarding:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'get_my_tasks': {
    name: 'get_my_tasks',
    description: 'View own assigned tasks and duties',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'tasks:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  'get_my_documents': {
    name: 'get_my_documents',
    description: 'View own uploaded identity and contract documents',
    allowedRoles: ['EMPLOYEE', 'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER'],
    requiredPermission: 'documents:view_self',
    requiresOrgContext: true,
    selfScoped: true,
    requiresConfirmation: false,
    requiresAudit: true,
    parameters: {}
  },

  // ─── ALIASES ──────────────────────────────────────────────────────────────
  'onboard_employee': { aliasOf: 'create_employee' },
  'get_department_attendance': { aliasOf: 'get_attendance' },
  'apply_my_leave': { aliasOf: 'apply_leave' },
  'get_my_salary_slip': { aliasOf: 'get_my_payslip' },
  'generate_payroll_report': { aliasOf: 'get_payroll_information' },
  'approve_leave': { aliasOf: 'get_leave_requests' },
  'reject_leave': { aliasOf: 'get_leave_requests' },
  'assign_employee_department': { aliasOf: 'update_employee' },
  'get_missing_documents': { aliasOf: 'get_employee_details' },
  'get_joined_this_month': { aliasOf: 'get_employees_joined_range' },
  'get_employees_by_department': { aliasOf: 'list_employees' },
  'compare_attendance': { aliasOf: 'compare_department_attendance' },
  'highest_absenteeism': { aliasOf: 'get_absenteeism_rate' },
  'headcount': { aliasOf: 'get_department_headcount' },
  'headcount_by_department': { aliasOf: 'get_department_headcount' },
  'average_tenure': { aliasOf: 'get_employee_tenure' },
  'leave_utilization': { aliasOf: 'get_leave_utilization' },
  'consecutive_absences': { aliasOf: 'get_consecutive_absences' },
  'attendance_trends': { aliasOf: 'get_attendance_trends' },
  'leave_trends': { aliasOf: 'get_leave_trends' },
  'get_alerts': { aliasOf: 'get_insights' },
  'show_insights': { aliasOf: 'get_insights' },
  'show_alerts': { aliasOf: 'get_insights' }
};


/**
 * Resolve canonical tool contract (following any aliases).
 */
function getToolContract(toolName) {
  if (!toolName) return null;
  const entry = TOOL_REGISTRY[toolName];
  if (!entry) return null;
  if (entry.aliasOf) {
    return TOOL_REGISTRY[entry.aliasOf] || null;
  }
  return entry;
}

/**
 * Check whether a tool name or alias is registered.
 */
function isToolRegistered(toolName) {
  return !!getToolContract(toolName);
}

module.exports = {
  TOOL_REGISTRY,
  getToolContract,
  isToolRegistered
};
