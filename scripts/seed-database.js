const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'hrms_saas',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  multipleStatements: true
};

async function seedDatabase() {
  console.log(`Connecting to MySQL ${config.host}:${config.port}/${config.database}...`);
  const conn = await mysql.createConnection(config);

  try {
    const defaultPasswordHash = '$2b$10$xOYsgf/2m8/LP4s.ta7itOq.MkzKjIlM5eeczHvgD1K0ZiL9XP7re'; // password123

    console.log('1. Checking system roles and permissions...');
    const rolesToEnsure = [
      ['SUPER_ADMIN', 'Platform Administrator'],
      ['ORG_ADMIN', 'Organization Administrator'],
      ['HR_ADMIN', 'Human Resources Administrator'],
      ['PAYROLL_MANAGER', 'Payroll Manager'],
      ['MANAGER', 'Department or Team Manager'],
      ['FINANCE', 'Finance Role'],
      ['EMPLOYEE', 'Standard Employee']
    ];

    const roleMap = {};
    for (const [rName, rDesc] of rolesToEnsure) {
      const [existing] = await conn.execute(
        'SELECT id FROM roles WHERE name = ? AND organization_id IS NULL ORDER BY id ASC LIMIT 1',
        [rName]
      );
      if (existing.length > 0) {
        roleMap[rName] = existing[0].id;
        await conn.execute('UPDATE roles SET description = ? WHERE id = ?', [rDesc, existing[0].id]);
      } else {
        const [ins] = await conn.execute(
          'INSERT INTO roles (name, description, is_system_role) VALUES (?, ?, 1)',
          [rName, rDesc]
        );
        roleMap[rName] = ins.insertId;
      }
    }

    // Clean any duplicate system role rows
    for (const [rName] of rolesToEnsure) {
      const canonId = roleMap[rName];
      if (canonId) {
        await conn.execute('DELETE FROM roles WHERE name = ? AND organization_id IS NULL AND id != ?', [rName, canonId]);
      }
    }

    // Seed role_permissions
    const [allPerms] = await conn.execute('SELECT id, name FROM permissions');
    const perm = {};
    allPerms.forEach(p => perm[p.name] = p.id);

    const mappings = [
      // ORG_ADMIN gets full organizational management
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['employee.view'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['employee.create'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['employee.update'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['employee.delete'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['employee.manage_status'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['attendance.view'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['attendance.manage'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['leave.view'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['leave.approve'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['leave.apply'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['payroll.view'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['payroll.create'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['payroll.edit'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['payroll.approve'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['recruitment.view'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['recruitment.manage'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['reports.view'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['reports.export'] },
      { role_id: roleMap['ORG_ADMIN'], perm_id: perm['organizations.view'] },

      // HR_ADMIN
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['employee.view'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['employee.create'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['employee.update'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['employee.manage_status'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['attendance.view'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['attendance.manage'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['leave.view'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['leave.approve'] },
      { role_id: roleMap['HR_ADMIN'], perm_id: perm['reports.view'] },

      // MANAGER
      { role_id: roleMap['MANAGER'], perm_id: perm['employee.view'] },
      { role_id: roleMap['MANAGER'], perm_id: perm['attendance.view'] },
      { role_id: roleMap['MANAGER'], perm_id: perm['leave.view'] },
      { role_id: roleMap['MANAGER'], perm_id: perm['leave.approve'] },

      // PAYROLL_MANAGER
      { role_id: roleMap['PAYROLL_MANAGER'], perm_id: perm['payroll.view'] },
      { role_id: roleMap['PAYROLL_MANAGER'], perm_id: perm['payroll.create'] },
      { role_id: roleMap['PAYROLL_MANAGER'], perm_id: perm['payroll.edit'] },
      { role_id: roleMap['PAYROLL_MANAGER'], perm_id: perm['payroll.approve'] },
      { role_id: roleMap['PAYROLL_MANAGER'], perm_id: perm['reports.view'] },
      { role_id: roleMap['PAYROLL_MANAGER'], perm_id: perm['employee.view'] },

      // FINANCE
      { role_id: roleMap['FINANCE'], perm_id: perm['payroll.view'] },
      { role_id: roleMap['FINANCE'], perm_id: perm['reports.view'] },
      { role_id: roleMap['FINANCE'], perm_id: perm['reports.export'] },

      // EMPLOYEE
      { role_id: roleMap['EMPLOYEE'], perm_id: perm['attendance.view'] },
      { role_id: roleMap['EMPLOYEE'], perm_id: perm['leave.apply'] },
      { role_id: roleMap['EMPLOYEE'], perm_id: perm['leave.view'] },
    ];

    for (const m of mappings) {
      if (m.role_id && m.perm_id) {
        await conn.execute('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [m.role_id, m.perm_id]);
      }
    }

    console.log('2. Seeding Super Admin (superadmin@hrms.com)...');
    const [superAdminRes] = await conn.execute(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status)
       VALUES (NULL, 'superadmin@hrms.com', ?, 'Super', 'Admin', 'active')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'active'`,
      [defaultPasswordHash]
    );

    const [superAdminUser] = await conn.execute('SELECT id FROM users WHERE email = "superadmin@hrms.com"');
    const superAdminId = superAdminUser[0].id;
    if (roleMap.SUPER_ADMIN) {
      await conn.execute(
        `INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [superAdminId, roleMap.SUPER_ADMIN]
      );
    }

    console.log('3. Seeding Organization (Acme Corp)...');
    await conn.execute(
      `INSERT INTO organizations (id, name, subdomain, email, status)
       VALUES (1, 'Acme Corp', 'acme', 'admin@acme.com', 'active')
       ON DUPLICATE KEY UPDATE name = 'Acme Corp', status = 'active'`
    );

    console.log('4. Seeding Departments & Designations for Org 1...');
    const departments = ['Engineering', 'IT', 'Sales', 'HR', 'Marketing', 'Finance', 'Operations'];
    for (const d of departments) {
      await conn.execute(
        'INSERT IGNORE INTO departments (organization_id, name) VALUES (1, ?)',
        [d]
      );
    }

    const designations = [
      'Junior Developer', 'Senior Developer', 'Tech Lead', 'Sales Associate', 
      'Sales Manager', 'HR Executive', 'HR Manager', 'System Administrator',
      'Marketing Specialist', 'Finance Analyst'
    ];
    for (const des of designations) {
      await conn.execute(
        'INSERT IGNORE INTO designations (organization_id, name) VALUES (1, ?)',
        [des]
      );
    }

    const [depRows] = await conn.execute('SELECT id, name FROM departments WHERE organization_id = 1');
    const [desRows] = await conn.execute('SELECT id, name FROM designations WHERE organization_id = 1');
    const engDeptId = depRows.find(d => d.name === 'Engineering')?.id || 1;
    const itDeptId = depRows.find(d => d.name === 'IT')?.id || 2;
    const salesDeptId = depRows.find(d => d.name === 'Sales')?.id || 3;
    const hrDeptId = depRows.find(d => d.name === 'HR')?.id || 4;
    const devDesId = desRows.find(d => d.name === 'Senior Developer')?.id || 1;

    console.log('5. Seeding Org Admin (admin@acme.com)...');
    await conn.execute(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status)
       VALUES (1, 'admin@acme.com', ?, 'Alice', 'Admin', 'active')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), organization_id = 1, status = 'active'`,
      [defaultPasswordHash]
    );
    const [adminUser] = await conn.execute('SELECT id FROM users WHERE email = "admin@acme.com"');
    const adminId = adminUser[0].id;
    if (roleMap.ORG_ADMIN) {
      await conn.execute(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [adminId, roleMap.ORG_ADMIN]
      );
    }

    console.log('6. Seeding Employee User (employee@acme.com)...');
    await conn.execute(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status)
       VALUES (1, 'employee@acme.com', ?, 'Bob', 'Employee', 'active')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), organization_id = 1, status = 'active'`,
      [defaultPasswordHash]
    );
    const [empUser] = await conn.execute('SELECT id FROM users WHERE email = "employee@acme.com"');
    const employeeUserId = empUser[0].id;
    if (roleMap.EMPLOYEE) {
      await conn.execute(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [employeeUserId, roleMap.EMPLOYEE]
      );
    }

    console.log('7. Seeding Bob Employee Profile in employees table...');
    await conn.execute(
      `INSERT INTO employees (
         organization_id, user_id, employee_code, first_name, last_name, email, phone,
         gender, marital_status, blood_group, date_of_birth, joining_date, employment_type,
         department_id, designation_id, status, current_address, permanent_address,
         emergency_contact_name, emergency_contact_phone, office_state, office_city
       ) VALUES (
         1, ?, 'EMP-004', 'Bob', 'Employee', 'employee@acme.com', '9876543210',
         'male', 'single', 'O+', '1995-05-15', '2025-01-15', 'full_time',
         ?, ?, 'active', '123 Tech Park Road, Bengaluru', '123 Tech Park Road, Bengaluru',
         'Alice Employee', '9876543211', 'KA', 'Bengaluru'
       ) ON DUPLICATE KEY UPDATE 
         user_id = VALUES(user_id),
         employee_code = VALUES(employee_code),
         first_name = VALUES(first_name),
         last_name = VALUES(last_name),
         status = 'active'`,
      [employeeUserId, engDeptId, devDesId]
    );

    const [empRecord] = await conn.execute('SELECT id FROM employees WHERE email = "employee@acme.com"');
    const bobEmpId = empRecord[0].id;

    console.log('7b. Seeding second employee (Charlie Worker, EMP-005)...');
    await conn.execute(
      `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status)
       VALUES (1, 'charlie@acme.com', ?, 'Charlie', 'Worker', 'active')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), organization_id = 1, status = 'active'`,
      [defaultPasswordHash]
    );
    const [charlieUser] = await conn.execute('SELECT id FROM users WHERE email = "charlie@acme.com"');
    if (roleMap.EMPLOYEE) {
      await conn.execute(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [charlieUser[0].id, roleMap.EMPLOYEE]
      );
    }
    await conn.execute(
      `INSERT INTO employees (
         organization_id, user_id, employee_code, first_name, last_name, email, phone,
         gender, marital_status, blood_group, date_of_birth, joining_date, employment_type,
         department_id, designation_id, status, current_address, permanent_address, office_state, office_city
       ) VALUES (
         1, ?, 'EMP-005', 'Charlie', 'Worker', 'charlie@acme.com', '9876543222',
         'female', 'married', 'A+', '1996-08-20', '2025-02-01', 'full_time',
         ?, ?, 'active', '456 Tech Park Road, Bengaluru', '456 Tech Park Road, Bengaluru', 'KA', 'Bengaluru'
       ) ON DUPLICATE KEY UPDATE 
         user_id = VALUES(user_id),
         employee_code = VALUES(employee_code),
         department_id = VALUES(department_id),
         designation_id = VALUES(designation_id),
         status = 'active'`,
      [charlieUser[0].id, itDeptId, devDesId]
    );

    console.log('7c. Seeding Rahul (EMP-001), Priya (EMP-115), and Aishwarya test employees...');
    const extraEmployees = [
      ['EMP-001', 'Rahul', 'Verma', 'rahul@acme.com', '9876543233', engDeptId, devDesId],
      ['EMP-115', 'Priya', 'Patel', 'priya@acme.com', '9876543244', salesDeptId, devDesId],
      ['EMP-006', 'Aishwarya', 'Sharma', 'aishwarya.s@acme.com', '9876543255', itDeptId, devDesId],
      ['EMP-007', 'Aishwarya', 'Singnath', 'aishwarya.singnath@acme.com', '9876543266', hrDeptId, devDesId],
      ['AMB-001', 'AmbiguityTest', 'One', 'amb1@example.com', '9876543277', itDeptId, devDesId],
      ['AMB-002', 'AmbiguityTest', 'Two', 'amb2@example.com', '9876543288', salesDeptId, devDesId]
    ];

    for (const [code, fn, ln, em, ph, dep, des] of extraEmployees) {
      await conn.execute(
        `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status)
         VALUES (1, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), status = 'active'`,
        [em, defaultPasswordHash, fn, ln]
      );
      const [uRow] = await conn.execute('SELECT id FROM users WHERE email = ?', [em]);
      const uId = uRow[0].id;
      if (roleMap.EMPLOYEE) {
        await conn.execute('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [uId, roleMap.EMPLOYEE]);
      }
      await conn.execute(
        `INSERT INTO employees (
           organization_id, user_id, employee_code, first_name, last_name, email, phone,
           gender, marital_status, blood_group, date_of_birth, joining_date, employment_type,
           department_id, designation_id, status, current_address, permanent_address, office_state, office_city
         ) VALUES (
           1, ?, ?, ?, ?, ?, ?,
           'male', 'single', 'B+', '1994-03-10', '2025-01-10', 'full_time',
           ?, ?, 'active', 'Tech Park, Bengaluru', 'Tech Park, Bengaluru', 'KA', 'Bengaluru'
         ) ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           employee_code = VALUES(employee_code),
           first_name = VALUES(first_name),
           last_name = VALUES(last_name),
           department_id = VALUES(department_id),
           designation_id = VALUES(designation_id),
           status = 'active'`,
        [uId, code, fn, ln, em, ph, dep, des]
      );
    }

    console.log('8. Seeding Shift & Schedule...');
    await conn.execute(
      `INSERT INTO shifts (organization_id, name, start_time, end_time, break_duration_minutes)
       SELECT 1, 'General Shift', '09:00:00', '18:00:00', 60
       WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE organization_id = 1 AND name = 'General Shift')`
    );
    const [shiftRows] = await conn.execute('SELECT id FROM shifts WHERE organization_id = 1 AND name = "General Shift" LIMIT 1');
    if (shiftRows.length > 0) {
      await conn.execute(
        `INSERT INTO work_schedules (organization_id, employee_id, shift_id, effective_from)
         SELECT 1, ?, ?, '2025-01-01'
         WHERE NOT EXISTS (SELECT 1 FROM work_schedules WHERE employee_id = ?)`,
        [bobEmpId, shiftRows[0].id, bobEmpId]
      );
    }

    console.log('9. Seeding Leave Types & 2026 Balances...');
    const leaveTypes = [
      ['Casual Leave', 'Paid time off for personal matters', '#3b82f6', 12],
      ['Sick Leave', 'Time off for illness or medical appointments', '#10b981', 10],
      ['Earned Leave', 'Annual vacation leave', '#f59e0b', 15]
    ];

    for (const [ltName, ltDesc, ltColor, yearly] of leaveTypes) {
      await conn.execute(
        `INSERT INTO leave_types (organization_id, name, description, color_code, is_paid)
         SELECT 1, ?, ?, ?, TRUE
         WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE organization_id = 1 AND name = ?)`,
        [ltName, ltDesc, ltColor, ltName]
      );

      const [ltRow] = await conn.execute('SELECT id FROM leave_types WHERE organization_id = 1 AND name = ?', [ltName]);
      if (ltRow.length > 0) {
        const ltId = ltRow[0].id;
        await conn.execute(
          `INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year, allocated, used, carried_forward)
           SELECT 1, ?, ?, 2026, ?, 0.0, 0.0
           WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = 2026)`,
          [bobEmpId, ltId, yearly, bobEmpId, ltId]
        );
      }
    }

    console.log('10. Seeding Holidays for 2026...');
    const holidays = [
      ['Gandhi Jayanti', '2026-10-02', 'National Holiday'],
      ['Diwali', '2026-11-08', 'Festival of Lights'],
      ['Christmas', '2026-12-25', 'Christmas Day']
    ];
    for (const [hName, hDate, hDesc] of holidays) {
      await conn.execute(
        `INSERT INTO holidays (organization_id, name, holiday_date, description, is_optional)
         SELECT 1, ?, ?, ?, FALSE
         WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE organization_id = 1 AND holiday_date = ?)`,
        [hName, hDate, hDesc, hDate]
      );
    }

    console.log('11. Seeding Welcome Announcement...');
    await conn.execute(
      `INSERT INTO announcements (organization_id, title, content, created_by, status)
       SELECT 1, 'Welcome to JMK HRMS Portal', 'Welcome to the JMK HRMS platform! Track attendance, manage leaves, view payslips, and access AI HR intelligence seamlessly.', ?, 'published'
       WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE organization_id = 1 AND title = 'Welcome to JMK HRMS Portal')`,
      [adminId]
    );

    console.log('\n============================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('============================================================');
    console.log('Available Test Credentials:');
    console.log('1. Super Admin:  superadmin@hrms.com  / password123');
    console.log('2. Org Admin:    admin@acme.com       / password123');
    console.log('3. Employee:     employee@acme.com    / password123');
    console.log('                 (or Employee Code:   EMP-004)');
    console.log('============================================================\n');

  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seedDatabase();
