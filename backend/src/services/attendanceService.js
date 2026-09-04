const db = require('../config/db');

class AttendanceService {
  // --- Overview ---
  async getOverview(organizationId, date, filters = {}) {
    let empQuery = 'SELECT COUNT(id) as total FROM employees WHERE organization_id = ? AND status = "active"';
    let empParams = [organizationId];

    if (filters.department) {
      empQuery += ' AND department_id = ?';
      empParams.push(filters.department);
    }
    if (filters.search) {
      empQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR employee_code LIKE ?)';
      empParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    // Total Employees
    const [employees] = await db.execute(empQuery, empParams);

    let attQuery = `SELECT a.status, COUNT(*) as count 
       FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.organization_id = ? AND a.date = ?`;
    let attParams = [organizationId, date];

    if (filters.department) {
      attQuery += ' AND e.department_id = ?';
      attParams.push(filters.department);
    }
    if (filters.search) {
      attQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
      attParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    // Shift filter conceptually goes here if we check assignments, but keep simple for now
    attQuery += ' GROUP BY a.status';

    // Attendance stats for date
    const [attendance] = await db.execute(attQuery, attParams);

    // Missing punches (Check in exists, check out missing)
    let missingQuery = `SELECT COUNT(*) as total 
       FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.organization_id = ? AND a.date = ? AND a.check_in_time IS NOT NULL AND a.check_out_time IS NULL`;
    let missingParams = [organizationId, date];
    
    if (filters.department) {
      missingQuery += ' AND e.department_id = ?';
      missingParams.push(filters.department);
    }
    if (filters.search) {
      missingQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
      missingParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const [missingPunches] = await db.execute(missingQuery, missingParams);

    // Pending Requests
    let reqQuery = `SELECT COUNT(*) as total 
       FROM attendance_regularization r
       JOIN employees e ON r.employee_id = e.id
       WHERE r.organization_id = ? AND r.status = "pending"`;
    let reqParams = [organizationId];

    if (filters.department) {
      reqQuery += ' AND e.department_id = ?';
      reqParams.push(filters.department);
    }
    if (filters.search) {
      reqQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
      reqParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const [pendingRequests] = await db.execute(reqQuery, reqParams);

    let present = 0;
    let absent = 0;
    let late = 0;
    let onLeave = 0;

    attendance.forEach(row => {
      if (row.status === 'present') present += row.count;
      else if (row.status === 'absent') absent += row.count;
      else if (row.status === 'late') {
        present += row.count;
        late += row.count;
      }
      else if (row.status === 'leave') onLeave += row.count;
      else if (row.status === 'half_day') present += row.count;
    });

    return {
      totalEmployees: employees[0].total,
      present,
      absent,
      late,
      onLeave,
      missingPunches: missingPunches[0].total,
      pendingRequests: pendingRequests[0].total
    };
  }

  // --- Records ---
  async getRecords(organizationId, filters = {}) {
    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_code, d.name as department_name, s.name as shift_name
      FROM attendance_records a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_schedules ws ON e.id = ws.employee_id AND a.date >= ws.effective_from AND (ws.effective_to IS NULL OR a.date <= ws.effective_to)
      LEFT JOIN shifts s ON ws.shift_id = s.id
      WHERE a.organization_id = ?
    `;
    const queryParams = [organizationId];

    if (filters.date) {
      query += ` AND a.date = ?`;
      queryParams.push(filters.date);
    }
    if (filters.startDate && filters.endDate) {
      query += ` AND a.date BETWEEN ? AND ?`;
      queryParams.push(filters.startDate, filters.endDate);
    }
    if (filters.departmentId) {
      query += ` AND e.department_id = ?`;
      queryParams.push(filters.departmentId);
    }
    if (filters.status) {
      query += ` AND a.status = ?`;
      queryParams.push(filters.status);
    }
    if (filters.search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)`;
      const searchStr = `%${filters.search}%`;
      queryParams.push(searchStr, searchStr, searchStr);
    }

    query += ` ORDER BY a.date DESC, e.first_name ASC`;

    if (filters.limit && filters.offset !== undefined) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(filters.limit), parseInt(filters.offset));
    }

    const [rows] = await db.execute(query, queryParams);

    let countQuery = `
      SELECT COUNT(*) as total
      FROM attendance_records a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.organization_id = ?
    `;
    const countParams = [organizationId];

    if (filters.date) {
      countQuery += ` AND a.date = ?`;
      countParams.push(filters.date);
    }
    if (filters.startDate && filters.endDate) {
      countQuery += ` AND a.date BETWEEN ? AND ?`;
      countParams.push(filters.startDate, filters.endDate);
    }
    if (filters.departmentId) {
      countQuery += ` AND e.department_id = ?`;
      countParams.push(filters.departmentId);
    }
    if (filters.status) {
      countQuery += ` AND a.status = ?`;
      countParams.push(filters.status);
    }
    if (filters.search) {
      countQuery += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)`;
      const searchStr = `%${filters.search}%`;
      countParams.push(searchStr, searchStr, searchStr);
    }

    const [countRows] = await db.execute(countQuery, countParams);

    return {
      records: rows,
      total: countRows[0].total
    };
  }

  async addManualRecord(organizationId, data) {
    const { employeeId, date, status, checkInTime, checkOutTime, workDurationMinutes, lateMinutes, earlyLeavingMinutes, overtimeMinutes } = data;
    
    // Check if record exists
    const [existing] = await db.execute(
      'SELECT id FROM attendance_records WHERE organization_id = ? AND employee_id = ? AND date = ?',
      [organizationId, employeeId, date]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(
        `UPDATE attendance_records 
         SET status = ?, check_in_time = ?, check_out_time = ?, work_duration_minutes = ?, late_minutes = ?, early_leaving_minutes = ?, overtime_minutes = ?
         WHERE id = ?`,
        [status, checkInTime || null, checkOutTime || null, workDurationMinutes || 0, lateMinutes || 0, earlyLeavingMinutes || 0, overtimeMinutes || 0, existing[0].id]
      );
      
      await this.logAttendanceEvent(organizationId, employeeId, 'manual', 'Manual record updated');
      return { message: 'Attendance record updated successfully' };
    } else {
      // Insert
      await db.execute(
        `INSERT INTO attendance_records 
         (organization_id, employee_id, date, status, check_in_time, check_out_time, work_duration_minutes, late_minutes, early_leaving_minutes, overtime_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [organizationId, employeeId, date, status, checkInTime || null, checkOutTime || null, workDurationMinutes || 0, lateMinutes || 0, earlyLeavingMinutes || 0, overtimeMinutes || 0]
      );
      
      await this.logAttendanceEvent(organizationId, employeeId, 'manual', 'Manual record created');
      return { message: 'Attendance record created successfully' };
    }
  }

  // --- Regularization ---
  async getRegularizationRequests(organizationId, filters = {}) {
    let query = `
      SELECT r.*, e.first_name, e.last_name, e.employee_code, d.name as department_name, a.first_name as approver_first_name, a.last_name as approver_last_name
      FROM attendance_regularization r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON r.approver_id = u.id
      LEFT JOIN employees a ON u.id = a.id 
      WHERE r.organization_id = ?
    `;
    const queryParams = [organizationId];

    if (filters.status) {
      query += ` AND r.status = ?`;
      queryParams.push(filters.status);
    }
    if (filters.employeeId) {
      query += ` AND r.employee_id = ?`;
      queryParams.push(filters.employeeId);
    }
    
    query += ` ORDER BY r.created_at DESC`;

    const [rows] = await db.execute(query, queryParams);
    return rows;
  }

  async createRegularizationRequest(organizationId, data) {
    const { employeeId, attendanceDate, requestType, reason, checkInTime, checkOutTime } = data;
    
    const [existing] = await db.execute(
      'SELECT id FROM attendance_regularization WHERE employee_id = ? AND attendance_date = ? AND request_type = ? AND status = "pending"',
      [employeeId, attendanceDate, requestType]
    );

    if (existing.length > 0) {
      throw new Error('A pending regularization request already exists for this date and type');
    }

    await db.execute(
      `INSERT INTO attendance_regularization 
       (organization_id, employee_id, attendance_date, request_type, check_in_time, check_out_time, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [organizationId, employeeId, attendanceDate, requestType, checkInTime || null, checkOutTime || null, reason]
    );

    return { message: 'Regularization request submitted successfully' };
  }

  async updateRegularizationRequest(organizationId, requestId, status, approverId, rejectionReason = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [requests] = await connection.execute(
        'SELECT * FROM attendance_regularization WHERE id = ? AND organization_id = ? FOR UPDATE',
        [requestId, organizationId]
      );

      if (requests.length === 0) throw new Error('Request not found');
      
      const req = requests[0];
      if (req.status !== 'pending') throw new Error('Request is already processed');

      await connection.execute(
        'UPDATE attendance_regularization SET status = ?, approver_id = ?, rejection_reason = ? WHERE id = ?',
        [status, approverId, rejectionReason, requestId]
      );

      if (status === 'approved') {
        // Update attendance record safely
        const [existingRec] = await connection.execute(
          'SELECT id FROM attendance_records WHERE organization_id = ? AND employee_id = ? AND date = ?',
          [organizationId, req.employee_id, req.attendance_date]
        );

        if (existingRec.length > 0) {
          // Simplistic update for now, ideally recalculate hours
          await connection.execute(
            'UPDATE attendance_records SET check_in_time = COALESCE(?, check_in_time), check_out_time = COALESCE(?, check_out_time) WHERE id = ?',
            [req.check_in_time, req.check_out_time, existingRec[0].id]
          );
        } else {
          await connection.execute(
            'INSERT INTO attendance_records (organization_id, employee_id, date, status, check_in_time, check_out_time) VALUES (?, ?, ?, "present", ?, ?)',
            [organizationId, req.employee_id, req.attendance_date, req.check_in_time, req.check_out_time]
          );
        }
      }

      await connection.commit();
      return { message: `Request ${status} successfully` };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --- Shifts ---
  async getShifts(organizationId) {
    const [rows] = await db.execute(
      'SELECT * FROM shifts WHERE organization_id = ? ORDER BY name ASC',
      [organizationId]
    );
    return rows;
  }

  async createShift(organizationId, data) {
    const { name, startTime, endTime, breakDurationMinutes } = data;
    await db.execute(
      'INSERT INTO shifts (organization_id, name, start_time, end_time, break_duration_minutes) VALUES (?, ?, ?, ?, ?)',
      [organizationId, name, startTime, endTime, breakDurationMinutes || 60]
    );
    return { message: 'Shift created successfully' };
  }
  
  async logAttendanceEvent(organizationId, employeeId, source, note) {
      // Stub for audit logging if required
  }
}

module.exports = new AttendanceService();
