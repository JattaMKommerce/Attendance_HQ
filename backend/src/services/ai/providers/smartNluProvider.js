/**
 * Smart NLU Provider for HRMS AI Assistant (Phase 2)
 * 
 * Extends AIProvider base class.
 * Provides deterministic natural language understanding mapping commands
 * into strictly structured tool calls validated against toolRegistry:
 * {
 *   "tool": "get_absent_today",
 *   "intent": "get_absent_today",
 *   "params": { ... }
 * }
 */

const AIProvider = require('./aiProvider');
const { resolveDate } = require('../dateResolver');

class SmartNluProvider extends AIProvider {
  /**
   * Resolve user natural language input into a structured intent and parameters.
   */
  async resolveIntent(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return { tool: 'unknown', intent: 'unknown', params: {}, confidence: 0 };
    }

    const clean = text.trim();
    const lower = clean.toLowerCase();

    // Helper to package response with both 'tool' and 'intent'
    const result = (toolName, params = {}, confidence = 0.98) => ({
      tool: toolName,
      intent: toolName,
      params,
      confidence
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 1. EMPLOYEE CAPABILITIES (Self-Scoped)
    // ──────────────────────────────────────────────────────────────────────────

    // 1.1 Profile (Self)
    if (
      lower.includes('show my profile') || 
      lower.includes('my profile') || 
      lower.includes('view my profile') ||
      lower === 'profile' ||
      lower === 'who am i'
    ) {
      return result('get_my_profile');
    }

    // 1.2 Attendance (Self)
    if (
      lower.includes('show my attendance') || 
      lower.includes('my attendance') ||
      lower.includes('view my attendance') ||
      lower.includes('check my attendance')
    ) {
      const dateInfo = resolveDate(clean);
      return result('get_my_attendance', { 
        rawText: clean,
        date: dateInfo.date,
        month: dateInfo.month,
        year: dateInfo.year
      });
    }

    // Clock in / Clock out (Self)
    if (lower.startsWith('check in') || lower.startsWith('clock in') || lower === 'i am in' || lower === 'punch in') {
      return result('check_in');
    }
    if (lower.startsWith('check out') || lower.startsWith('clock out') || lower === 'punch out') {
      return result('check_out');
    }

    // 1.3 Leave Balance (Self)
    if (
      !lower.includes('utilization') &&
      !lower.includes('used more than') &&
      !lower.includes('%') &&
      !lower.includes('percent') &&
      !lower.includes('which employees') &&
      (
        lower.includes('how many leaves do i have') ||
        lower.includes('my leave balance') || 
        lower.includes('show my leave balance') || 
        lower.includes('view my leave balance') ||
        lower.includes('check my leave balance') ||
        lower === 'leave balance' ||
        (lower.includes('leave') && lower.includes('balance') && (lower.includes('my') || lower.includes('have i')))
      )
    ) {
      let leaveType = null;
      if (lower.includes('sick')) leaveType = 'Sick Leave';
      else if (lower.includes('casual')) leaveType = 'Casual Leave';
      else if (lower.includes('earned') || lower.includes('annual')) leaveType = 'Earned Leave';

      return result('get_my_leave_balance', leaveType ? { leaveType } : {});
    }

    // 1.4 Leave Requests (Self)
    if (
      lower.includes('my leave requests') ||
      lower.includes('my pending leaves') ||
      lower.includes('my leave applications') ||
      lower.includes('status of my leave') ||
      (lower.includes('my leave') && (lower.includes('status') || lower.includes('request') || lower.includes('history')))
    ) {
      return result('get_my_leave_requests');
    }

    // 1.5 Apply Leave (Self)
    if ((lower.startsWith('apply') || lower.startsWith('request') || lower.startsWith('take')) && lower.includes('leave')) {
      const reasonMatch = clean.match(/(?:reason|for|because)[:\s]+([^,.]+)/i);
      const dateParsed = resolveDate(clean);
      let leaveType = null;
      if (lower.includes('sick')) leaveType = 'Sick Leave';
      else if (lower.includes('casual')) leaveType = 'Casual Leave';
      else if (lower.includes('earned') || lower.includes('annual')) leaveType = 'Earned Leave';

      return result('apply_leave', {
        startDate: dateParsed.startDate || dateParsed.date,
        endDate: dateParsed.endDate || dateParsed.date,
        rawDateText: clean,
        leaveType,
        reason: reasonMatch ? reasonMatch[1].trim() : 'Personal leave'
      }, 0.95);
    }

    // Cancel Leave (Self)
    if (lower.includes('cancel') && lower.includes('leave')) {
      const numMatch = clean.match(/\b\d+\b/);
      return result('cancel_my_leave', numMatch ? { requestId: parseInt(numMatch[0], 10) } : {});
    }

    // 1.6 Payslip / Salary Slip (Self)
    if (
      lower.includes('show my payslip') ||
      lower.includes('my payslip') || 
      lower.includes('salary slip') || 
      lower.includes('my pay slip') ||
      lower.includes('my salary') ||
      lower.includes('view my payslip') ||
      lower.includes('download my payslip')
    ) {
      return result('get_my_payslip', { rawText: clean });
    }

    // Update Profile (Self)
    if (lower.includes('update my phone') || lower.includes('change my phone')) {
      const phoneMatch = clean.match(/(\+?\d[\d\s-]{8,14}\d)/);
      return result('update_my_profile', {
        phone: phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : null,
        rawText: clean
      });
    }

    // Emergency Contact (Self)
    if (lower.includes('emergency contact')) {
      const phoneMatch = clean.match(/(\+?\d[\d\s-]{8,14}\d)/);
      const nameMatch = clean.match(/(?:contact\s+(?:is\s+|to\s+)?)([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
      return result('update_my_profile', {
        emergency_contact: nameMatch ? nameMatch[1].trim() : 'Emergency Contact',
        emergency_phone: phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : null
      }, 0.9);
    }

    // Onboarding Status (Self)
    if (lower.includes('onboarding status') || (lower.includes('my onboarding') && !lower.includes('rahul'))) {
      return result('get_my_onboarding_status');
    }

    // Tasks (Self)
    if (lower.includes('my pending tasks') || lower.includes('my tasks') || lower.includes('show my task')) {
      return result('get_my_tasks');
    }

    // Documents (Self)
    if (lower.includes('show my documents') || lower.includes('my documents') || lower.includes('view my document')) {
      return result('get_my_documents');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ADMIN CAPABILITIES
    // ──────────────────────────────────────────────────────────────────────────

    // 2.1 List All Employees (Admin)
    if (
      lower === 'show all employees' ||
      lower === 'list all employees' ||
      lower === 'list employees' ||
      lower === 'get all employees' ||
      lower === 'all employees' ||
      lower.startsWith('show all employees') ||
      lower.startsWith('list all employees') ||
      lower.startsWith('list employees')
    ) {
      return result('list_employees');
    }

    // 2.2 Onboard Employee Multi-Step Workflow
    // E.g. "Onboard Rahul", "Onboard Rahul as Junior Associate in IT"
    if (lower.startsWith('onboard ') || lower.startsWith('create employee') || lower.startsWith('add employee')) {
      const emailMatch = clean.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const email = emailMatch ? emailMatch[1] : null;

      // Check for joining date in text (e.g. "joining on 2026-10-01", "joining Friday")
      let joiningDate = null;
      const joinMatch = clean.match(/(?:joining\s+(?:on\s+)?|joining\s+date\s+(?:is\s+)?)([^,.]+)/i);
      if (joinMatch) {
        const parsed = resolveDate(joinMatch[1].trim());
        if (parsed.resolved) joiningDate = parsed.date;
      }

      // Check pattern: "Onboard Rahul as Junior Associate in IT"
      const detailedMatch = clean.match(/onboard\s+([a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)?)\s+as\s+([^,.\n\r]+?)\s+in\s+([a-zA-Z\s]+?)(?:department)?(?:\s*[,.]|$|\s+joining|\s+email)/i);
      if (detailedMatch) {
        return result('create_employee', {
          name: detailedMatch[1].trim(),
          designationName: detailedMatch[2].trim(),
          departmentName: detailedMatch[3].trim().replace(/department/i, '').trim(),
          joiningDate,
          email
        });
      }

      // Pattern: "Onboard Rahul as Junior Associate" (without department)
      const desigOnlyMatch = clean.match(/onboard\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+as\s+([^,.\n\r]+?)(?:\s*[,.]|$|\s+joining|\s+email)/i);
      if (desigOnlyMatch) {
        return result('create_employee', {
          name: desigOnlyMatch[1].trim(),
          designationName: desigOnlyMatch[2].trim(),
          departmentName: null,
          joiningDate,
          email
        });
      }

      // Pattern: "Onboard Rahul in IT" (without designation)
      const deptOnlyMatch = clean.match(/onboard\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+in\s+([a-zA-Z\s]+?)(?:department)?(?:\s*[,.]|$|\s+joining|\s+email)/i);
      if (deptOnlyMatch) {
        return result('create_employee', {
          name: deptOnlyMatch[1].trim(),
          designationName: null,
          departmentName: deptOnlyMatch[2].trim().replace(/department/i, '').trim(),
          joiningDate,
          email
        });
      }

      // Pattern: "Onboard Rahul" (Name only - incomplete slot filling)
      const nameMatch = clean.match(/(?:onboard|create employee|add employee)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)(?:\s*[,.]|$)/i);
      if (nameMatch) {
        return result('create_employee', {
          name: nameMatch[1].trim(),
          designationName: null,
          departmentName: null,
          joiningDate,
          email
        });
      }

      return result('create_employee', { name: clean.replace(/onboard\s+/i, '').trim() });
    }

    // 2.3 Deactivate Employee (Destructive - requires confirmation)
    const deactivateMatch = clean.match(/(?:deactivate|remove|delete|terminate)(?:\s+employee)?\s+([a-zA-Z0-9_\-]+(?:\s+[a-zA-Z0-9_\-]+)?)$/i);
    if (deactivateMatch && !lower.includes('leave') && !lower.includes('department')) {
      return result('deactivate_employee', {
        employee: deactivateMatch[1].trim()
      });
    }

    // 2.4 Update Employee
    const desigMatch = clean.match(/(?:update|change)\s+([a-zA-Z0-9_\-\s]+?)(?:'s)?\s+designation(?:\s+(?:to\s+)?([a-zA-Z0-9_\-\s]+))?$/i);
    if (desigMatch) {
      return result('update_employee', {
        employee: desigMatch[1].trim().replace(/'s$/i, ''),
        designation: desigMatch[2] ? desigMatch[2].trim() : 'Senior Associate'
      });
    }

    const phoneUpdateMatch = clean.match(/(?:update|change)\s+([a-zA-Z0-9_\-\s]+?)(?:'s)?\s+phone(?:\s+number)?\s+(?:to\s+)?(\+?\d[\d\s-]{8,14}\d)/i);
    if (phoneUpdateMatch) {
      return result('update_employee', {
        employee: phoneUpdateMatch[1].trim().replace(/'s$/i, ''),
        phone: phoneUpdateMatch[2].replace(/\s+/g, '')
      });
    }

    const assignDeptRegex1 = /(?:put|move|assign|change)\s+([a-zA-Z0-9_\-\s]+?)\s+(?:to|in)(?:\s+the)?\s+([a-zA-Z\s]+?)(?:\s+department)?$/i;
    const assignDeptRegex2 = /change\s+([a-zA-Z0-9_\-\s]+?)(?:'s)?\s+department\s+(?:to|in)\s+([a-zA-Z\s]+?)$/i;
    const assignMatch1 = clean.match(assignDeptRegex1);
    const assignMatch2 = clean.match(assignDeptRegex2);
    if (assignMatch1 || assignMatch2) {
      const match = assignMatch1 || assignMatch2;
      return result('assign_employee_department', {
        employee: match[1].trim().replace(/'s$/i, ''),
        department: match[2].trim()
      });
    }

    // Missing Documents (Admin)
    if (lower.includes('missing document') || lower.includes('documents are missing') || lower.includes('pending document')) {
      return result('get_missing_documents');
    }

    // 2.5 Get Employee Details / Lookup
    // E.g. "Get employee Rahul", "Find employee EMP-102", "Show details for Rahul from IT", "Lookup employee Rahul"
    const empDetailsMatch = clean.match(/(?:show\s+details\s+for|view\s+employee|get\s+employee|find\s+employee|search\s+employee|lookup\s+employee)\s+([a-zA-Z0-9_\-\s]+)$/i);
    if (empDetailsMatch) {
      return result('get_employee', { employee: empDetailsMatch[1].trim() });
    }

    // 2.6 Attendance (Admin) & Absent Queries
    // Example: "Show employees who were absent yesterday." -> tool: "get_absent_today", params: { date: "YYYY-MM-DD" }
    if (
      lower.includes('absent yesterday') ||
      lower.includes('who was absent yesterday') ||
      lower.includes('who were absent yesterday') ||
      lower.includes('employees who were absent yesterday') ||
      lower.includes('employees absent yesterday')
    ) {
      const yestDate = resolveDate('yesterday');
      return result('get_absent_today', { date: yestDate.date });
    }

    if (
      lower.includes('absent today') || 
      lower.includes('who is absent today') ||
      lower.includes('who is absent') ||
      lower === 'show absentees'
    ) {
      const todayDate = resolveDate('today');
      return result('get_absent_today', { date: todayDate.date });
    }

    if (lower.includes('absent on') || lower.includes('who was absent on')) {
      const dateParsed = resolveDate(clean);
      return result('get_absent_today', { date: dateParsed.date });
    }

    const empAttMatch = clean.match(/attendance\s+for\s+(emp-[a-zA-Z0-9_\-]+|\b\d+\b)$/i) ||
                        clean.match(/([a-zA-Z0-9_\-]+)'s\s+attendance/i);
    if (empAttMatch && !['my', 'our'].includes(empAttMatch[1].toLowerCase())) {
      return result('get_attendance', {
        employee: empAttMatch[1].trim(),
        rawText: clean
      });
    }

    if (
      !lower.includes('trend') &&
      !lower.includes('compare') &&
      (
        lower.includes('employees on leave today') ||
        lower.includes('show employees on leave today') ||
        lower.includes('employees absent') ||
        lower.includes('get attendance') ||
        lower.includes('show attendance')
      )
    ) {
      const deptAttMatch = clean.match(/(?:show\s+)?attendance\s+(?:for|of)(?:\s+the)?\s+([a-zA-Z\s]+?)(?:\s+department)?$/i);
      const dateParsed = resolveDate(clean);
      return result('get_attendance', {
        date: dateParsed.date,
        department: deptAttMatch ? deptAttMatch[1].trim() : null,
        filter: lower.includes('absent') ? 'absent' : (lower.includes('leave') ? 'on_leave' : 'all'),
        rawText: clean
      });
    }

    // 2.7 Leave Requests (Admin)
    if (
      lower.includes('leave requests') || 
      lower.includes('pending leaves') ||
      lower === 'get leave requests' ||
      lower === 'show leaves'
    ) {
      return result('get_leave_requests', { rawText: clean });
    }

    // 2.8 Payroll Information (Admin)
    if (
      lower.includes('payroll report') || 
      lower.includes('payroll information') ||
      lower.includes('payroll summary') ||
      (lower.includes('payroll') && (lower.includes('show') || lower.includes('generate') || lower.includes('get')))
    ) {
      return result('get_payroll_information', { rawText: clean });
    }

    // 2.9 Salary Update (Sensitive / Confirmation required)
    const salaryMatch = clean.match(/(?:update|change|set)\s+([a-zA-Z0-9_\-\s]+?)(?:'s)?\s+(?:salary|compensation)(?:\s+to)?\s+(?:₹|rs\.?|\$)?\s*(\d+)/i);
    if (salaryMatch) {
      return result('update_employee_salary', {
        employee: salaryMatch[1].trim().replace(/'s$/i, ''),
        basicSalary: parseInt(salaryMatch[2], 10),
        grossSalary: parseInt(salaryMatch[2], 10)
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ORGANIZATIONAL ANALYTICS (Phase 3B - Admin/HR)
    // ──────────────────────────────────────────────────────────────────────────

    // 3.1 Department Attendance Comparison
    // "Compare IT and Sales attendance for Q3." / "Compare IT and Sales attendance"
    if (lower.includes('compare') && lower.includes('attendance')) {
      const compMatch = clean.match(/compare\s+(?:attendance\s+(?:between|of)\s+)?([a-zA-Z\s&]+?)\s+(?:and|vs\.?|with)\s+([a-zA-Z\s&]+?)(?:\s+attendance)?(?:\s+(?:for|in|this|during)\s+(.+))?$/i);
      if (compMatch) {
        let rawPeriod = compMatch[3] ? compMatch[3].trim() : 'this quarter';
        const dateInfo = resolveDate(rawPeriod);
        return result('compare_department_attendance', {
          department1: compMatch[1].trim().replace(/^the\s+/i, '').replace(/\s+department$/i, ''),
          department2: compMatch[2].trim().replace(/^the\s+/i, '').replace(/\s+department$/i, ''),
          period: rawPeriod,
          startDate: dateInfo.startDate || dateInfo.date,
          endDate: dateInfo.endDate || dateInfo.date
        });
      }
    }

    // 3.2 Absenteeism Rate / Highest Absenteeism
    // "Which department has the highest absenteeism this month?"
    if (
      lower.includes('absenteeism') ||
      (lower.includes('highest') && lower.includes('absent')) ||
      (lower.includes('most') && lower.includes('absent') && lower.includes('department'))
    ) {
      const dateInfo = resolveDate(clean);
      return result('get_absenteeism_rate', {
        period: dateInfo.periodName || 'this month',
        startDate: dateInfo.startDate || dateInfo.date,
        endDate: dateInfo.endDate || dateInfo.date,
        rawText: clean
      });
    }

    // 3.3 Leave Utilization
    // "Which employees have used more than 50% of their leave balance?"
    // "Which departments have high leave utilization?"
    if (
      lower.includes('leave utilization') ||
      (lower.includes('leave') && lower.includes('utilization')) ||
      (lower.includes('used more than') && lower.includes('leave')) ||
      (lower.includes('leave balance') && (lower.includes('%') || lower.includes('percent')))
    ) {
      const pctMatch = clean.match(/(\d+)\s*(?:%|percent)/i);
      const threshold = pctMatch ? parseInt(pctMatch[1], 10) : 50;
      const isDept = lower.includes('department') || lower.includes('departments');
      return result('get_leave_utilization', {
        thresholdPercent: threshold,
        groupBy: isDept ? 'department' : 'employee',
        rawText: clean
      });
    }

    // 3.4 Average Employee Tenure
    // "What is the average employee tenure?"
    if (lower.includes('tenure')) {
      return result('get_employee_tenure', { rawText: clean });
    }

    // 3.5 Employees Joined Within Date Range
    // "How many employees joined this month?" / "Who joined this month?"
    if (
      (lower.includes('joined') || lower.includes('joiners')) &&
      !lower.includes('onboard')
    ) {
      const dateInfo = resolveDate(clean);
      return result('get_employees_joined_range', {
        period: dateInfo.periodName || 'this month',
        startDate: dateInfo.startDate || dateInfo.date,
        endDate: dateInfo.endDate || dateInfo.date,
        rawText: clean
      });
    }

    // 3.6 Consecutive Absences
    // "Who has been absent for 3 consecutive working days?"
    if (
      lower.includes('consecutive') ||
      (lower.includes('absent') && lower.includes('in a row'))
    ) {
      const numMatch = clean.match(/(\d+)\s*(?:consecutive|\s+days\s+in\s+a\s+row)/i) || clean.match(/consecutive\s+(?:working\s+)?(?:days\s+)?(\d+)/i);
      const consecutiveDays = numMatch ? parseInt(numMatch[1], 10) : 3;
      return result('get_consecutive_absences', {
        consecutiveDays,
        rawText: clean
      });
    }

    // 3.7 Department Headcount
    // "What is the department headcount?" / "Show department headcount"
    if (
      lower.includes('headcount') ||
      lower.includes('head count') ||
      (lower.includes('employees') && lower.includes('per department'))
    ) {
      return result('get_department_headcount', { rawText: clean });
    }

    // 3.8 Attendance Trends
    // "Show attendance trends"
    if (lower.includes('attendance') && (lower.includes('trend') || lower.includes('trends') || lower.includes('pattern'))) {
      const dateInfo = resolveDate(clean);
      return result('get_attendance_trends', {
        period: dateInfo.periodName || 'this month',
        startDate: dateInfo.startDate || dateInfo.date,
        endDate: dateInfo.endDate || dateInfo.date,
        rawText: clean
      });
    }

    // 3.9 Leave Trends
    // "Show leave trends for this year"
    if (lower.includes('leave') && (lower.includes('trend') || lower.includes('trends') || lower.includes('pattern'))) {
      const dateInfo = resolveDate(clean);
      return result('get_leave_trends', {
        year: dateInfo.year || new Date().getFullYear(),
        rawText: clean
      });
    }

    // 3.10 Proactive HR Insights & Alerts
    // "Show insights", "What are the latest alerts?", "Show critical warnings"
    if (
      lower.includes('insight') ||
      lower.includes('insights') ||
      lower.includes('alert') ||
      lower.includes('alerts') ||
      lower.includes('anomalies') ||
      lower.includes('anomaly')
    ) {
      let severity = null;
      if (lower.includes('critical')) severity = 'CRITICAL';
      else if (lower.includes('warning')) severity = 'WARNING';
      else if (lower.includes('info')) severity = 'INFO';

      let status = null;
      if (lower.includes('unread')) status = 'unread';

      return result('get_insights', {
        severity,
        status,
        rawText: clean
      });
    }

    // Fallback: unknown command
    return result('unknown', { originalText: clean }, 0.1);

  }
}

module.exports = SmartNluProvider;
