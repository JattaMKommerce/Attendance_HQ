const db = require('../config/db');

class AttendanceService {
  _buildEmployeeFilters(filters, alias = '') {
    let query = '';
    let params = [];
    const prefix = alias ? `${alias}.` : '';

    if (filters.department) {
      query += ` AND ${prefix}department_id = ?`;
      params.push(filters.department);
    }
    if (filters.search) {
      const searchStr = `%${filters.search}%`;
      query += ` AND (${prefix}first_name LIKE ? OR ${prefix}last_name LIKE ? OR ${prefix}employee_code LIKE ?)`;
      params.push(searchStr, searchStr, searchStr);
    }
    if (filters.shift) {
      query += ` AND ws.shift_id = ?`;
      params.push(filters.shift);
    }
    return { query, params };
  }

  // --- Overview ---
  async getOverview(organizationId, date, filters = {}) {
    const aliasFilter = this._buildEmployeeFilters(filters, 'e');

    let wsJoin = '';
    let wsParams = [];
    if (filters.shift) {
      wsJoin = ' JOIN work_schedules ws ON e.id = ws.employee_id AND ? >= ws.effective_from AND (ws.effective_to IS NULL OR ? <= ws.effective_to)';
      wsParams = [date, date];
    }

    // Total Employees
    const [employees] = await db.execute(
      `SELECT COUNT(e.id) as total FROM employees e${wsJoin} WHERE e.organization_id = ? AND e.status = "active"${aliasFilter.query}`, 
      [...wsParams, organizationId, ...aliasFilter.params]
    );
    const totalEmployees = employees[0].total;

    // Get all attendance records for the date to compute present/late
    const [attendanceRows] = await db.execute(
      `SELECT a.status, a.check_in_time, e.id as emp_id
       FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       ${wsJoin}
       WHERE a.organization_id = ? AND a.date = ?${aliasFilter.query}`,
      [...wsParams, organizationId, date, ...aliasFilter.params]
    );

    let present = 0;
    let late = 0;
    let onLeave = 0;
    let absentFromRecords = 0;

    const attendedEmpIds = new Set();

    attendanceRows.forEach(row => {
      attendedEmpIds.add(row.emp_id);
      if (row.status === 'leave') onLeave++;
      else if (row.status === 'absent') absentFromRecords++;
      else {
        present++;
        // Strict Late logic: check-in > 09:35 AM
        if (row.check_in_time) {
          const [hours, minutes] = row.check_in_time.split(':').map(Number);
          if (hours > 9 || (hours === 9 && minutes > 35)) late++;
        } else if (row.status === 'late') {
          late++;
        }
      }
    });

    const dateObj = new Date(date);
    const today = new Date();
    let calculatedAbsent = absentFromRecords;
    
    // Calculate implicit absents if past date or past cutoff (e.g. 18:00) today
    if (dateObj < new Date(today.toDateString()) || (dateObj.toDateString() === today.toDateString() && today.getHours() >= 18)) {
       calculatedAbsent += Math.max(0, totalEmployees - (present + onLeave + absentFromRecords));
    }

    // Missing punches (Check in exists, check out missing)
    const [missingPunches] = await db.execute(
      `SELECT COUNT(*) as total FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       ${wsJoin}
       WHERE a.organization_id = ? AND a.date = ? AND a.check_in_time IS NOT NULL AND a.check_out_time IS NULL${aliasFilter.query}`,
      [...wsParams, organizationId, date, ...aliasFilter.params]
    );

    // Pending Requests
    // Note: Regularization doesn't necessarily have a date, it has attendance_date. We'll join ws based on attendance_date.
    let reqWsJoin = '';
    let reqWsParams = [];
    if (filters.shift) {
      reqWsJoin = ' JOIN work_schedules ws ON e.id = ws.employee_id AND r.attendance_date >= ws.effective_from AND (ws.effective_to IS NULL OR r.attendance_date <= ws.effective_to)';
    }

    const [pendingRequests] = await db.execute(
      `SELECT COUNT(*) as total FROM attendance_regularization r
       JOIN employees e ON r.employee_id = e.id
       ${reqWsJoin}
       WHERE r.organization_id = ? AND r.status = "pending"${aliasFilter.query}`,
      [...reqWsParams, organizationId, ...aliasFilter.params]
    );

    return {
      totalEmployees,
      present,
      absent: calculatedAbsent,
      late,
      onLeave,
      missingPunches: missingPunches[0].total,
      pendingRequests: pendingRequests[0].total
    };
  }

