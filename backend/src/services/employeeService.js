const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const emailService = require('./emailService');

class EmployeeService {
  async getEmployees(organizationId, filters = {}) {
    let query = `
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.status, e.joining_date,
             e.gross_salary, e.basic_salary, e.incentives, e.employment_type,
             d.name as department_name, des.name as designation_name,
             u.id as user_id, u.status as user_status,
             (SELECT aa.used_at FROM account_activations aa WHERE aa.user_id = e.user_id ORDER BY aa.id DESC LIMIT 1) as activation_used_at,
             (SELECT aa.expires_at FROM account_activations aa WHERE aa.user_id = e.user_id ORDER BY aa.id DESC LIMIT 1) as activation_expires_at
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON e.user_id = u.id
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
      `SELECT e.*, d.name as department_name, des.name as designation_name, o.name as organization_name,
              u.status as user_status,
              (SELECT aa.used_at FROM account_activations aa WHERE aa.user_id = e.user_id ORDER BY aa.id DESC LIMIT 1) as activation_used_at,
              (SELECT aa.expires_at FROM account_activations aa WHERE aa.user_id = e.user_id ORDER BY aa.id DESC LIMIT 1) as activation_expires_at
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       LEFT JOIN users u ON e.user_id = u.id
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
    let rawToken = null;
    let employeeCode = data.employee_code ? data.employee_code.trim().toUpperCase() : null;
    let employeeId = null;
    let userId = null;

    try {
      await connection.beginTransaction();

      // 1. Auto-generate employee code if missing
      if (!employeeCode) {
        const [latest] = await connection.execute(
          'SELECT employee_code FROM employees WHERE organization_id = ? ORDER BY id DESC LIMIT 50',
          [organizationId]
        );
        let maxNum = 0;
        for (const r of latest) {
          const m = r.employee_code && r.employee_code.match(/^EMP-(\d+)$/i);
          if (m) {
            const val = parseInt(m[1], 10);
            if (val > maxNum) maxNum = val;
          }
        }
        if (maxNum === 0) {
          const [cnt] = await connection.execute('SELECT COUNT(*) as total FROM employees WHERE organization_id = ?', [organizationId]);
          maxNum = cnt[0].total;
        }
        employeeCode = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
      }

      // 2. Check for duplicate email or employee_code in employees
      const [existingEmp] = await connection.execute(
        'SELECT id FROM employees WHERE organization_id = ? AND (email = ? OR employee_code = ?) FOR UPDATE',
        [organizationId, data.email.trim(), employeeCode]
      );

      if (existingEmp.length > 0) {
        throw new Error('An employee with this official email or Employee ID already exists in your organization');
      }

      // 3. Check for duplicate email in users table
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ? FOR UPDATE',
        [data.email.trim()]
      );

      if (existingUser.length > 0) {
        throw new Error('A user account with this official email already exists');
      }

      // 4. Create user account in inactive / pending state
      const initialPlaceholder = crypto.randomBytes(32).toString('hex');
      const initialHash = await bcrypt.hash(initialPlaceholder, 10);

      const [userResult] = await connection.execute(
        'INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, "inactive")',
        [organizationId, data.email.trim(), initialHash, data.first_name.trim(), data.last_name.trim()]
      );
      userId = userResult.insertId;

      // 5. Assign EMPLOYEE role to user
      const [empRoles] = await connection.execute(
        'SELECT id FROM roles WHERE name = "EMPLOYEE" AND is_system_role = 1 LIMIT 1'
      );
      if (empRoles.length > 0) {
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, empRoles[0].id]
        );
      }

      // 6. Insert employee record
      const [result] = await connection.execute(
        `INSERT INTO employees (
          organization_id, user_id, employee_code, first_name, last_name, email, phone, 
          gender, blood_group, date_of_birth, joining_date, employment_type, department_id, designation_id, status,
          profile_image_url, experience_type, terms_accepted, terms_accepted_at,
          current_address, permanent_address, uan_number, resume_url, gross_salary, basic_salary, hra, deductions,
          office_state, office_city
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          organizationId,
          userId,
          employeeCode,
          data.first_name.trim(),
          data.last_name.trim(),
          data.email.trim(),
          data.phone || null,
          data.gender || null,
          data.blood_group || null,
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
          data.deductions || null,
          data.office_state || null,
          data.office_city || null
        ]
      );

      employeeId = result.insertId;

      // 7. Initialize onboarding record
      await connection.execute(
        'INSERT INTO employee_onboarding (organization_id, employee_id, status, started_at) VALUES (?, ?, "pending", NOW())',
        [organizationId, employeeId]
      );

      // 8. Insert experiences if any
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

      // 9. Insert education if any
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

      // 10. Insert documents if any
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

      // 11. Generate secure cryptographic activation token
      rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      await connection.execute(
        'INSERT INTO account_activations (organization_id, user_id, employee_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
        [organizationId, userId, employeeId, tokenHash, expiresAt]
      );

      // 12. Audit log
      await connection.execute(
        'INSERT INTO audit_logs (organization_id, user_id, action, module, target_id) VALUES (?, ?, "EMPLOYEE_CREATED", "employee", ?)',
        [organizationId, userId, employeeId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // 13. Handle onboarding email dispatch
    const [orgRows] = await db.execute('SELECT name FROM organizations WHERE id = ?', [organizationId]);
    const orgName = orgRows.length > 0 ? orgRows[0].name : 'Jatta M Kommerce';

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const appDownloadUrl = process.env.APP_DOWNLOAD_URL || `${appUrl}/download`;
    const activationLink = `${appUrl}/activate?token=${rawToken}`;
    const shouldSendEmail = data.send_onboarding_email !== false;

    let emailResult = null;
    let gmailComposeUrl = null;

    if (shouldSendEmail) {
      try {
        emailResult = await emailService.sendOnboardingEmail({
          toEmail: data.email.trim(),
          employeeName: `${data.first_name.trim()} ${data.last_name.trim()}`,
          employeeCode: employeeCode,
          activationLink,
          token: rawToken,
          appDownloadUrl,
          organizationName: orgName
        });
        gmailComposeUrl = emailResult?.gmailComposeUrl || null;
      } catch (err) {
        console.error('[EmployeeService] Error sending onboarding email:', err);
        emailResult = { success: false, error: err.message, activationLink, token: rawToken, appDownloadUrl };
      }
    } else {
      const subject = `Welcome to ${orgName} - Activate Your HRMS Account (${employeeCode})`;
      const textContent = `Welcome to ${orgName} HRMS!\n\nDear ${data.first_name.trim()} ${data.last_name.trim()},\n\nYour official employee profile and HRMS account have been created.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYOUR HRMS LOGIN CREDENTIALS & ACCESS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Official Email: ${data.email.trim()}\n• Official Employee ID: ${employeeCode}\n• Single-Use Activation Token: ${rawToken}\n• Token Validity: 48 Hours\n• HRMS Portal Access URL: ${appUrl}/login\n• Mobile App Download Link: ${appDownloadUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nSTEP 1: ACTIVATE YOUR ACCOUNT\nClick the secure activation link below to set your permanent password:\n${activationLink}\n\nSTEP 2: DOWNLOAD & INSTALL MOBILE APP\nApp Download Link: ${appDownloadUrl}\nOpen on your phone and tap "Add to Home Screen" or "Install App".`;
      gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.email.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(textContent.trim())}`;
    }

    return {
      id: employeeId,
      user_id: userId,
      employee_code: employeeCode,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim(),
      token: rawToken,
      account_status: 'INACTIVE',
      activation_status: 'PENDING',
      email_status: shouldSendEmail ? (emailResult?.success ? 'SENT' : 'FAILED') : 'SAVED_NO_EMAIL',
      email_error: emailResult?.error || null,
      activation_link: activationLink,
      app_download_url: appDownloadUrl,
      gmail_compose_url: gmailComposeUrl,
      requires_activation: true
    };
  }

  async resendInvitation(organizationId, employeeId) {
    const [emps] = await db.execute(
      `SELECT e.id, e.organization_id, e.user_id, e.employee_code, e.first_name, e.last_name, e.email,
              u.status AS user_status, o.name AS organization_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE e.id = ? AND e.organization_id = ?`,
      [employeeId, organizationId]
    );

    if (emps.length === 0) {
      throw new Error('Employee not found in your organization');
    }

    const emp = emps[0];

    if (emp.user_status === 'active') {
      throw new Error('This employee account is already active and does not require an invitation.');
    }

    // Invalidate existing unused tokens for this user
    await db.execute(
      'UPDATE account_activations SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [emp.user_id]
    );

    // Generate fresh cryptographic token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    await db.execute(
      'INSERT INTO account_activations (organization_id, user_id, employee_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
      [organizationId, emp.user_id, emp.id, tokenHash, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const appDownloadUrl = process.env.APP_DOWNLOAD_URL || `${appUrl}/download`;
    const activationLink = `${appUrl}/activate?token=${rawToken}`;

    let emailResult;
    try {
      emailResult = await emailService.sendOnboardingEmail({
        toEmail: emp.email,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        employeeCode: emp.employee_code,
        activationLink,
        token: rawToken,
        appDownloadUrl,
        organizationName: emp.organization_name || 'Jatta M Kommerce'
      });
    } catch (err) {
      console.error('[EmployeeService] Resend email dispatch error:', err);
      emailResult = { success: false, error: err.message, activationLink, token: rawToken, appDownloadUrl };
    }

    return {
      employee_id: emp.id,
      user_id: emp.user_id,
      employee_code: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      token: rawToken,
      account_status: 'INACTIVE',
      activation_status: 'PENDING',
      email_status: emailResult.success ? 'SENT' : 'FAILED',
      email_error: emailResult.error || null,
      activation_link: activationLink,
      app_download_url: appDownloadUrl,
      gmail_compose_url: emailResult.gmailComposeUrl
    };
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
          blood_group = COALESCE(?, blood_group),
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
          incentives = COALESCE(?, incentives),
          office_state = COALESCE(?, office_state),
          office_city = COALESCE(?, office_city)
        WHERE id = ? AND organization_id = ?`,
        [
          data.first_name?.trim() || null,
          data.last_name?.trim() || null,
          data.email?.trim() || null,
          data.phone || null,
          data.gender || null,
          data.blood_group || null,
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
          data.office_state || null,
          data.office_city || null,
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
    const [managers] = await db.execute('SELECT id, first_name, last_name, employee_code FROM employees WHERE organization_id = ? AND status = "active"', [organizationId]);
    
    return { departments, designations, managers };
  }
}

module.exports = new EmployeeService();
