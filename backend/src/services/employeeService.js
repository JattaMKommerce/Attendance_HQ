const db = require('../config/db');

class EmployeeService {
  async getEmployees(organizationId, filters = {}) {
    let query = `
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.status, e.joining_date,
             d.name as department_name, des.name as designation_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE e.organization_id = ?
    `;
    const queryParams = [organizationId];

    if (filters.search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)`;
      const searchStr = `%${filters.search}%`;
      queryParams.push(searchStr, searchStr, searchStr, searchStr);
    }

    if (filters.department_id) {
      query += ` AND e.department_id = ?`;
      queryParams.push(filters.department_id);
    }

    if (filters.status) {
      query += ` AND e.status = ?`;
      queryParams.push(filters.status);
    }

    query += ` ORDER BY e.created_at DESC`;

    // Basic pagination (if passed)
    if (filters.limit && filters.offset) {
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(parseInt(filters.limit), parseInt(filters.offset));
    }

    const [rows] = await db.execute(query, queryParams);
    
    // Get total count for pagination
    const [countRows] = await db.execute('SELECT COUNT(*) as total FROM employees WHERE organization_id = ?', [organizationId]);
    
    return {
      employees: rows,
      total: countRows[0].total
    };
  }

  async getEmployeeById(organizationId, employeeId) {
    const [rows] = await db.execute(
      `SELECT e.*, d.name as department_name, des.name as designation_name, o.name as organization_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE e.organization_id = ? AND e.id = ?`,
      [organizationId, employeeId]
    );

    if (rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = rows[0];

    // Fetch experiences
    const [experiences] = await db.execute(
      'SELECT * FROM employee_experiences WHERE organization_id = ? AND employee_id = ? ORDER BY start_date DESC',
      [organizationId, employeeId]
    );
    employee.experiences = experiences;

    // Fetch education
    const [education] = await db.execute(
      'SELECT * FROM employee_education WHERE organization_id = ? AND employee_id = ? ORDER BY passing_year DESC',
      [organizationId, employeeId]
    );
    employee.education = education;

    // Fetch documents
    const [documents] = await db.execute(
      'SELECT id, title, document_type, file_url, expiry_date, created_at FROM documents WHERE organization_id = ? AND employee_id = ? AND status = "active"',
      [organizationId, employeeId]
    );
    employee.documents = documents;

    return employee;
  }

  async createEmployee(organizationId, data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Check for duplicates
      const [existing] = await connection.execute(
        'SELECT id FROM employees WHERE organization_id = ? AND (email = ? OR employee_code = ?) FOR UPDATE',
        [organizationId, data.email.trim(), data.employee_code.trim()]
      );

      if (existing.length > 0) {
        throw new Error('An employee with this email or code already exists in your organization');
      }

      // 2. Insert employee
      const [result] = await connection.execute(
        `INSERT INTO employees (
          organization_id, employee_code, first_name, last_name, email, phone, 
          gender, date_of_birth, joining_date, employment_type, department_id, designation_id, status,
          profile_image_url, experience_type, terms_accepted, terms_accepted_at,
          current_address, permanent_address, uan_number, resume_url, gross_salary, basic_salary, hra, deductions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          organizationId,
          data.employee_code.trim(),
          data.first_name.trim(),
          data.last_name.trim(),
          data.email.trim(),
          data.phone || null,
          data.gender || null,
          data.date_of_birth || null,
          data.joining_date,
          data.employment_type || 'full_time',
          data.department_id || null,
          data.designation_id || null,
          'active',
          data.profile_image_url || null,
          data.experience_type || 'fresher',
          data.terms_accepted ? 1 : 0,
          data.terms_accepted ? new Date() : null,
          data.current_address || null,
          data.permanent_address || null,
          data.uan_number || null,
          data.resume_url || null,
          data.gross_salary || null,
          data.basic_salary || null,
          data.hra || null,
          data.deductions || null
        ]
      );

      const employeeId = result.insertId;

      // 3. Insert experiences if any
      if (data.experience_type === 'experienced' && Array.isArray(data.experiences)) {
        for (const exp of data.experiences) {
          await connection.execute(
            `INSERT INTO employee_experiences (
              organization_id, employee_id, company_name, previous_designation, start_date, end_date, salary, reason_for_leaving
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              organizationId,
              employeeId,
              exp.company_name,
              exp.previous_designation,
              exp.start_date,
              exp.end_date || null,
              exp.salary || null,
              exp.reason_for_leaving || null
            ]
          );
        }
      }

      // 4. Insert education if any
      if (Array.isArray(data.education)) {
        for (const edu of data.education) {
          await connection.execute(
            `INSERT INTO employee_education (
              organization_id, employee_id, level, degree_name, university_name, passing_year
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              organizationId,
              employeeId,
              edu.level,
              edu.degree_name || null,
              edu.university_name || null,
              edu.passing_year || null
            ]
          );
        }
      }

