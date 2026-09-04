const db = require('../config/db');

class RosterService {
  async getRoster(organizationId, startDate, endDate, filters = {}) {
    let empQuery = `
      SELECT e.id, e.first_name, e.last_name, e.employee_code, d.name as department_name, e.department_id
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.organization_id = ? AND e.status = "active"
    `;
    const empParams = [organizationId];

    if (filters.departmentId) {
      empQuery += ' AND e.department_id = ?';
      empParams.push(filters.departmentId);
    }
    if (filters.search) {
      empQuery += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)';
      empParams.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    empQuery += ' ORDER BY d.name, e.first_name';

    // Pagination for employees (roster could be large)
    const limit = parseInt(filters.limit) || 50;
    const offset = parseInt(filters.offset) || 0;
    
    // Get total count
    const [countRows] = await db.execute(`SELECT COUNT(*) as total FROM (${empQuery}) as t`, empParams);
    const totalEmployees = countRows[0].total;

    empQuery += ' LIMIT ? OFFSET ?';
    empParams.push(limit, offset);

    const [employees] = await db.execute(empQuery, empParams);

    if (employees.length === 0) {
      return { employees: [], total: totalEmployees };
    }

    const empIds = employees.map(e => e.id);
    
    // Fetch roster records for these employees in the date range
    const placeholders = empIds.map(() => '?').join(',');
    const rosterQuery = `
      SELECT r.*, s.name as shift_name, s.start_time, s.end_time 
      FROM rosters r
      LEFT JOIN shifts s ON r.shift_id = s.id
      WHERE r.organization_id = ? 
      AND r.employee_id IN (${placeholders})
      AND r.roster_date BETWEEN ? AND ?
    `;
    const rosterParams = [organizationId, ...empIds, startDate, endDate];
    const [rosters] = await db.execute(rosterQuery, rosterParams);

    // Attach roster to employees
    employees.forEach(emp => {
      emp.roster = rosters.filter(r => r.employee_id === emp.id);
    });

    return { employees, total: totalEmployees };
  }

  async bulkAssign(organizationId, data, userId) {
    const { employeeIds, startDate, endDate, shiftId, isWeekOff } = data;
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get all dates between start and end
      const dates = [];
      let currentDate = new Date(startDate);
      const end = new Date(endDate);
      while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const empId of employeeIds) {
        for (const date of dates) {
          // UPSERT roster
          await connection.execute(`
            INSERT INTO rosters (organization_id, employee_id, roster_date, shift_id, is_week_off, status, created_by)
            VALUES (?, ?, ?, ?, ?, 'draft', ?)
            ON DUPLICATE KEY UPDATE 
              shift_id = VALUES(shift_id), 
              is_week_off = VALUES(is_week_off),
              status = IF(status = 'published', 'draft', status), -- reverts to draft if edited
              updated_at = CURRENT_TIMESTAMP
          `, [organizationId, empId, date, shiftId || null, isWeekOff || false, userId]);
        }
      }

      await connection.commit();
      return { message: 'Roster updated successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateIndividual(organizationId, rosterId, data, userId) {
    const { shiftId, isWeekOff, status, auditReason } = data;
    
    const [existing] = await db.execute('SELECT * FROM rosters WHERE id = ? AND organization_id = ?', [rosterId, organizationId]);
    if (existing.length === 0) throw new Error('Roster not found');

    const roster = existing[0];
    if (roster.status === 'published' && !auditReason && (roster.shift_id !== shiftId || roster.is_week_off !== isWeekOff)) {
      throw new Error('Audit reason is required when modifying a published roster');
    }

    await db.execute(`
      UPDATE rosters 
      SET shift_id = ?, is_week_off = ?, status = ?, audit_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [shiftId || null, isWeekOff || false, status || roster.status, auditReason || roster.audit_reason, rosterId]);

    return { message: 'Roster updated successfully' };
  }

  async publishRoster(organizationId, data, userId) {
    const { employeeIds, startDate, endDate } = data;
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      const placeholders = employeeIds.map(() => '?').join(',');
      
      await connection.execute(`
        UPDATE rosters 
        SET status = 'published', published_at = CURRENT_TIMESTAMP 
        WHERE organization_id = ? 
        AND status = 'draft'
        AND employee_id IN (${placeholders})
        AND roster_date BETWEEN ? AND ?
      `, [organizationId, ...employeeIds, startDate, endDate]);

      await connection.commit();
      return { message: 'Rosters published successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async copyRoster(organizationId, data, userId) {
    const { sourceStartDate, sourceEndDate, targetStartDate, employeeIds } = data;
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const start = new Date(sourceStartDate);
      const end = new Date(sourceEndDate);
      const targetStart = new Date(targetStartDate);
      const daysDiff = Math.round((targetStart - start) / (1000 * 60 * 60 * 24));

      const placeholders = employeeIds.map(() => '?').join(',');
      const [sourceRosters] = await connection.execute(`
        SELECT * FROM rosters 
        WHERE organization_id = ? 
        AND employee_id IN (${placeholders})
        AND roster_date BETWEEN ? AND ?
      `, [organizationId, ...employeeIds, sourceStartDate, sourceEndDate]);

      for (const row of sourceRosters) {
        const targetDate = new Date(row.roster_date);
        targetDate.setDate(targetDate.getDate() + daysDiff);
        const targetDateStr = targetDate.toISOString().split('T')[0];

        await connection.execute(`
          INSERT INTO rosters (organization_id, employee_id, roster_date, shift_id, is_week_off, status, created_by)
          VALUES (?, ?, ?, ?, ?, 'draft', ?)
          ON DUPLICATE KEY UPDATE 
            shift_id = VALUES(shift_id), 
            is_week_off = VALUES(is_week_off),
            status = 'draft'
        `, [organizationId, row.employee_id, targetDateStr, row.shift_id, row.is_week_off, userId]);
      }

      await connection.commit();
      return { message: 'Roster copied successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --- Templates ---
  async getTemplates(organizationId) {
    const [rows] = await db.execute('SELECT * FROM roster_templates WHERE organization_id = ?', [organizationId]);
    return rows;
  }

  async applyTemplate(organizationId, data, userId) {
    const { templateId, employeeIds, startDate } = data;
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const [templates] = await connection.execute('SELECT * FROM roster_templates WHERE id = ? AND organization_id = ?', [templateId, organizationId]);
      if (templates.length === 0) throw new Error('Template not found');
      
      const pattern = templates[0].pattern; // JSON array of shiftIds / "WO"

      for (const empId of employeeIds) {
        let currentDate = new Date(startDate);
        for (const item of pattern) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const isWO = item === 'WO';
          const shiftId = isWO ? null : item;

          await connection.execute(`
            INSERT INTO rosters (organization_id, employee_id, roster_date, shift_id, is_week_off, status, created_by)
            VALUES (?, ?, ?, ?, ?, 'draft', ?)
            ON DUPLICATE KEY UPDATE 
              shift_id = VALUES(shift_id), 
              is_week_off = VALUES(is_week_off),
              status = 'draft'
          `, [organizationId, empId, dateStr, shiftId, isWO, userId]);

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      await connection.commit();
      return { message: 'Template applied successfully' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new RosterService();
