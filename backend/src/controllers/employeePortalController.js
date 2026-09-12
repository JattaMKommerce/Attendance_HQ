const db = require('../config/db');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

class EmployeePortalController {
  // ─── DASHBOARD AGGREGATION ────────────────────────────────────────────────
  async getDashboard(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const empId = req.user.employee_id;
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();

      // 1. Today's attendance
      const [attendance] = await db.query(
        `SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?`,
        [empId, today]
      );

      // 2. Leave balances
      const [balances] = await db.query(
        `SELECT lb.id, lb.allocated, lb.used, lb.carried_forward,
                (lb.allocated - lb.used + lb.carried_forward) as remaining,
                lt.name, lt.color_code
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.employee_id = ? AND lb.year = ?`,
        [empId, year]
      );

      // 3. Shift
      const [shiftRows] = await db.query(
        `SELECT s.id, s.name, s.start_time, s.end_time, s.break_duration_minutes
         FROM work_schedules ws
         JOIN shifts s ON ws.shift_id = s.id
         WHERE ws.employee_id = ? AND ws.organization_id = ?
         LIMIT 1`,
        [empId, organizationId]
      );

      // 4. Next holiday
      const [holidays] = await db.query(
        `SELECT id, name, holiday_date, description
         FROM holidays
         WHERE organization_id = ? AND holiday_date >= ?
         ORDER BY holiday_date ASC
         LIMIT 1`,
        [organizationId, today]
      );

      // 5. Recent announcements
      const [announcements] = await db.query(
        `SELECT a.id, a.title, a.content, a.created_at,
                u.first_name as author_first_name, u.last_name as author_last_name
         FROM announcements a
         LEFT JOIN users u ON a.created_by = u.id
         WHERE a.organization_id = ? AND a.status = 'published'
         ORDER BY a.created_at DESC
         LIMIT 3`,
        [organizationId]
      );

      // 6. Latest payslip
      const [payslips] = await db.query(
        `SELECT p.id, p.net_pay, p.gross_pay, p.payable_days, r.run_month, r.run_year, p.status
         FROM payslips p
         JOIN payroll_runs r ON p.payroll_run_id = r.id
         WHERE p.user_id = ? AND p.organization_id = ?
         ORDER BY r.run_year DESC, r.run_month DESC
         LIMIT 1`,
        [userId, organizationId]
      );

      // 7. Pending leave requests count
      const [pendingLeaves] = await db.query(
        `SELECT COUNT(*) as count FROM leave_requests WHERE employee_id = ? AND status = 'pending'`,
        [empId]
      );

      res.json({
        success: true,
        data: {
          todayAttendance: attendance.length > 0 ? attendance[0] : null,
          leaveBalances: balances,
          shift: shiftRows.length > 0 ? shiftRows[0] : null,
          nextHoliday: holidays.length > 0 ? holidays[0] : null,
          announcements,
          latestPayslip: payslips.length > 0 ? payslips[0] : null,
          pendingLeavesCount: pendingLeaves[0].count
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── ATTENDANCE ───────────────────────────────────────────────────────────
  async getTodayAttendance(req, res, next) {
    try {
      const empId = req.user.employee_id;
      if (!empId) {
        return res.status(400).json({ success: false, message: 'Employee profile not linked to this user' });
      }
      const today = new Date().toISOString().split('T')[0];

      const [records] = await db.query(
        `SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?`,
        [empId, today]
      );

      res.json({ success: true, data: records.length > 0 ? records[0] : null });
    } catch (error) {
      next(error);
    }
  }

  async checkIn(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const empId = req.user.employee_id;
      if (!empId) {
        return res.status(400).json({ success: false, message: 'Employee profile not linked' });
      }
      const { timestamp, location_lat, location_lng, source = 'mobile' } = req.body;
      const logSource = ['web', 'mobile', 'biometric', 'manual'].includes(source) ? source : 'mobile';
      const checkInTime = timestamp ? new Date(timestamp) : new Date();
      const date = checkInTime.toISOString().split('T')[0];

      // Check if already checked in today
      const [existing] = await db.query(
        `SELECT id, check_in_time FROM attendance_records WHERE employee_id = ? AND date = ?`,
        [empId, date]
      );

      if (existing.length > 0 && existing[0].check_in_time) {
        return res.status(400).json({ success: false, message: 'Already checked in today' });
      }

      // Log
      await db.query(
        `INSERT INTO attendance_logs (organization_id, employee_id, log_time, log_type, source, location_lat, location_lng)
         VALUES (?, ?, ?, 'check_in', ?, ?, ?)`,
        [organizationId, empId, checkInTime, logSource, location_lat || null, location_lng || null]
      );

      if (existing.length > 0) {
        await db.query(
          `UPDATE attendance_records SET check_in_time = ?, status = 'present' WHERE id = ?`,
          [checkInTime, existing[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO attendance_records (organization_id, employee_id, date, status, check_in_time)
           VALUES (?, ?, ?, 'present', ?)`,
          [organizationId, empId, date, checkInTime]
        );
      }

      const [updated] = await db.query(`SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?`, [empId, date]);
      res.json({ success: true, message: 'Checked in successfully', data: updated[0] });
    } catch (error) {
      next(error);
    }
  }

  async checkOut(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const empId = req.user.employee_id;
      if (!empId) {
        return res.status(400).json({ success: false, message: 'Employee profile not linked' });
      }
      const { timestamp, location_lat, location_lng, source = 'mobile' } = req.body;
      const logSource = ['web', 'mobile', 'biometric', 'manual'].includes(source) ? source : 'mobile';
      const checkOutTime = timestamp ? new Date(timestamp) : new Date();
      const date = checkOutTime.toISOString().split('T')[0];

      const [existing] = await db.query(
        `SELECT id, check_in_time, check_out_time FROM attendance_records WHERE employee_id = ? AND date = ?`,
        [empId, date]
      );

      if (existing.length === 0 || !existing[0].check_in_time) {
        return res.status(400).json({ success: false, message: 'You have not checked in today yet' });
      }

      if (existing[0].check_out_time) {
        return res.status(400).json({ success: false, message: 'Already checked out today' });
      }

      const checkInTime = new Date(existing[0].check_in_time);
      const diffMs = Math.max(0, checkOutTime.getTime() - checkInTime.getTime());
      const workDurationMinutes = Math.floor(diffMs / 60000);

      // Log
      await db.query(
        `INSERT INTO attendance_logs (organization_id, employee_id, log_time, log_type, source, location_lat, location_lng)
         VALUES (?, ?, ?, 'check_out', ?, ?, ?)`,
        [organizationId, empId, checkOutTime, logSource, location_lat || null, location_lng || null]
      );

      // Update record
      await db.query(
        `UPDATE attendance_records
         SET check_out_time = ?, work_duration_minutes = ?
         WHERE id = ?`,
        [checkOutTime, workDurationMinutes, existing[0].id]
      );

      const [updated] = await db.query(`SELECT * FROM attendance_records WHERE id = ?`, [existing[0].id]);
      res.json({ success: true, message: 'Checked out successfully', data: updated[0] });
    } catch (error) {
      next(error);
    }
  }

  async getMyAttendanceHistory(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const { month, year } = req.query;
      const curYear = parseInt(year) || new Date().getFullYear();
      const curMonth = parseInt(month) || (new Date().getMonth() + 1);

      const startDate = `${curYear}-${String(curMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      const endDate = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [records] = await db.query(
        `SELECT * FROM attendance_records 
         WHERE employee_id = ? AND date BETWEEN ? AND ?
         ORDER BY date DESC`,
        [empId, startDate, endDate]
      );

      // Calculate summary metrics from real records
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
      const daysWorked = presentCount + (halfDayCount * 0.5);
      const avgHours = daysWorked > 0 ? (totalMinutes / daysWorked / 60).toFixed(1) : '0.0';

      const summary = {
        totalDays: lastDay,
        present: presentCount,
        absent: absentCount,
        halfDay: halfDayCount,
        late: lateCount,
        workingHours: parseFloat(totalHours),
        averageHours: parseFloat(avgHours)
      };

      res.json({ success: true, data: { records, summary } });
    } catch (error) {
      next(error);
    }
  }

  // ─── LEAVE MANAGEMENT ─────────────────────────────────────────────────────
  async getLeaveTypes(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const [types] = await db.query(
        `SELECT lt.*, lp.yearly_allowance, lp.max_carry_forward
         FROM leave_types lt
         LEFT JOIN leave_policies lp ON lt.id = lp.leave_type_id
         WHERE lt.organization_id = ?`,
        [organizationId]
      );
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  }

  async getMyLeaveBalance(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const year = new Date().getFullYear();

      const [balances] = await db.query(
        `SELECT lb.id, lb.allocated, lb.used, lb.carried_forward,
                (lb.allocated - lb.used + lb.carried_forward) as remaining,
                (lb.allocated - lb.used + lb.carried_forward) as available_days,
                lb.allocated as total_days,
                lb.used as used_days,
                lt.id as leave_type_id, lt.name,
                CASE 
                  WHEN lt.name LIKE '%Casual%' THEN 'CL'
                  WHEN lt.name LIKE '%Sick%' THEN 'SL'
                  WHEN lt.name LIKE '%Earned%' THEN 'EL'
                  ELSE 'LV'
                END as code,
                lt.description, lt.color_code, lt.requires_attachment
         FROM leave_balances lb
         JOIN leave_types lt ON lb.leave_type_id = lt.id
         WHERE lb.employee_id = ? AND lb.year = ?`,
        [empId, year]
      );

      res.json({ success: true, data: balances });
    } catch (error) {
      next(error);
    }
  }

  async getMyLeaves(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const { status, year } = req.query;

      let query = `
        SELECT lr.*, lt.name as leave_type_name, lt.color_code,
               lah.action as review_action, lah.comments as review_comments, lah.action_at as review_date,
               u.first_name as reviewer_first_name, u.last_name as reviewer_last_name
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN leave_approval_history lah ON lr.id = lah.leave_request_id
        LEFT JOIN users u ON lah.action_by = u.id
        WHERE lr.employee_id = ?
      `;
      const params = [empId];

      if (status && status !== 'all') {
        query += ` AND lr.status = ?`;
        params.push(status);
      }

      if (year) {
        query += ` AND YEAR(lr.start_date) = ?`;
        params.push(year);
      }

      query += ` ORDER BY lr.created_at DESC`;

      const [requests] = await db.query(query, params);
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }

  async applyLeave(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const empId = req.user.employee_id;
      if (!empId) {
        return res.status(400).json({ success: false, message: 'Employee profile not linked' });
      }

      const { leaveTypeId, startDate, endDate, duration, durationType, reason } = req.body;
      let attachmentUrl = null;
      if (req.file) {
        attachmentUrl = `/uploads/documents/${req.file.filename}`;
      }

      if (!leaveTypeId || !startDate || !endDate || !reason) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date' });
      }

      // Check overlap with pending or approved leaves
      const [overlaps] = await db.query(
        `SELECT id FROM leave_requests 
         WHERE employee_id = ? AND status IN ('pending', 'approved')
         AND (start_date <= ? AND end_date >= ?)`,
        [empId, endDate, startDate]
      );

      if (overlaps.length > 0) {
        return res.status(400).json({ success: false, message: 'You already have a pending or approved leave request for these dates' });
      }

      // Calculate days
      let totalDays = parseFloat(duration);
      if (!totalDays || isNaN(totalDays)) {
        let count = 0;
        let cur = new Date(start);
        while (cur <= end) {
          const d = cur.getDay();
          if (d !== 0 && d !== 6) count++;
          cur.setDate(cur.getDate() + 1);
        }
        totalDays = (durationType && durationType !== 'full_day') ? 0.5 : (count || 1);
      }

      // Insert leave request
      const [result] = await db.query(
        `INSERT INTO leave_requests (organization_id, employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [organizationId, empId, leaveTypeId, startDate, endDate, totalDays, reason, attachmentUrl]
      );

      // Create in-app notification for Org Admins/HR
      try {
        const [admins] = await db.query(
          `SELECT u.id FROM users u 
           JOIN user_roles ur ON u.id = ur.user_id 
           JOIN roles r ON ur.role_id = r.id 
           WHERE u.organization_id = ? AND r.name IN ('ORG_ADMIN', 'HR_ADMIN')`,
          [organizationId]
        );
        for (let admin of admins) {
          await db.query(
            `INSERT INTO notifications (organization_id, user_id, title, message, type, action_url)
             VALUES (?, ?, 'New Leave Request', 'An employee has submitted a new leave request.', 'leave_request', '/app/leave')`,
            [organizationId, admin.id]
          );
        }
      } catch (notifErr) {
        console.warn('Failed to send admin notification:', notifErr);
      }

      res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully and is pending approval',
        data: { id: result.insertId }
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelLeave(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const { id } = req.params;

      const [requests] = await db.query(
        `SELECT * FROM leave_requests WHERE id = ? AND employee_id = ?`,
        [id, empId]
      );

      if (requests.length === 0) {
        return res.status(404).json({ success: false, message: 'Leave request not found' });
      }

      if (requests[0].status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Only pending leave requests can be cancelled' });
      }

      await db.query(`UPDATE leave_requests SET status = 'cancelled' WHERE id = ?`, [id]);

      res.json({ success: true, message: 'Leave request cancelled successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ─── PAYSLIPS ─────────────────────────────────────────────────────────────
  async getMyPayslips(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      const { year } = req.query;

      let query = `
        SELECT p.*, r.run_month, r.run_year, r.status as run_status
        FROM payslips p
        JOIN payroll_runs r ON p.payroll_run_id = r.id
        WHERE p.user_id = ? AND p.organization_id = ?
      `;
      const params = [userId, organizationId];

      if (year) {
        query += ` AND r.run_year = ?`;
        params.push(year);
      }

      query += ` ORDER BY r.run_year DESC, r.run_month DESC`;

      const [payslips] = await db.query(query, params);

      // Parse JSON breakdown safely
      const parsed = payslips.map(ps => {
        let breakdown = {};
        try {
          breakdown = typeof ps.breakdown === 'string' ? JSON.parse(ps.breakdown) : (ps.breakdown || {});
        } catch (_) {}
        return {
          ...ps,
          breakdown,
          monthName: new Date(2000, ps.run_month - 1).toLocaleString('en-US', { month: 'long' })
        };
      });

      res.json({ success: true, data: parsed });
    } catch (error) {
      next(error);
    }
  }

  async downloadPayslip(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const [payslips] = await db.query(
        `SELECT p.*, r.run_month, r.run_year,
                u.first_name, u.last_name, u.email,
                e.employee_code, d.name as department_name, deg.name as designation_name,
                o.name as organization_name
         FROM payslips p
         JOIN payroll_runs r ON p.payroll_run_id = r.id
         JOIN users u ON p.user_id = u.id
         LEFT JOIN employees e ON u.id = e.user_id
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations deg ON e.designation_id = deg.id
         LEFT JOIN organizations o ON p.organization_id = o.id
         WHERE p.id = ? AND p.user_id = ? AND p.organization_id = ?`,
        [id, userId, organizationId]
      );

      if (payslips.length === 0) {
        return res.status(404).json({ success: false, message: 'Payslip not found or unauthorized' });
      }

      const p = payslips[0];
      let breakdown = {};
      try {
        breakdown = typeof p.breakdown === 'string' ? JSON.parse(p.breakdown) : (p.breakdown || {});
      } catch (_) {}

      const monthName = new Date(2000, p.run_month - 1).toLocaleString('en-US', { month: 'long' });

      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Payslip_${monthName}_${p.run_year}.pdf"`);

      doc.pipe(res);

      // Header
      doc.fontSize(20).text(p.organization_name || 'Jatta M Kommerce', { align: 'center' });
      doc.fontSize(14).text(`Payslip for ${monthName} ${p.run_year}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(10).text(`Employee Code: ${p.employee_code || 'N/A'}`, 50, 130);
      doc.text(`Employee Name: ${p.first_name} ${p.last_name}`, 50, 145);
      doc.text(`Department: ${p.department_name || 'N/A'}`, 50, 160);
      doc.text(`Designation: ${p.designation_name || 'N/A'}`, 50, 175);

      doc.text(`Payable Days: ${p.payable_days}`, 350, 130);
      doc.text(`Payment Status: ${p.status}`, 350, 145);
      doc.moveDown(3);

      doc.fontSize(12).text('Earnings & Deductions Summary', 50, 210, { underline: true });
      doc.moveDown();

      let y = 235;
      doc.fontSize(10);
      doc.text('Gross Pay:', 50, y);
      doc.text(`INR ${parseFloat(p.gross_pay || 0).toLocaleString()}`, 200, y);

      y += 20;
      doc.text('Total Deductions:', 50, y);
      doc.text(`INR ${parseFloat(p.deductions || 0).toLocaleString()}`, 200, y);

      y += 25;
      doc.fontSize(12).text('Net Pay:', 50, y);
      doc.fontSize(12).text(`INR ${parseFloat(p.net_pay || 0).toLocaleString()}`, 200, y);

      doc.moveDown(4);
      doc.fontSize(9).text('This is a system-generated document and does not require a physical signature.', 50, y + 60, { align: 'center', color: '#666' });

      doc.end();
    } catch (error) {
      next(error);
    }
  }

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  async getMyDocuments(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;

      const [docs] = await db.query(
        `SELECT id, organization_id, employee_id, title, document_type, file_url, status, created_at
         FROM documents
         WHERE (employee_id = ? OR employee_id IS NULL) AND organization_id = ?
         ORDER BY created_at DESC`,
        [empId, organizationId]
      );

      res.json({ success: true, data: docs });
    } catch (error) {
      next(error);
    }
  }

  async uploadMyDocument(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;
      const { title, documentType } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please select a document file to upload' });
      }

      const fileUrl = `/uploads/documents/${req.file.filename}`;
      const docTitle = title || req.file.originalname;
      const type = documentType || 'other';

      const [result] = await db.query(
        `INSERT INTO documents (organization_id, employee_id, title, document_type, file_url, status)
         VALUES (?, ?, ?, ?, ?, 'active')`,
        [organizationId, empId, docTitle, type, fileUrl]
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: result.insertId,
          title: docTitle,
          document_type: type,
          file_url: fileUrl,
          status: 'active'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async downloadMyDocument(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;
      const { id } = req.params;

      const [docs] = await db.query(
        `SELECT * FROM documents 
         WHERE id = ? AND organization_id = ? AND (employee_id = ? OR employee_id IS NULL)`,
        [id, organizationId, empId]
      );

      if (docs.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found or access denied' });
      }

      const doc = docs[0];
      const filePath = path.join(__dirname, '../..', doc.file_url);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found on server' });
      }

      res.download(filePath, doc.title + path.extname(doc.file_url));
    } catch (error) {
      next(error);
    }
  }

  // ─── PROFILE ──────────────────────────────────────────────────────────────
  async getMyProfile(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;

      if (!empId) {
        return res.status(404).json({ success: false, message: 'Employee profile not found' });
      }

      const [employees] = await db.query(
        `SELECT e.*,
                d.name as department_name,
                deg.name as designation_name,
                CONCAT(m.first_name, ' ', m.last_name) as manager_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations deg ON e.designation_id = deg.id
         LEFT JOIN employee_managers em ON e.id = em.employee_id AND em.is_primary = TRUE
         LEFT JOIN employees m ON em.manager_id = m.id
         WHERE e.id = ? AND e.organization_id = ?`,
        [empId, organizationId]
      );

      if (employees.length === 0) {
        return res.status(404).json({ success: false, message: 'Employee profile not found' });
      }

      const emp = employees[0];
      res.json({ success: true, data: emp });
    } catch (error) {
      next(error);
    }
  }

  async updateMyProfile(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;

      // Only allow employee-editable fields
      const {
        phone,
        current_address,
        permanent_address,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        blood_group
      } = req.body;

      await db.query(
        `UPDATE employees SET
           phone = COALESCE(?, phone),
           current_address = COALESCE(?, current_address),
           permanent_address = COALESCE(?, permanent_address),
           emergency_contact_name = COALESCE(?, emergency_contact_name),
           emergency_contact_phone = COALESCE(?, emergency_contact_phone),
           blood_group = COALESCE(?, blood_group)
         WHERE id = ? AND organization_id = ?`,
        [
          phone,
          current_address,
          permanent_address,
          emergency_contact_name,
          emergency_contact_phone,
          blood_group,
          empId,
          organizationId
        ]
      );

      const [updated] = await db.query(
        `SELECT e.*, d.name as department_name, deg.name as designation_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations deg ON e.designation_id = deg.id
         WHERE e.id = ?`,
        [empId]
      );

      res.json({ success: true, message: 'Profile updated successfully', data: updated[0] });
    } catch (error) {
      next(error);
    }
  }

  async uploadMyPhoto(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No photo provided' });
      }

      const photoUrl = `/uploads/photos/${req.file.filename}`;
      await db.query(
        `UPDATE employees SET profile_image_url = ? WHERE id = ? AND organization_id = ?`,
        [photoUrl, empId, organizationId]
      );

      res.json({ success: true, message: 'Photo uploaded successfully', data: { url: photoUrl } });
    } catch (error) {
      next(error);
    }
  }

  // ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────
  async getAnnouncements(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const [announcements] = await db.query(
        `SELECT a.*, u.first_name as author_first_name, u.last_name as author_last_name
         FROM announcements a
         LEFT JOIN users u ON a.created_by = u.id
         WHERE a.organization_id = ? AND a.status = 'published'
         ORDER BY a.created_at DESC`,
        [organizationId]
      );
      res.json({ success: true, data: announcements });
    } catch (error) {
      next(error);
    }
  }

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  async getMyNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const organizationId = req.user.organization_id;

      const [notifications] = await db.query(
        `SELECT * FROM notifications
         WHERE user_id = ? AND organization_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [userId, organizationId]
      );

      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async markNotificationRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await db.query(
        `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async markAllNotificationsRead(req, res, next) {
    try {
      const userId = req.user.id;
      await db.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [userId]);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // ─── DIRECTORY ────────────────────────────────────────────────────────────
  async getDirectory(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const { search, department } = req.query;

      let query = `
        SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
               e.profile_image_url, e.office_city as location,
               d.name as department_name, deg.name as designation_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations deg ON e.designation_id = deg.id
        WHERE e.organization_id = ? AND e.status = 'active'
      `;
      const params = [organizationId];

      if (department && department !== 'all') {
        query += ` AND d.name = ?`;
        params.push(department);
      }

      if (search) {
        query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR deg.name LIKE ? OR d.name LIKE ?)`;
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
      }

      query += ` ORDER BY e.first_name ASC`;

      const [employees] = await db.query(query, params);
      res.json({ success: true, data: employees });
    } catch (error) {
      next(error);
    }
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
      }

      const [users] = await db.query(`SELECT password_hash FROM users WHERE id = ?`, [userId]);
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]);

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  // ─── SHIFTS & HOLIDAYS ────────────────────────────────────────────────────
  async getMyShift(req, res, next) {
    try {
      const empId = req.user.employee_id;
      const organizationId = req.user.organization_id;

      const [shifts] = await db.query(
        `SELECT s.* 
         FROM work_schedules ws
         JOIN shifts s ON ws.shift_id = s.id
         WHERE ws.employee_id = ? AND ws.organization_id = ?
         LIMIT 1`,
        [empId, organizationId]
      );

      res.json({ success: true, data: shifts.length > 0 ? shifts[0] : null });
    } catch (error) {
      next(error);
    }
  }

  async getHolidays(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const today = new Date().toISOString().split('T')[0];

      const [holidays] = await db.query(
        `SELECT * FROM holidays
         WHERE organization_id = ? AND holiday_date >= ?
         ORDER BY holiday_date ASC`,
        [organizationId, today]
      );

      res.json({ success: true, data: holidays });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmployeePortalController();
