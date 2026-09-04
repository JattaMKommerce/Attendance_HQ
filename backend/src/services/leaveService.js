const db = require('../config/db');

exports.getLeaveTypes = async (organizationId) => {
  const [types] = await db.query(`
    SELECT lt.*, lp.yearly_allowance, lp.max_carry_forward, lp.require_attachment_after_days
    FROM leave_types lt
    LEFT JOIN leave_policies lp ON lt.id = lp.leave_type_id
    WHERE lt.organization_id = ?
  `, [organizationId]);
  return types;
};

// ... ApplyLeave/MyRequests removed as this is an HR-only portal now.
// For historical consistency if employees still hit the API, we can leave them, but we focus on HR.

exports.getLeaveRequests = async (organizationId, filters = {}) => {
  let query = `
    SELECT lr.*, lt.name as leave_type_name, lt.color_code, e.first_name, e.last_name, e.employee_code, e.department_id, d.name as department_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE lr.organization_id = ?
  `;
  const params = [organizationId];

  if (filters.status && filters.status !== 'all') {
    query += ' AND lr.status = ?';
    params.push(filters.status);
  }
  
  if (filters.departmentId) {
    query += ' AND e.department_id = ?';
    params.push(filters.departmentId);
  }

  query += ' ORDER BY lr.created_at DESC LIMIT 100'; // Add pagination for 500+ orgs in real-world

  const [requests] = await db.query(query, params);
  return requests;
};

exports.reviewLeaveRequest = async (requestId, organizationId, actionBy, action, isPaid, comments) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [requests] = await connection.query(
      'SELECT * FROM leave_requests WHERE id = ? AND organization_id = ? FOR UPDATE',
      [requestId, organizationId]
    );

    if (requests.length === 0) {
      throw new Error('Leave request not found');
    }

    const request = requests[0];
    if (request.status !== 'pending') {
      throw new Error('Leave request is already processed');
    }

    let status = action === 'approved' ? 'approved' : 'rejected';

    await connection.query(
      'UPDATE leave_requests SET status = ?, approved_as_paid = ? WHERE id = ?',
      [status, isPaid, requestId]
    );

    await connection.query(
      'INSERT INTO leave_approval_history (organization_id, leave_request_id, action_by, action, comments) VALUES (?, ?, ?, ?, ?)',
      [organizationId, requestId, actionBy, action, comments]
    );

    if (status === 'approved' && isPaid) {
      const year = new Date(request.start_date).getFullYear();
      await connection.query(`
        INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year, used)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE used = used + ?
      `, [organizationId, request.employee_id, request.leave_type_id, year, request.total_days, request.total_days]);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.getDashboardMetrics = async (organizationId) => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  
  // People on leave today
  const [onLeaveToday] = await db.query(`
    SELECT COUNT(*) as count FROM leave_requests 
    WHERE organization_id = ? AND status = 'approved' 
    AND start_date <= ? AND end_date >= ?
  `, [organizationId, today, today]);

  // Pending requests count
  const [pendingCount] = await db.query(`
    SELECT COUNT(*) as count FROM leave_requests 
    WHERE organization_id = ? AND status = 'pending'
  `, [organizationId]);

  // Action required (pending with attachments)
  const [actionRequiredCount] = await db.query(`
    SELECT COUNT(*) as count FROM leave_requests 
    WHERE organization_id = ? AND status = 'pending' AND attachment_url IS NOT NULL
  `, [organizationId]);

  // Upcoming leaves (starts in next 7 days)
  const [upcomingLeavesCount] = await db.query(`
    SELECT COUNT(*) as count FROM leave_requests 
    WHERE organization_id = ? AND status = 'approved'
    AND start_date > ? AND start_date <= ?
  `, [organizationId, today, nextWeekStr]);

  // Needs Attention list (Pending with documents or emergency)
  const [needsAttention] = await db.query(`
    SELECT lr.id, lr.start_date, lr.end_date, lr.status, 
           e.first_name, e.last_name, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE lr.organization_id = ? AND lr.status = 'pending' AND lr.attachment_url IS NOT NULL
    ORDER BY lr.created_at ASC
    LIMIT 5
  `, [organizationId]);

  // Upcoming Impact (Group by date and find most affected department)
  // We'll fetch upcoming leaves and process in JS
  const [upcomingRaw] = await db.query(`
    SELECT lr.start_date, d.name as department_name
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE lr.organization_id = ? AND lr.status = 'approved'
    AND lr.start_date > ? AND start_date <= ?
  `, [organizationId, today, nextWeekStr]);

  // Process impact
  const dateMap = {};
  for (const row of upcomingRaw) {
    const dStr = row.start_date.toISOString().split('T')[0];
    if (!dateMap[dStr]) dateMap[dStr] = { total: 0, depts: {} };
    dateMap[dStr].total += 1;
    const dept = row.department_name || 'Unassigned';
    dateMap[dStr].depts[dept] = (dateMap[dStr].depts[dept] || 0) + 1;
  }

  const upcomingImpact = Object.keys(dateMap).map(date => {
    const data = dateMap[date];
    const maxDept = Object.keys(data.depts).reduce((a, b) => data.depts[a] > data.depts[b] ? a : b);
    return {
      date,
      count: data.total,
      mostAffected: maxDept
    };
  }).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  return {
    onLeaveToday: onLeaveToday[0].count,
    pendingRequests: pendingCount[0].count,
    actionRequired: actionRequiredCount[0].count,
    upcomingLeaves: upcomingLeavesCount[0].count,
    needsAttention,
    upcomingImpact
  };
};

