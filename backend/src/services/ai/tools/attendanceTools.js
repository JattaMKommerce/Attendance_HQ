/**
 * Attendance Backend Tools for AI Assistant
 * 
 * Supports both Employee self-attendance and Admin organization attendance.
 * Strictly enforces organization_id tenant boundaries on all queries and updates.
 */

const db = require('../../../config/db');
const attendanceService = require('../../attendanceService');

/**
 * Get attendance for authenticated employee for a specific month (Self)
 */
async function getMyAttendance(organizationId, userContext, dateObj = {}) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your user account.' };
  }

  const curYear = dateObj.year || new Date().getFullYear();
  const curMonth = dateObj.month || (new Date().getMonth() + 1);

  const startDate = `${curYear}-${String(curMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(curYear, curMonth, 0).getDate();
  const endDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const [records] = await db.query(
    `SELECT * FROM attendance_records 
     WHERE employee_id = ? AND organization_id = ? AND date BETWEEN ? AND ?
     ORDER BY date DESC`,
    [userContext.employee_id, organizationId, startDate, endDate]
  );

  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let lateCount = 0;
  let totalMinutes = 0;

  for (let r of records) {
    if (r.status === 'present' || r.status === 'wfh') presentCount++;
    else if (r.status === 'half_day') halfDayCount++;
    else if (r.status === 'absent') absentCount++;

    if (r.late_minutes > 0) lateCount++;
    totalMinutes += (r.work_duration_minutes || 0);
  }

  const totalHours = (totalMinutes / 60).toFixed(1);
  const monthLabel = dateObj.monthName ? `${dateObj.monthName} ${curYear}` : `this month (${curYear}-${curMonth})`;

  const message = `Here is your attendance summary for **${monthLabel}**:
• **Present Days**: ${presentCount}
• **Absent Days**: ${absentCount}
• **Half Days**: ${halfDayCount}
• **Late Logins**: ${lateCount}
• **Total Working Hours**: ${totalHours} hrs`;

  return {
    success: true,
    message,
    data: {
      summary: { present: presentCount, absent: absentCount, halfDay: halfDayCount, late: lateCount, totalHours },
      recentRecords: records.slice(0, 5)
    }
  };
}

/**
 * Unified Attendance Tool for Admin: handles absent today, on leave today, department attendance, or overall overview
 */
async function getAttendance(organizationId, params = {}, resolvedData = {}) {
  const dateStr = resolvedData.dates?.date || new Date().toISOString().split('T')[0];

  // 1. Department specific attendance
  if (resolvedData.department) {
    return await getDepartmentAttendance(organizationId, resolvedData.department, dateStr);
  }

  // 2. Employees on leave today
  if (params.filter === 'on_leave' || (params.rawText && params.rawText.toLowerCase().includes('on leave today'))) {
    const [leaveRows] = await db.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.reason,
              e.first_name, e.last_name, e.employee_code,
              lt.name as leave_type_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.organization_id = ? 
         AND lr.status = 'approved'
         AND ? BETWEEN lr.start_date AND lr.end_date`,
      [organizationId, dateStr]
    );

    if (leaveRows.length === 0) {
      return {
        success: true,
        message: `No employees are on approved leave today (${dateStr}).`,
        data: []
      };
    }

    const list = leaveRows.map(r => 
      `• **${r.first_name} ${r.last_name}** (${r.employee_code}) - ${r.leave_type_name} (Reason: ${r.reason || 'Personal'})`
    ).join('\n');

    return {
      success: true,
      message: `Found **${leaveRows.length}** employee(s) on approved leave today (${dateStr}):\n\n${list}`,
      data: leaveRows
    };
  }

  // 3. Employees absent today
  return await getAbsentToday(organizationId, dateStr);
}

/**
 * Show employees absent today (Admin/Manager)
 */