      // 5. Insert documents if any
      if (Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          await connection.execute(
            `INSERT INTO documents (
              organization_id, employee_id, title, document_type, file_url, status
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              organizationId,
              employeeId,
              doc.title,
              doc.document_type || 'other',
              doc.file_url,
              'active'
            ]
          );
        }
      }

      await connection.commit();
      return { id: employeeId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateEmployee(organizationId, employeeId, data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Verify existence
      const [existing] = await connection.execute('SELECT id FROM employees WHERE organization_id = ? AND id = ?', [organizationId, employeeId]);
      if (existing.length === 0) {
        throw new Error('Employee not found');
      }

      // 2. Check for duplicate email or code (excluding self)
      if (data.email || data.employee_code) {
         const [duplicate] = await connection.execute(
          'SELECT id FROM employees WHERE organization_id = ? AND id != ? AND (email = ? OR employee_code = ?)',
          [organizationId, employeeId, data.email?.trim(), data.employee_code?.trim()]
         );
         if (duplicate.length > 0) {
           throw new Error('An employee with this email or code already exists');
         }
      }

      // 3. Update employee
      await connection.execute(
        `UPDATE employees SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          gender = COALESCE(?, gender),
          date_of_birth = COALESCE(?, date_of_birth),
          joining_date = COALESCE(?, joining_date),
          employment_type = COALESCE(?, employment_type),
          department_id = COALESCE(?, department_id),
          designation_id = COALESCE(?, designation_id),
          current_address = COALESCE(?, current_address),
          permanent_address = COALESCE(?, permanent_address),
          emergency_contact_name = COALESCE(?, emergency_contact_name),
          emergency_contact_phone = COALESCE(?, emergency_contact_phone),
          uan_number = COALESCE(?, uan_number),
          gross_salary = COALESCE(?, gross_salary),
          basic_salary = COALESCE(?, basic_salary),
          hra = COALESCE(?, hra),
          deductions = COALESCE(?, deductions),
          bank_name = COALESCE(?, bank_name),
          account_number = COALESCE(?, account_number),
          ifsc_code = COALESCE(?, ifsc_code),
          esi_percentage = COALESCE(?, esi_percentage),
          pf_percentage = COALESCE(?, pf_percentage),
          monthly_paid_leaves = COALESCE(?, monthly_paid_leaves),
          special_allowance = COALESCE(?, special_allowance),
          other_allowance = COALESCE(?, other_allowance),
          professional_tax = COALESCE(?, professional_tax),
          advances = COALESCE(?, advances),
          incentives = COALESCE(?, incentives)
        WHERE id = ? AND organization_id = ?`,
        [
          data.first_name?.trim() || null,
          data.last_name?.trim() || null,
          data.email?.trim() || null,
          data.phone || null,
          data.gender || null,
          data.date_of_birth || null,
          data.joining_date || null,
          data.employment_type || null,
          data.department_id || null,
          data.designation_id || null,
          data.current_address || null,
          data.permanent_address || null,
          data.emergency_contact_name || null,
          data.emergency_contact_phone || null,
          data.uan_number || null,
          data.gross_salary || null,
          data.basic_salary || null,
          data.hra || null,
          data.deductions || null,
          data.bank_name || null,
          data.account_number || null,
          data.ifsc_code || null,
          data.esi_percentage || null,
          data.pf_percentage || null,
          data.monthly_paid_leaves || null,
          data.special_allowance || null,
          data.other_allowance || null,
          data.professional_tax || null,
          data.advances || null,
          data.incentives || null,
          employeeId,
          organizationId
        ]
      );

      // 4. Update Education if provided
      if (Array.isArray(data.education)) {
        await connection.execute('DELETE FROM employee_education WHERE organization_id = ? AND employee_id = ?', [organizationId, employeeId]);
        
        for (const edu of data.education) {
          await connection.execute(
            `INSERT INTO employee_education (
              organization_id, employee_id, level, degree_name, university_name, passing_year
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              organizationId,
              employeeId,
              edu.level,
              edu.degree_name || null,
              edu.university_name || null,
              edu.passing_year || null
            ]
          );
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateEmployeeStatus(organizationId, employeeId, newStatus, changedBy) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.execute('SELECT status FROM employees WHERE organization_id = ? AND id = ? FOR UPDATE', [organizationId, employeeId]);
      
      if (existing.length === 0) {
        throw new Error('Employee not found');
      }

      const oldStatus = existing[0].status;

      // Update status
      await connection.execute('UPDATE employees SET status = ? WHERE id = ?', [newStatus, employeeId]);

      // Record history
      await connection.execute(
        'INSERT INTO employee_status_history (organization_id, employee_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?, ?)',
        [organizationId, employeeId, oldStatus, newStatus, changedBy]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getLookups(organizationId) {
    const [departments] = await db.execute('SELECT id, name FROM departments WHERE organization_id = ?', [organizationId]);
    const [designations] = await db.execute('SELECT id, name FROM designations WHERE organization_id = ?', [organizationId]);
    
    return { departments, designations };
  }
}

module.exports = new EmployeeService();
