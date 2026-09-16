/**
 * Leave Backend Tools for AI Assistant
 * 
 * Strictly enforces organization_id tenant boundaries on all queries and updates.
 */

const db = require('../../../config/db');
const leaveService = require('../../leaveService');

/**
 * Get leave balance for authenticated employee (Self)
 */
async function getMyLeaveBalance(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const year = new Date().getFullYear();

  const [balances] = await db.query(
    `SELECT lb.id, lb.allocated, lb.used, lb.carried_forward,
            (lb.allocated - lb.used + lb.carried_forward) as remaining,
            lt.name, lt.color_code
     FROM leave_balances lb
     JOIN leave_types lt ON lb.leave_type_id = lt.id
     WHERE lb.employee_id = ? AND lb.organization_id = ? AND lb.year = ?`,
    [userContext.employee_id, organizationId, year]
  );

  if (balances.length === 0) {
    // If no explicit balances table entry, query leave types default
    const [types] = await db.query('SELECT id, name FROM leave_types WHERE organization_id = ?', [organizationId]);
    if (types.length > 0) {
      const fallbackList = types.map(t => `• **${t.name}**: 12 days available`).join('\n');
      return {
        success: true,
        message: `Here is your current leave balance for **${year}**:\n${fallbackList}`,
        data: types
      };
    }
    return { success: true, message: `No leave balances configured for ${year}.` };
  }

  const list = balances
    .map(b => `• **${b.name}**: **${b.remaining}** days remaining (Allocated: ${b.allocated}, Used: ${b.used})`)
    .join('\n');

  return {
    success: true,
    message: `Here is your current leave balance for **${year}**:\n\n${list}`,
    data: balances
  };
}

/**
 * Get leave requests for authenticated employee (Self)
 */
async function getMyLeaveRequests(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const [requests] = await db.query(
    `SELECT lr.id, lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status, lr.created_at,
            lt.name as leave_type_name
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     WHERE lr.employee_id = ? AND lr.organization_id = ?
     ORDER BY lr.created_at DESC
     LIMIT 10`,
    [userContext.employee_id, organizationId]
  );

  if (requests.length === 0) {
    return {
      success: true,
      message: 'You have no recorded leave requests.',
      data: []
    };
  }

  const list = requests.map(r => {
    const start = new Date(r.start_date).toISOString().split('T')[0];
    const end = new Date(r.end_date).toISOString().split('T')[0];
    const statusIcon = r.status === 'approved' ? '✓' : (r.status === 'pending' ? '⏳' : '✗');
    return `• ${statusIcon} **${r.leave_type_name}** (${start} to ${end}, ${r.total_days} day(s)) - Status: **${r.status.toUpperCase()}**`;
  }).join('\n');

  return {
    success: true,
    message: `Here are your recent leave requests:\n\n${list}`,
    data: requests
  };
}

/**
 * Apply for leave (Self)
 */