exports.getCalendarLeaves = async (organizationId, startDate, endDate) => {
  const [leaves] = await db.query(`
    SELECT lr.id, lr.start_date, lr.end_date, lr.status, 
           lt.name as leave_type_name, lt.color_code, 
           e.first_name, e.last_name, d.name as department_name
    FROM leave_requests lr
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    JOIN employees e ON lr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE lr.organization_id = ? 
      AND lr.status = 'approved'
      AND lr.start_date <= ? AND lr.end_date >= ?
  `, [organizationId, endDate, startDate]);
  return leaves;
};

exports.getEmployeeBalances = async (organizationId, employeeId) => {
  const year = new Date().getFullYear();
  const [balances] = await db.query(`
    SELECT lt.id as leave_type_id, lt.name as leave_type_name, lt.color_code,
           COALESCE(lb.allocated, lp.yearly_allowance) as allocated,
           COALESCE(lb.used, 0) as used,
           COALESCE(lb.carried_forward, 0) as carried_forward
    FROM leave_types lt
    LEFT JOIN leave_policies lp ON lt.id = lp.leave_type_id
    LEFT JOIN leave_balances lb ON lt.id = lb.leave_type_id AND lb.employee_id = ? AND lb.year = ?
    WHERE lt.organization_id = ?
  `, [employeeId, year, organizationId]);
  
  return balances;
};

exports.getAllBalances = async (organizationId, search = '') => {
  let query = `
    SELECT e.id, e.first_name, e.last_name, e.employee_code, d.name as department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.organization_id = ? AND e.status = 'active'
  `;
  const params = [organizationId];

  if (search) {
    query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' LIMIT 50'; // Pagination would be better, limit for now

  const [employees] = await db.query(query, params);
  
  // For each employee, get their balances
  for (let emp of employees) {
    emp.balances = await this.getEmployeeBalances(organizationId, emp.id);
  }

  return employees;
};

exports.adjustBalance = async (organizationId, employeeId, leaveTypeId, action, amount, reason, actionBy) => {
  const year = new Date().getFullYear();
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Upsert balance to ensure record exists
    await connection.query(`
      INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id = id
    `, [organizationId, employeeId, leaveTypeId, year]);
    
    const modifier = action === 'credit' ? amount : -amount;
    
    // Update allocated
    await connection.query(`
      UPDATE leave_balances 
      SET allocated = allocated + ?
      WHERE organization_id = ? AND employee_id = ? AND leave_type_id = ? AND year = ?
    `, [modifier, organizationId, employeeId, leaveTypeId, year]);
    
    // We would log the adjustment in an audit table ideally
    
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