async function getAbsentToday(organizationId, dateStr = new Date().toISOString().split('T')[0]) {
  const [allEmps] = await db.query(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, 
            d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? AND e.status = 'active'`,
    [organizationId]
  );

  const [presentRecords] = await db.query(
    `SELECT employee_id, status FROM attendance_records 
     WHERE organization_id = ? AND date = ? AND status IN ('present', 'late', 'half_day', 'wfh')`,
    [organizationId, dateStr]
  );

  const presentSet = new Set(presentRecords.map(r => r.employee_id));
  const absentEmps = allEmps.filter(e => !presentSet.has(e.id));

  const isToday = dateStr === new Date().toISOString().split('T')[0];
  const dateLabel = isToday ? `today (${dateStr})` : `on ${dateStr}`;

  if (absentEmps.length === 0) {
    return {
      success: true,
      message: `All ${allEmps.length} active employees are marked present or on leave ${dateLabel}. No unscheduled absences.`,
      data: []
    };
  }

  const list = absentEmps
    .map(e => `• **${e.first_name} ${e.last_name}** (${e.employee_code}) - ${e.department_name || 'General'}`)
    .join('\n');

  return {
    success: true,
    message: `There are **${absentEmps.length}** employee(s) absent ${dateLabel}:\n\n${list}`,
    data: absentEmps
  };
}

/**
 * Show attendance for a specific department (Admin/Manager)
 */
async function getDepartmentAttendance(organizationId, department, dateStr = new Date().toISOString().split('T')[0]) {
  const [records] = await db.query(
    `SELECT e.employee_code, e.first_name, e.last_name,
            COALESCE(a.status, 'absent') as attendance_status,
            a.check_in_time, a.check_out_time
     FROM employees e
     LEFT JOIN attendance_records a ON e.id = a.employee_id AND a.date = ? AND a.organization_id = ?
     WHERE e.organization_id = ? AND e.department_id = ? AND e.status = 'active'
     ORDER BY e.first_name ASC`,
    [dateStr, organizationId, organizationId, department.id]
  );

  if (records.length === 0) {
    return {
      success: true,
      message: `No active employees found in the ${department.name} department for ${dateStr}.`,
      data: []
    };
  }

  let presentCount = 0;
  let absentCount = 0;

  const list = records.map(r => {
    const isPresent = r.attendance_status !== 'absent';
    if (isPresent) presentCount++;
    else absentCount++;

    const statusBadge = isPresent ? `✓ Present (${r.check_in_time ? String(r.check_in_time).slice(0, 5) : 'Checked in'})` : '✗ Absent';
    return `• **${r.first_name} ${r.last_name}** (${r.employee_code}): ${statusBadge}`;
  }).join('\n');

  const message = `Attendance for **${department.name}** Department on **${dateStr}**:
Summary: **${presentCount} Present**, **${absentCount} Absent** (Total: ${records.length})

${list}`;

  return {
    success: true,
    message,
    data: records
  };
}

/**
 * Check-in self
 */
async function checkIn(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().split(' ')[0];

  const [existing] = await db.query(
    'SELECT * FROM attendance_records WHERE employee_id = ? AND organization_id = ? AND date = ?',
    [userContext.employee_id, organizationId, today]
  );

  if (existing.length > 0 && existing[0].check_in_time) {
    return {
      success: true,
      message: `You are already checked in today at ${existing[0].check_in_time.slice(0, 5)}.`
    };
  }

  if (existing.length > 0) {
    await db.query(
      'UPDATE attendance_records SET check_in_time = ?, status = "present" WHERE id = ? AND organization_id = ?',
      [now, existing[0].id, organizationId]
    );
  } else {
    await db.query(
      'INSERT INTO attendance_records (organization_id, employee_id, date, check_in_time, status) VALUES (?, ?, ?, ?, "present")',
      [organizationId, userContext.employee_id, today, now]
    );
  }

  return {
    success: true,
    message: `Done. You have been checked in successfully at ${now.slice(0, 5)}.`
  };
}

/**
 * Check-out self
 */
async function checkOut(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().split(' ')[0];

  const [existing] = await db.query(
    'SELECT * FROM attendance_records WHERE employee_id = ? AND organization_id = ? AND date = ?',
    [userContext.employee_id, organizationId, today]
  );

  if (existing.length === 0 || !existing[0].check_in_time) {
    return {
      success: false,
      message: 'You have not checked in today yet.'
    };
  }

  await db.query(
    'UPDATE attendance_records SET check_out_time = ? WHERE id = ? AND organization_id = ?',
    [now, existing[0].id, organizationId]
  );

  return {
    success: true,
    message: `Done. You have been checked out successfully at ${now.slice(0, 5)}. Have a wonderful evening!`
  };
}

module.exports = {
  getMyAttendance,
  getAttendance,
  getAbsentToday,
  getDepartmentAttendance,
  checkIn,
  checkOut
};