  // --- Records ---
  async getRecords(organizationId, filters = {}) {
    const aliasFilter = this._buildEmployeeFilters(filters, 'e');
    const targetDate = filters.date || new Date().toISOString().split('T')[0];
    
    let query = `
      SELECT 
        e.id as employee_id, e.first_name, e.last_name, e.employee_code, e.status as employee_status,
        d.name as department_name, s.name as shift_name,
        a.id as record_id, a.date, a.status as record_status, a.check_in_time, a.check_out_time,
        a.work_duration_minutes, a.late_minutes, a.overtime_minutes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_schedules ws ON e.id = ws.employee_id AND ? >= ws.effective_from AND (ws.effective_to IS NULL OR ? <= ws.effective_to)
      LEFT JOIN shifts s ON ws.shift_id = s.id
      LEFT JOIN attendance_records a ON e.id = a.employee_id AND a.date = ?
      WHERE e.organization_id = ? AND e.status = 'active'${aliasFilter.query}
      ORDER BY e.first_name ASC
    `;
    const queryParams = [targetDate, targetDate, targetDate, organizationId, ...aliasFilter.params];

    const [rows] = await db.execute(query, queryParams);
    
    let finalRecords = rows.map(r => {
      let currentStatus = r.record_status || 'absent';
      
      // Strict late logic for table
      if (currentStatus === 'present' || currentStatus === 'half_day') {
        if (r.check_in_time) {
          const checkInStr = typeof r.check_in_time === 'string' 
            ? r.check_in_time 
            : (r.check_in_time instanceof Date ? r.check_in_time.toTimeString() : String(r.check_in_time));
          const timeParts = checkInStr.split(':');
          if (timeParts.length >= 2) {
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            if (hours > 9 || (hours === 9 && minutes > 35)) {
              currentStatus = 'late';
            }
          }
        }
      }
      
      // Strict absent logic: if it's today and before cutoff, they aren't "absent" yet, just "not punched in"
      const dateObj = new Date(targetDate);
      const today = new Date();
      const isPastDate = dateObj < new Date(today.toDateString());
      const isPastCutoff = today.getHours() >= 18;
      
      if (!r.record_id && currentStatus === 'absent') {
        if (!isPastDate && !(dateObj.toDateString() === today.toDateString() && isPastCutoff)) {
          currentStatus = 'not_marked'; 
        }
      }

      return {
        id: r.record_id,
        employee_id: r.employee_id,
        first_name: r.first_name,
        last_name: r.last_name,
        employee_code: r.employee_code,
        department_name: r.department_name,
        shift_name: r.shift_name || 'General (9 AM - 6 PM)',
        date: r.date || targetDate,
        status: currentStatus,
        check_in_time: r.check_in_time,
        check_out_time: r.check_out_time,
        work_duration_minutes: r.work_duration_minutes,
        late_minutes: r.late_minutes,
        overtime_minutes: r.overtime_minutes
      };
    });

    // Apply status filter post-processing since we compute strict status in JS
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'present') {
        finalRecords = finalRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'half_day');
      } else {
        finalRecords = finalRecords.filter(r => r.status === filters.status);
      }
    }

    const total = finalRecords.length;

    if (filters.limit && filters.offset !== undefined) {
      const offset = parseInt(filters.offset);
      const limit = parseInt(filters.limit);
      finalRecords = finalRecords.slice(offset, offset + limit);
    }

    return {
      records: finalRecords,
      total: total
    };
  }

  async getEmployeeAttendanceHistory(organizationId, employeeId, year, month) {
    const query = `
      SELECT 
        a.id as record_id, a.date, a.status as record_status, a.check_in_time, a.check_out_time,
        a.work_duration_minutes, a.late_minutes, a.overtime_minutes,
        s.name as shift_name
      FROM attendance_records a
      LEFT JOIN work_schedules ws ON a.employee_id = ws.employee_id AND a.date >= ws.effective_from AND (ws.effective_to IS NULL OR a.date <= ws.effective_to)
      LEFT JOIN shifts s ON ws.shift_id = s.id
      WHERE a.organization_id = ? AND a.employee_id = ? AND YEAR(a.date) = ? AND MONTH(a.date) = ?
      ORDER BY a.date ASC
    `;
    const [rows] = await db.execute(query, [organizationId, employeeId, year, month]);

    return rows.map(r => {
      let currentStatus = r.record_status || 'absent';
      
      // Strict late logic
      if (currentStatus === 'present' || currentStatus === 'half_day') {
        if (r.check_in_time) {
          let hours, minutes;
          if (r.check_in_time instanceof Date) {
            hours = r.check_in_time.getHours();
            minutes = r.check_in_time.getMinutes();
          } else if (typeof r.check_in_time === 'string') {
            if (r.check_in_time.includes('T')) {
              const d = new Date(r.check_in_time);
              hours = d.getHours();
              minutes = d.getMinutes();
            } else {
              const timeParts = r.check_in_time.split(':');
              if (timeParts.length >= 2) {
                // To handle potential "YYYY-MM-DD HH:mm:ss" vs "HH:mm:ss"
                const hourStr = timeParts[0].includes(' ') ? timeParts[0].split(' ')[1] : timeParts[0];
                hours = parseInt(hourStr, 10);
                minutes = parseInt(timeParts[1], 10);
              }
            }
          }
          if (hours !== undefined && minutes !== undefined) {
            if (hours > 9 || (hours === 9 && minutes > 35)) {
              currentStatus = 'late';
            }
          }
        }
      }

      return {
        id: r.record_id,
        date: r.date,
        status: currentStatus,
        check_in_time: r.check_in_time,
        check_out_time: r.check_out_time,
        work_duration_minutes: r.work_duration_minutes,
        late_minutes: r.late_minutes,
        overtime_minutes: r.overtime_minutes,
        shift_name: r.shift_name || 'General (9 AM - 6 PM)'
      };
    });
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
      
      // await this.logAttendanceEvent(organizationId, employeeId, 'manual', 'Manual record updated');
      return { message: 'Attendance record updated successfully' };
    } else {
      // Insert
      await db.execute(
        `INSERT INTO attendance_records 
         (organization_id, employee_id, date, status, check_in_time, check_out_time, work_duration_minutes, late_minutes, early_leaving_minutes, overtime_minutes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [organizationId, employeeId, date, status, checkInTime || null, checkOutTime || null, workDurationMinutes || 0, lateMinutes || 0, earlyLeavingMinutes || 0, overtimeMinutes || 0]
      );
      
      // await this.logAttendanceEvent(organizationId, employeeId, 'manual', 'Manual record created');
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