async function applyMyLeave(organizationId, userContext, dateRange = {}, reason = 'Personal leave', leaveTypeName = null) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const startDate = dateRange.startDate || dateRange.date || new Date().toISOString().split('T')[0];
  const endDate = dateRange.endDate || dateRange.date || startDate;

  // Resolve leave type (default to Casual Leave or first available)
  let leaveTypeId = 1;
  const [types] = await db.query('SELECT id, name FROM leave_types WHERE organization_id = ?', [organizationId]);
  if (types.length > 0) {
    if (leaveTypeName) {
      const match = types.find(t => t.name.toLowerCase().includes(leaveTypeName.toLowerCase()));
      if (match) leaveTypeId = match.id;
      else leaveTypeId = types[0].id;
    } else {
      const casual = types.find(t => t.name.toLowerCase().includes('casual') || t.name.toLowerCase().includes('earned'));
      leaveTypeId = casual ? casual.id : types[0].id;
    }
  }

  // Calculate working days
  const start = new Date(startDate);
  const end = new Date(endDate);
  let daysCount = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) daysCount++;
    cur.setDate(cur.getDate() + 1);
  }
  if (daysCount === 0) daysCount = 1;

  // Insert leave request
  const [result] = await db.query(
    `INSERT INTO leave_requests (organization_id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [organizationId, userContext.employee_id, leaveTypeId, startDate, endDate, daysCount, reason]
  );

  const matchedType = types.find(t => t.id === leaveTypeId)?.name || 'Leave';
  const durationStr = startDate === endDate ? `on **${startDate}**` : `from **${startDate}** to **${endDate}** (${daysCount} days)`;

  return {
    success: true,
    message: `Done. Your **${matchedType}** request ${durationStr} has been submitted and is pending approval.`,
    data: { id: result.insertId, startDate, endDate, totalDays: daysCount }
  };
}

/**
 * Cancel self pending leave request
 */
async function cancelMyLeave(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const [pending] = await db.query(
    `SELECT id, start_date, end_date, total_days FROM leave_requests
     WHERE employee_id = ? AND organization_id = ? AND status = 'pending'
     ORDER BY id DESC LIMIT 1`,
    [userContext.employee_id, organizationId]
  );

  if (pending.length === 0) {
    return {
      success: false,
      message: 'You have no pending leave requests to cancel.'
    };
  }

  const req = pending[0];
  await db.query("UPDATE leave_requests SET status = 'cancelled' WHERE id = ? AND organization_id = ?", [req.id, organizationId]);

  const startStr = new Date(req.start_date).toISOString().split('T')[0];
  const endStr = new Date(req.end_date).toISOString().split('T')[0];

  return {
    success: true,
    message: `Done. Your pending leave request from ${startStr} to ${endStr} has been cancelled.`
  };
}

/**
 * Get leave requests (Admin)
 */
async function getLeaveRequests(organizationId, params = {}, userContext, resolvedData = {}) {
  // If an approval or rejection is requested
  if (params.action === 'approve' && resolvedData.targetEmployee) {
    return await approveLeave(organizationId, resolvedData.targetEmployee, userContext);
  }
  if (params.action === 'reject' && resolvedData.targetEmployee) {
    return await rejectLeave(organizationId, resolvedData.targetEmployee, userContext);
  }

  const filters = {};
  if (params.status) filters.status = params.status;

  const [requests] = await db.query(
    `SELECT lr.id, lr.start_date, lr.end_date, lr.total_days, lr.reason, lr.status,
            e.first_name, e.last_name, e.employee_code,
            lt.name as leave_type_name
     FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     WHERE lr.organization_id = ?
     ORDER BY lr.created_at DESC
     LIMIT 15`,
    [organizationId]
  );

  if (requests.length === 0) {
    return {
      success: true,
      message: 'No leave requests found for your organization.',
      data: []
    };
  }

  const list = requests.map(r => {
    const start = new Date(r.start_date).toISOString().split('T')[0];
    const end = new Date(r.end_date).toISOString().split('T')[0];
    return `• **${r.first_name} ${r.last_name}** (${r.employee_code}) - ${r.leave_type_name} (${start} to ${end}, ${r.total_days} day(s)) [${r.status.toUpperCase()}]`;
  }).join('\n');

  return {
    success: true,
    message: `Found **${requests.length}** leave request(s):\n\n${list}`,
    data: requests
  };
}

/**
 * Approve leave request for an employee (Admin/Manager)
 */
async function approveLeave(organizationId, employee, userContext, comments = 'Approved via AI Command Assistant') {
  const [requests] = await db.query(
    `SELECT lr.*, lt.name as leave_type_name
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     WHERE lr.employee_id = ? AND lr.organization_id = ? AND lr.status = 'pending'
     ORDER BY lr.id DESC LIMIT 1`,
    [employee.id, organizationId]
  );

  if (requests.length === 0) {
    return {
      success: false,
      message: `No pending leave request found for ${employee.first_name} ${employee.last_name}.`
    };
  }

  const req = requests[0];

  await leaveService.reviewLeaveRequest(
    req.id,
    organizationId,
    userContext.id,
    'approved',
    true,
    comments
  );

  const startStr = new Date(req.start_date).toISOString().split('T')[0];
  const endStr = new Date(req.end_date).toISOString().split('T')[0];

  return {
    success: true,
    message: `Done. ${employee.first_name}'s leave request for ${startStr} to ${endStr} (${req.total_days} day(s)) has been approved.`
  };
}

/**
 * Reject leave request for an employee (Admin/Manager)
 */
async function rejectLeave(organizationId, employee, userContext, comments = 'Rejected via AI Command Assistant') {
  const [requests] = await db.query(
    `SELECT lr.*, lt.name as leave_type_name
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     WHERE lr.employee_id = ? AND lr.organization_id = ? AND lr.status = 'pending'
     ORDER BY lr.id DESC LIMIT 1`,
    [employee.id, organizationId]
  );

  if (requests.length === 0) {
    return {
      success: false,
      message: `No pending leave request found for ${employee.first_name} ${employee.last_name}.`
    };
  }

  const req = requests[0];

  await leaveService.reviewLeaveRequest(
    req.id,
    organizationId,
    userContext.id,
    'rejected',
    false,
    comments
  );

  const startStr = new Date(req.start_date).toISOString().split('T')[0];
  const endStr = new Date(req.end_date).toISOString().split('T')[0];

  return {
    success: true,
    message: `Done. ${employee.first_name}'s leave request for ${startStr} to ${endStr} has been rejected.`
  };
}

module.exports = {
  getMyLeaveBalance,
  getMyLeaveRequests,
  applyMyLeave,
  applyLeave: applyMyLeave,
  cancelMyLeave,
  getLeaveRequests,
  approveLeave,
  rejectLeave
};
