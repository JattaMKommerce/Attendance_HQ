const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const emailService = require('./emailService');

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let rand = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `Jmk@${rand}`;
}

function toDateOnly(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.substring(0, 10);
    // Support DD/MM/YYYY or DD-MM-YYYY format (e.g. 17/05/2000)
    const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const m = dmy[2].padStart(2, '0');
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }
    // Support YYYY/MM/DD
    const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) {
      const y = ymd[1];
      const m = ymd[2].padStart(2, '0');
      const d = ymd[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (trimmed.includes(' ')) return trimmed.split(' ')[0];
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  return null;
}

function sanitizeDocType(type) {
  const allowed = ['identity', 'contract', 'certificate', 'policy', 'medical', 'leave_support', 'other'];
  if (!type || typeof type !== 'string') return 'other';
  const t = type.toLowerCase().trim();
  if (allowed.includes(t)) return t;
  if (t === 'education' || t === 'degree' || t === 'diploma') return 'certificate';
  if (t === 'resume' || t === 'cv') return 'contract';
  if (t === 'bank' || t === 'passbook' || t === 'cheque') return 'other';
  return 'other';
}

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
      WHERE (e.organization_id = ? OR ? IS NULL)
    `;
    const queryParams = [organizationId, organizationId];

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
    let query = `
      SELECT e.*, d.name as department_name, des.name as designation_name, o.name as organization_name,
              u.status as user_status,
              (SELECT aa.used_at FROM account_activations aa WHERE aa.user_id = e.user_id ORDER BY aa.id DESC LIMIT 1) as activation_used_at,
              (SELECT aa.expires_at FROM account_activations aa WHERE aa.user_id = e.user_id ORDER BY aa.id DESC LIMIT 1) as activation_expires_at
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN organizations o ON e.organization_id = o.id
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = ?
    `;
    const params = [employeeId];
    if (organizationId) {
      query += ` AND (e.organization_id = ? OR e.organization_id IS NULL)`;
      params.push(organizationId);
    }

    const [rows] = await db.execute(query, params);

    if (rows.length === 0) {
      throw new Error('Employee not found');
    }

    const employee = rows[0];
    if (employee.date_of_birth) employee.date_of_birth = toDateOnly(employee.date_of_birth);
    if (employee.joining_date) employee.joining_date = toDateOnly(employee.joining_date);

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
    let isExistingUpdate = false;
    let tempPassword = (data.temporary_password || data.initial_password || '').trim();
    if (!tempPassword) {
      tempPassword = generateTemporaryPassword();
    }

    try {
      await connection.beginTransaction();

      const email = data.email.trim();
      const initialHash = await bcrypt.hash(tempPassword, 10);

      // 1. Check if an employee with this email already exists in the organization
      const [existingEmpByEmail] = await connection.execute(
        'SELECT id, user_id, employee_code, status FROM employees WHERE organization_id = ? AND email = ? FOR UPDATE',
        [organizationId, email]
      );

      if (existingEmpByEmail.length > 0) {
        isExistingUpdate = true;
        employeeId = existingEmpByEmail[0].id;
        userId = existingEmpByEmail[0].user_id;
        if (!employeeCode) {
          employeeCode = existingEmpByEmail[0].employee_code;
        }
      }

      // 2. Resolve User Account in users table
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ? FOR UPDATE',
        [email]
      );

      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        // Update user record: ensure password is set, names are updated, and status is active
        await connection.execute(
          'UPDATE users SET password_hash = ?, first_name = ?, last_name = ?, status = "active" WHERE id = ?',
          [initialHash, data.first_name.trim(), data.last_name.trim(), userId]
        );
      } else {
        // If employee previously had a user_id
        if (userId) {
          const [uById] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
          if (uById.length > 0) {
            await connection.execute(
              'UPDATE users SET email = ?, password_hash = ?, first_name = ?, last_name = ?, status = "active" WHERE id = ?',
              [email, initialHash, data.first_name.trim(), data.last_name.trim(), userId]
            );
          } else {
            userId = null;
          }
        }

        if (!userId) {
          const [userResult] = await connection.execute(
            'INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, "active")',
            [organizationId, email, initialHash, data.first_name.trim(), data.last_name.trim()]
          );
          userId = userResult.insertId;
        }
      }

      // 3. Ensure EMPLOYEE role is assigned to user
      const [empRoles] = await connection.execute(
        'SELECT id FROM roles WHERE name = "EMPLOYEE" LIMIT 1'
      );
      if (empRoles.length > 0) {
        await connection.execute(
          'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, empRoles[0].id]
        );
      }

      // 4. Resolve Employee Code (guarantee uniqueness without duplicate key collision)
      let candidateCode = employeeCode;
      if (!candidateCode) {
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
        candidateCode = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
      }

      let codeExists = true;
      let attempt = 0;
      while (codeExists) {
        const [check] = await connection.execute(
          'SELECT id FROM employees WHERE organization_id = ? AND employee_code = ? AND id != ?',
          [organizationId, candidateCode, employeeId || 0]
        );
        if (check.length === 0) {
          codeExists = false;
        } else {
          attempt++;
          candidateCode = `EMP-${String(attempt).padStart(3, '0')}`;
        }
      }
      employeeCode = candidateCode;

      // 5. Auto-resolve department and designation if names were provided
      let departmentId = data.department_id || null;
      if (!departmentId && data.department_name && data.department_name.trim()) {
        const [dRows] = await connection.execute(
          'SELECT id FROM departments WHERE organization_id = ? AND name = ? LIMIT 1',
          [organizationId, data.department_name.trim()]
        );
        if (dRows.length > 0) {
          departmentId = dRows[0].id;
        } else {
          const [dIns] = await connection.execute(
            'INSERT INTO departments (organization_id, name) VALUES (?, ?)',
            [organizationId, data.department_name.trim()]
          );
          departmentId = dIns.insertId;
        }
      }

      let designationId = data.designation_id || null;
      if (!designationId && data.designation_name && data.designation_name.trim()) {
        const [desRows] = await connection.execute(
          'SELECT id FROM designations WHERE organization_id = ? AND name = ? LIMIT 1',
          [organizationId, data.designation_name.trim()]
        );
        if (desRows.length > 0) {
          designationId = desRows[0].id;
        } else {
          const [desIns] = await connection.execute(
            'INSERT INTO designations (organization_id, name, department_id) VALUES (?, ?, ?)',
            [organizationId, data.designation_name.trim(), departmentId]
          );
          designationId = desIns.insertId;
        }
      }

      // 6. Insert OR Update Employee record
      if (isExistingUpdate) {
        await connection.execute(
          `UPDATE employees SET
            user_id = ?,
            employee_code = ?,
            first_name = ?,
            last_name = ?,
            email = ?,
            phone = ?,
            gender = ?,
            marital_status = ?,
            blood_group = ?,
            date_of_birth = ?,
            joining_date = ?,
            employment_type = ?,
            department_id = ?,
            designation_id = ?,
            status = 'active',
            profile_image_url = COALESCE(?, profile_image_url),
            experience_type = ?,
            terms_accepted = ?,
            terms_accepted_at = COALESCE(terms_accepted_at, ?),
            current_address = ?,
            permanent_address = ?,
            uan_number = ?,
            resume_url = COALESCE(?, resume_url),
            gross_salary = ?,
            basic_salary = ?,
            hra = ?,
            deductions = ?,
            office_state = ?,
            office_city = ?,
            monthly_paid_leaves = ?,
            bank_name = ?,
            account_number = ?,
            ifsc_code = ?
          WHERE id = ?`,
          [
            userId,
            employeeCode,
            data.first_name.trim(),
            data.last_name.trim(),
            email,
            data.phone || null,
            data.gender || null,
            data.marital_status || null,
            data.blood_group || null,
            toDateOnly(data.date_of_birth),
            toDateOnly(data.joining_date),
            data.employment_type || 'full_time',
            departmentId,
            designationId,
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
            data.office_city || null,
            data.monthly_paid_leaves !== undefined && data.monthly_paid_leaves !== '' ? parseInt(data.monthly_paid_leaves, 10) : 1,
            data.bank_name || null,
            data.account_number || null,
            data.ifsc_code ? data.ifsc_code.toUpperCase() : null,
            employeeId
          ]
        );
      } else {
        const [result] = await connection.execute(
          `INSERT INTO employees (
            organization_id, user_id, employee_code, first_name, last_name, email, phone, 
            gender, marital_status, blood_group, date_of_birth, joining_date, employment_type, department_id, designation_id, status,
            profile_image_url, experience_type, terms_accepted, terms_accepted_at,
            current_address, permanent_address, uan_number, resume_url, gross_salary, basic_salary, hra, deductions,
            office_state, office_city, monthly_paid_leaves, bank_name, account_number, ifsc_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            organizationId,
            userId,
            employeeCode,
            data.first_name.trim(),
            data.last_name.trim(),
            email,
            data.phone || null,
            data.gender || null,
            data.marital_status || null,
            data.blood_group || null,
            toDateOnly(data.date_of_birth),
            toDateOnly(data.joining_date),
            data.employment_type || 'full_time',
            departmentId,
            designationId,
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
            data.office_city || null,
            data.monthly_paid_leaves !== undefined && data.monthly_paid_leaves !== '' ? parseInt(data.monthly_paid_leaves, 10) : 1,
            data.bank_name || null,
            data.account_number || null,
            data.ifsc_code ? data.ifsc_code.toUpperCase() : null
          ]
        );
        employeeId = result.insertId;
      }

      // 7. Initialize onboarding record
      await connection.execute(
        'INSERT INTO employee_onboarding (organization_id, employee_id, status, started_at) VALUES (?, ?, "completed", NOW()) ON DUPLICATE KEY UPDATE status = "completed", completed_at = NOW()',
        [organizationId, employeeId]
      );

      // Clean old experiences/education on update to avoid duplicate rows
      if (isExistingUpdate) {
        await connection.execute('DELETE FROM employee_experiences WHERE employee_id = ?', [employeeId]);
        await connection.execute('DELETE FROM employee_education WHERE employee_id = ?', [employeeId]);
      }

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
      const allDocs = [
        ...(Array.isArray(data.documents) ? data.documents : []),
        ...(Array.isArray(data.bank_documents) ? data.bank_documents.map(d => ({ ...d, document_type: 'other' })) : []),
        ...(Array.isArray(data.education) ? data.education.flatMap(edu =>
          Array.isArray(edu.edu_documents) ? edu.edu_documents.map(d => ({ ...d, document_type: 'certificate' })) : []
        ) : [])
      ];
      for (const doc of allDocs) {
        if (doc.file_url) {
          await connection.execute(
            `INSERT INTO documents (
              organization_id, employee_id, title, document_type, file_url, status
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              organizationId,
              employeeId,
              doc.title || 'Document',
              sanitizeDocType(doc.document_type),
              doc.file_url,
              'active'
            ]
          );
        }
      }

      // 10b. Auto-seed leave balances for new employee
      const currentYear = new Date().getFullYear();
      let [leaveTypes] = await connection.execute(
        'SELECT id, name FROM leave_types WHERE organization_id = ? ORDER BY id ASC',
        [organizationId]
      );

      if (leaveTypes.length === 0) {
        // Seed default leave types for the org if none exist
        const defaultLeaveTypes = [
          { name: 'Casual Leave', code: 'CL', days: 12 },
          { name: 'Sick Leave', code: 'SL', days: 12 },
          { name: 'Earned Leave', code: 'EL', days: 18 }
        ];
        for (const lt of defaultLeaveTypes) {
          const [ltRes] = await connection.execute(
            `INSERT IGNORE INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment)
             VALUES (?, ?, ?, '#2563eb', 1, 0)`,
            [organizationId, lt.name, `${lt.name} - Default`]
          );
          if (ltRes.insertId) {
            await connection.execute(
              `INSERT IGNORE INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward)
               VALUES (?, ?, ?, 0)`,
              [organizationId, ltRes.insertId, lt.days]
            );
            leaveTypes.push({ id: ltRes.insertId, name: lt.name });
          }
        }
        // Re-fetch after seeding
        [leaveTypes] = await connection.execute(
          'SELECT id, name FROM leave_types WHERE organization_id = ? ORDER BY id ASC',
          [organizationId]
        );
      }

      // Seed leave_balances for this employee (one row per leave type per year)
      for (const lt of leaveTypes) {
        const [policy] = await connection.execute(
          'SELECT yearly_allowance FROM leave_policies WHERE leave_type_id = ? AND organization_id = ? LIMIT 1',
          [lt.id, organizationId]
        );
        const allocated = policy.length > 0 ? (policy[0].yearly_allowance || 12) : 12;
        await connection.execute(
          `INSERT IGNORE INTO leave_balances (organization_id, employee_id, leave_type_id, year, allocated, used, carried_forward)
           VALUES (?, ?, ?, ?, ?, 0, 0)`,
          [organizationId, employeeId, lt.id, currentYear, allocated]
        );
      }

      // 10c. Assign a default shift if one exists in the org
      try {
        let [existingShifts] = await connection.execute(
          'SELECT id FROM shifts WHERE organization_id = ? ORDER BY id ASC LIMIT 1',
          [organizationId]
        );
        if (existingShifts.length > 0) {
          await connection.execute(
            `INSERT IGNORE INTO work_schedules (organization_id, employee_id, shift_id, effective_from)
             VALUES (?, ?, ?, CURDATE())`,
            [organizationId, employeeId, existingShifts[0].id]
          );
        } else {
          // Seed a default General shift for the org if none exists
          const [shiftRes] = await connection.execute(
            `INSERT IGNORE INTO shifts (organization_id, name, start_time, end_time, break_duration_minutes)
             VALUES (?, 'General Shift', '09:00:00', '18:00:00', 60)`,
            [organizationId]
          );
          const shiftId = shiftRes.insertId || 1;
          await connection.execute(
            `INSERT IGNORE INTO work_schedules (organization_id, employee_id, shift_id, effective_from)
             VALUES (?, ?, ?, CURDATE())`,
            [organizationId, employeeId, shiftId]
          );
        }
      } catch (shiftErr) {
        console.warn('[EmployeeService] Non-critical shift assignment warning:', shiftErr.message);
      }

      // 11. Generate secure cryptographic activation token
      rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      await connection.execute(
        'DELETE FROM account_activations WHERE user_id = ? OR employee_id = ?',
        [userId, employeeId]
      );
      await connection.execute(
        'INSERT INTO account_activations (organization_id, user_id, employee_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
        [organizationId, userId, employeeId, tokenHash, expiresAt]
      );

      // 12. Audit log
      try {
        await connection.execute(
          'INSERT INTO audit_logs (organization_id, user_id, action, module, target_id) VALUES (?, ?, ?, "employee", ?)',
          [organizationId, userId, isExistingUpdate ? "EMPLOYEE_UPDATED" : "EMPLOYEE_CREATED", employeeId]
        );
      } catch (auditErr) {
        console.warn('[EmployeeService] Non-critical audit log note:', auditErr.message);
      }

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

    const appUrl = (process.env.APP_URL || 'https://hrms.jattamkommerce.com').replace(/\/+$/, '');
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
          organizationName: orgName,
          temporaryPassword: tempPassword
        });
        gmailComposeUrl = emailResult?.gmailComposeUrl || null;
      } catch (err) {
        console.error('[EmployeeService] Error sending onboarding email:', err);
        emailResult = { success: false, error: err.message, activationLink, token: rawToken, appDownloadUrl };
      }
    } else {
      const subject = `Welcome to ${orgName} - Your HRMS Account Credentials (${employeeCode})`;
      const textContent = `Welcome to ${orgName} HRMS!\n\nDear ${data.first_name.trim()} ${data.last_name.trim()},\n\nYour official employee profile and HRMS account have been created.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nYOUR HRMS LOGIN CREDENTIALS & ACCESS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Official Email: ${data.email.trim()}\n• Official Employee ID: ${employeeCode}\n• Temporary Login Password: ${tempPassword}\n• Mobile App Direct Download (APK v1.0): ${appUrl}/jmk-hrms.apk\n• HRMS Web Portal URL: ${appUrl}/login\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ MANDATORY ACTION UPON FIRST LOGIN:\nDownload the Android app or log in to the web portal using your email and temporary password, then immediately change your password in Settings -> Change Password.\n\nAlternative web password set link: ${activationLink}`;
      gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(data.email.trim())}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(textContent.trim())}`;
    }

    return {
      id: employeeId,
      user_id: userId,
      employee_code: employeeCode,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim(),
      temporary_password: tempPassword,
      token: rawToken,
      account_status: 'ACTIVE',
      activation_status: 'CREDENTIALS_ISSUED',
      email_status: shouldSendEmail ? (emailResult?.success ? 'SENT' : 'FAILED') : 'SAVED_NO_EMAIL',
      email_error: emailResult?.error || null,
      activation_link: activationLink,
      app_download_url: appDownloadUrl,
      gmail_compose_url: gmailComposeUrl,
      requires_activation: false,
      is_updated: isExistingUpdate
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

    // Generate a fresh temporary password and activate/update user
    const tempPassword = generateTemporaryPassword();
    const newHash = await bcrypt.hash(tempPassword, 10);
    await db.execute('UPDATE users SET password_hash = ?, status = "active" WHERE id = ?', [newHash, emp.user_id]);

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

    const appUrl = (process.env.APP_URL || 'https://hrms.jattamkommerce.com').replace(/\/+$/, '');
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
        organizationName: emp.organization_name || 'Jatta M Kommerce',
        temporaryPassword: tempPassword
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
      temporary_password: tempPassword,
      token: rawToken,
      account_status: 'ACTIVE',
      activation_status: 'CREDENTIALS_ISSUED',
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
          marital_status = COALESCE(?, marital_status),
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
          office_city = COALESCE(?, office_city),
          profile_image_url = COALESCE(?, profile_image_url)
        WHERE id = ? AND organization_id = ?`,
        [
          data.first_name?.trim() || null,
          data.last_name?.trim() || null,
          data.email?.trim() || null,
          data.phone || null,
          data.gender || null,
          data.marital_status || null,
          data.blood_group || null,
          toDateOnly(data.date_of_birth),
          toDateOnly(data.joining_date),
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
          data.ifsc_code ? data.ifsc_code.toUpperCase() : null,
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
          data.profile_image_url || null,
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

      // 5. Upsert documents if provided
      if (Array.isArray(data.documents)) {
        // Clear existing and re-insert
        await connection.execute('DELETE FROM documents WHERE organization_id = ? AND employee_id = ? AND status = "active"', [organizationId, employeeId]);
        for (const doc of data.documents) {
          if (doc.file_url) {
            await connection.execute(
              'INSERT INTO documents (organization_id, employee_id, title, document_type, file_url, status) VALUES (?, ?, ?, ?, ?, "active")',
              [organizationId, employeeId, doc.title || doc.document_type || 'Document', sanitizeDocType(doc.document_type), doc.file_url]
            );
          }
        }
      }

      await connection.commit();
      return await this.getEmployeeById(organizationId, employeeId);
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

  async deleteEmployee(organizationId, employeeId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Temporarily disable foreign key constraints to ensure complete cleanup without cascades locking
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

      // Check if employee exists
      let empQuery = 'SELECT id, user_id, organization_id, first_name, last_name, email FROM employees WHERE id = ?';
      const params = [employeeId];
      if (organizationId) {
        empQuery += ' AND organization_id = ?';
        params.push(organizationId);
      }

      let [emp] = await connection.execute(empQuery, params);

      if (emp.length === 0) {
        // Fallback: check by ID alone
        const [empById] = await connection.execute(
          'SELECT id, user_id, organization_id, first_name, last_name, email FROM employees WHERE id = ?',
          [employeeId]
        );
        if (empById.length > 0) {
          emp = empById;
        } else {
          await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
          await connection.commit();
          return { success: true, message: 'Employee deleted successfully' };
        }
      }

      const targetEmp = emp[0];
      const userId = targetEmp.user_id;

      // 1. Delete all dependent child records across all potential tables
      const childDeleteQueries = [
        'DELETE FROM employee_experiences WHERE employee_id = ?',
        'DELETE FROM employee_education WHERE employee_id = ?',
        'DELETE FROM employee_onboarding_tasks WHERE employee_onboarding_id IN (SELECT id FROM employee_onboarding WHERE employee_id = ?)',
        'DELETE FROM employee_onboarding WHERE employee_id = ?',
        'DELETE FROM employee_status_history WHERE employee_id = ?',
        'DELETE FROM employee_salaries WHERE employee_id = ?',
        'DELETE FROM employee_managers WHERE employee_id = ? OR manager_id = ?',
        'DELETE FROM work_schedules WHERE employee_id = ?',
        'DELETE FROM documents WHERE employee_id = ?',
        'DELETE FROM document_access WHERE employee_id = ?',
        'DELETE FROM attendance_logs WHERE employee_id = ?',
        'DELETE FROM attendance_records WHERE employee_id = ?',
        'DELETE FROM attendance_regularization WHERE employee_id = ?',
        'DELETE FROM leave_requests WHERE employee_id = ?',
        'DELETE FROM leave_balances WHERE employee_id = ?',
        'DELETE FROM payslips WHERE employee_id = ?',
        'DELETE FROM payroll_items WHERE payroll_record_id IN (SELECT id FROM payroll_records WHERE employee_id = ?)',
        'DELETE FROM payroll_records WHERE employee_id = ?',
        'DELETE FROM account_activations WHERE employee_id = ?',
        'DELETE FROM asset_assignments WHERE employee_id = ?',
        'DELETE FROM expenses WHERE employee_id = ?',
        'DELETE FROM announcement_audiences WHERE employee_id = ?',
        'DELETE FROM task_assignments WHERE employee_id = ?',
        'DELETE FROM employee_incentives WHERE employee_id = ?',
        'DELETE FROM rosters WHERE employee_id = ?',
        'DELETE FROM goals WHERE employee_id = ?',
        'DELETE FROM performance_reviews WHERE employee_id = ? OR reviewer_id = ?'
      ];

      for (const q of childDeleteQueries) {
        try {
          if (q.includes('OR manager_id = ?') || q.includes('OR reviewer_id = ?')) {
            await connection.execute(q, [employeeId, employeeId]);
          } else {
            await connection.execute(q, [employeeId]);
          }
        } catch (tblErr) {
          // Table or column might not exist in some schema versions
        }
      }

      // Nullify references in any other parent or related tables
      try {
        await connection.execute('UPDATE employees SET user_id = NULL WHERE id = ?', [employeeId]);
        await connection.execute('UPDATE departments SET parent_department_id = NULL WHERE parent_department_id = ?', [employeeId]);
        await connection.execute('UPDATE job_openings SET hiring_manager_id = NULL WHERE hiring_manager_id = ?', [employeeId]);
      } catch (nErr) {}

      // 2. Delete employee record
      await connection.execute('DELETE FROM employees WHERE id = ?', [employeeId]);

      // 3. Delete user account if NOT an admin/superadmin
      if (userId) {
        try {
          const [userRole] = await connection.execute(
            `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`,
            [userId]
          );
          const [userRow] = await connection.execute('SELECT email FROM users WHERE id = ?', [userId]);
          const userEmail = (userRow[0]?.email || '').toLowerCase();

          const isAdmin = userRole.some(r => 
            ['admin', 'superadmin', 'ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(r.name)
          ) || userEmail === 'hrms@jattamkommerce.com' || userEmail.includes('admin');

          if (!isAdmin) {
            await connection.execute('DELETE FROM user_roles WHERE user_id = ?', [userId]);
            await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
            await connection.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
            await connection.execute('DELETE FROM account_activations WHERE user_id = ?', [userId]);
            await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
          }
        } catch (uErr) {
          console.warn('Could not delete user account for employee:', uErr.message);
        }
      }

      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      await connection.commit();
      return { success: true, message: 'Employee deleted successfully' };
    } catch (err) {
      try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {}
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  async resetTestData(organizationId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

      const tablesToClear = [
        'attendance_records', 'attendance_logs', 'attendance_regularization',
        'leave_requests', 'leave_balances', 'leave_approval_history',
        'payslips', 'payroll_runs', 'payroll_records', 'payroll_items',
        'performance_reviews', 'performance_feedback', 'goal_updates', 'goals',
        'candidate_resumes', 'candidate_status_history', 'candidates', 'job_openings',
        'employee_experiences', 'employee_education', 'employee_onboarding_tasks',
        'employee_onboarding', 'employee_status_history', 'employee_salaries',
        'employee_managers', 'employee_incentives', 'work_schedules', 'rosters',
        'asset_assignments', 'expense_approval_history', 'expenses',
        'task_assignments', 'document_access', 'documents', 'account_activations',
        'employees'
      ];

      for (const tbl of tablesToClear) {
        try {
          await connection.execute(`DELETE FROM ${tbl}`);
        } catch (e) {}
      }

      try {
        await connection.execute(`
          DELETE FROM user_roles WHERE user_id NOT IN (
            SELECT id FROM (
              SELECT u.id FROM users u
              LEFT JOIN user_roles ur ON u.id = ur.user_id
              LEFT JOIN roles r ON ur.role_id = r.id
              WHERE r.name IN ('admin', 'superadmin', 'ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN')
                 OR u.email = 'hrms@jattamkommerce.com'
                 OR u.email LIKE '%admin%'
                 OR u.email LIKE '%jattamkommerce%'
                 OR u.email LIKE '%hr@%'
            ) AS preserved_users
          )
        `);

        await connection.execute(`
          DELETE FROM user_permissions WHERE user_id NOT IN (
            SELECT id FROM (
              SELECT u.id FROM users u
              LEFT JOIN user_roles ur ON u.id = ur.user_id
              LEFT JOIN roles r ON ur.role_id = r.id
              WHERE r.name IN ('admin', 'superadmin', 'ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN')
                 OR u.email = 'hrms@jattamkommerce.com'
                 OR u.email LIKE '%admin%'
                 OR u.email LIKE '%jattamkommerce%'
                 OR u.email LIKE '%hr@%'
            ) AS preserved_users
          )
        `);

        await connection.execute(`
          DELETE FROM refresh_tokens WHERE user_id NOT IN (
            SELECT id FROM (
              SELECT u.id FROM users u
              LEFT JOIN user_roles ur ON u.id = ur.user_id
              LEFT JOIN roles r ON ur.role_id = r.id
              WHERE r.name IN ('admin', 'superadmin', 'ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN')
                 OR u.email = 'hrms@jattamkommerce.com'
                 OR u.email LIKE '%admin%'
                 OR u.email LIKE '%jattamkommerce%'
                 OR u.email LIKE '%hr@%'
            ) AS preserved_users
          )
        `);

        await connection.execute(`
          DELETE FROM users WHERE id NOT IN (
            SELECT id FROM (
              SELECT u.id FROM users u
              LEFT JOIN user_roles ur ON u.id = ur.user_id
              LEFT JOIN roles r ON ur.role_id = r.id
              WHERE r.name IN ('admin', 'superadmin', 'ORG_ADMIN', 'SUPER_ADMIN', 'HR_ADMIN', 'ADMIN')
                 OR u.email = 'hrms@jattamkommerce.com'
                 OR u.email LIKE '%admin%'
                 OR u.email LIKE '%jattamkommerce%'
                 OR u.email LIKE '%hr@%'
            ) AS preserved_users
          )
        `);
      } catch (uErr) {}

      try {
        await connection.execute('ALTER TABLE employees AUTO_INCREMENT = 1');
        await connection.execute('ALTER TABLE account_activations AUTO_INCREMENT = 1');
        await connection.execute('ALTER TABLE attendance_records AUTO_INCREMENT = 1');
        await connection.execute('ALTER TABLE attendance_logs AUTO_INCREMENT = 1');
        await connection.execute('ALTER TABLE leave_requests AUTO_INCREMENT = 1');
        await connection.execute('ALTER TABLE payslips AUTO_INCREMENT = 1');
      } catch (e) {}

      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      await connection.commit();
      return { success: true, message: 'All test employees and related data erased. System reset to EMP-001.' };
    } catch (err) {
      try { await connection.execute('SET FOREIGN_KEY_CHECKS = 1'); } catch (e) {}
      await connection.rollback();
      throw err;
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
