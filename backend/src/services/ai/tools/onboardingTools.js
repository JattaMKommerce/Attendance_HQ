/**
 * Onboarding Backend Tools for AI Assistant
 * 
 * Supports:
 * - Multi-step Onboarding Workflow execution with granular step reporting
 * - Onboarding status queries for self ("Show my onboarding status")
 */

const db = require('../../../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Get onboarding status for self (employee)
 */
async function getMyOnboardingStatus(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const [onboarding] = await db.query(
    'SELECT * FROM employee_onboarding WHERE employee_id = ? AND organization_id = ?',
    [userContext.employee_id, organizationId]
  );

  if (onboarding.length === 0) {
    return {
      success: true,
      message: 'You have no active onboarding process recorded. Your profile is fully onboarded.'
    };
  }

  const record = onboarding[0];
  const [tasks] = await db.query(
    'SELECT * FROM employee_onboarding_tasks WHERE employee_onboarding_id = ? ORDER BY created_at ASC',
    [record.id]
  );

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 100;

  const taskList = tasks.map(t => {
    const icon = t.status === 'completed' ? '✓' : '○';
    return `${icon} ${t.title} (${t.status.toUpperCase()})`;
  }).join('\n');

  const message = `**Your Onboarding Status**: ${record.status.toUpperCase()} (${percent}% Complete - ${completed}/${total} Tasks, ${completed === total ? 'fully onboarded' : 'onboarding in progress'})

${taskList}`;


  return {
    success: true,
    message,
    data: { onboarding: record, tasks, progress: percent }
  };
}

/**
 * Execute multi-step onboarding workflow
 * 
 * Steps:
 * 1. Create employee profile
 * 2. Assign employee ID
 * 3. Assign designation
 * 4. Assign department
 * 5. Create onboarding record
 * 6. Create onboarding checklist & tasks
 * 7. Identify and record required documents
 * 8. Configure account access & activation token
 */
async function executeOnboardWorkflow(organizationId, params, userContext) {
  const firstName = params.firstName || (params.name ? params.name.split(' ')[0] : 'Employee');
  const lastName = params.lastName || (params.name ? params.name.split(' ').slice(1).join(' ') : '');
  const email = params.email || `${firstName.toLowerCase()}.${lastName ? lastName.toLowerCase() : 'user'}.${Date.now().toString().slice(-4)}@example.com`;
  const joiningDate = params.joiningDate || new Date().toISOString().split('T')[0];

  let departmentId = params.departmentId || params.department_id || null;
  let departmentName = params.departmentName || params.department || 'Engineering';
  let designationId = params.designationId || params.designation_id || null;
  let designationName = params.designationName || params.designation || 'Software Engineer';

  const steps = [
    { key: 'user_account', label: 'User account created', status: 'pending' },
    { key: 'profile', label: 'Employee profile created', status: 'pending' },
    { key: 'emp_id', label: 'Employee ID assigned', status: 'pending' },
    { key: 'dept', label: `Department assigned (${departmentName})`, status: 'pending' },
    { key: 'desig', label: `Designation assigned (${designationName})`, status: 'pending' },
    { key: 'leave_balance', label: 'Leave balance initialized', status: 'pending' },
    { key: 'checklist', label: 'Onboarding checklist created', status: 'pending' }
  ];

  const connection = await db.getConnection();
  let employeeId = null;
  let employeeCode = null;
  let userId = null;

  try {
    await connection.beginTransaction();

    // 1. Resolve or verify department
    if (!departmentId) {
      const [depts] = await connection.query(
        'SELECT id, name FROM departments WHERE organization_id = ? AND LOWER(name) = LOWER(?)',
        [organizationId, departmentName]
      );
      if (depts.length > 0) {
        departmentId = depts[0].id;
        departmentName = depts[0].name;
      } else {
        const [newDept] = await connection.query(
          'INSERT INTO departments (organization_id, name, description) VALUES (?, ?, "Created during onboarding")',
          [organizationId, departmentName]
        );
        departmentId = newDept.insertId;
      }
    }
    steps[3].label = `Department assigned (${departmentName})`;

    // 2. Resolve or verify designation
    if (!designationId) {
      const [desigs] = await connection.query(
        'SELECT id, name FROM designations WHERE organization_id = ? AND (LOWER(name) = LOWER(?) OR LOWER(name) LIKE ?)',
        [organizationId, designationName, `%${designationName}%`]
      );
      if (desigs.length > 0) {
        designationId = desigs[0].id;
        designationName = desigs[0].name;
      } else {
        const [newDesig] = await connection.query(
          'INSERT INTO designations (organization_id, name, level) VALUES (?, ?, 1)',
          [organizationId, designationName]
        );
        designationId = newDesig.insertId;
      }
    }
    steps[4].label = `Designation assigned (${designationName})`;

    // 3. Generate Employee ID / Code
    const [latest] = await connection.query(
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
      const [cnt] = await connection.query('SELECT COUNT(*) as total FROM employees WHERE organization_id = ?', [organizationId]);
      maxNum = cnt[0].total;
    }
    employeeCode = `EMP-${String(maxNum + 1).padStart(3, '0')}`;

    // 4. Create User Record
    const placeholderPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(placeholderPassword, 10);
    const [userRes] = await connection.query(
      'INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, "inactive")',
      [organizationId, email, passwordHash, firstName, lastName]
    );
    userId = userRes.insertId;

    // Assign EMPLOYEE role
    const [roles] = await connection.query('SELECT id FROM roles WHERE name = "EMPLOYEE" LIMIT 1');
    if (roles.length > 0) {
      await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roles[0].id]);
    }
    steps[0].status = 'success';

    // 5. Create Employee Profile
    const [empRes] = await connection.query(
      `INSERT INTO employees (
        organization_id, user_id, employee_code, first_name, last_name, email,
        joining_date, employment_type, department_id, designation_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'full_time', ?, ?, 'active')`,
      [organizationId, userId, employeeCode, firstName, lastName, email, joiningDate, departmentId, designationId]
    );
    employeeId = empRes.insertId;
    steps[1].status = 'success';
    steps[2].status = 'success';
    steps[2].label = `Employee ID (${employeeCode}) assigned`;
    steps[3].status = 'success';
    steps[4].status = 'success';

    // 6. Initialize Default Leave Balance for current year
    const currentYear = new Date().getFullYear();
    const [leaveTypes] = await connection.query(
      'SELECT id FROM leave_types WHERE organization_id = ?',
      [organizationId]
    );
    if (leaveTypes.length > 0) {
      for (const lt of leaveTypes) {
        await connection.query(
          `INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year, allocated, used, carried_forward)
           VALUES (?, ?, ?, ?, 12.0, 0.0, 0.0)
           ON DUPLICATE KEY UPDATE allocated = allocated`,
          [organizationId, employeeId, lt.id, currentYear]
        );
      }
    }
    steps[5].status = 'success';

    // 7. Create Onboarding Record & Tasks
    const [onbRes] = await connection.query(
      'INSERT INTO employee_onboarding (organization_id, employee_id, status, started_at) VALUES (?, ?, "in_progress", NOW())',
      [organizationId, employeeId]
    );
    const onboardingId = onbRes.insertId;

    const standardTasks = [
      { title: 'Submit Identification Proof (Aadhaar / Passport)', type: 'document_upload' },
      { title: 'Sign Employment Agreement & NDA', type: 'document_upload' },
      { title: 'Set up Workstation & Development Tools', type: 'it_setup' },
      { title: 'Attend HR Orientation & Team Introduction', type: 'manager_meeting' }
    ];

    for (const t of standardTasks) {
      await connection.query(
        `INSERT INTO employee_onboarding_tasks (
          organization_id, employee_onboarding_id, title, task_type, status, due_date
        ) VALUES (?, ?, ?, ?, 'pending', DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY))`,
        [organizationId, onboardingId, t.title, t.type]
      );
    }
    steps[6].status = 'success';

    // 8. Documents & Activation Token
    const requiredDocTypes = ['identity', 'contract'];
    for (const dt of requiredDocTypes) {
      await connection.query(
        `INSERT INTO documents (
          organization_id, employee_id, title, document_type, file_url, status
        ) VALUES (?, ?, ?, ?, '/uploads/documents/placeholder.pdf', 'archived')`,
        [organizationId, employeeId, `Required: ${dt.toUpperCase()}`, dt]
      );
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await connection.query(
      'INSERT INTO account_activations (organization_id, user_id, employee_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
      [organizationId, userId, employeeId, tokenHash, expiresAt]
    );

    await connection.commit();

    const summaryText = steps.map(s => `✓ ${s.label}`).join('\n');
    const fullName = `${firstName} ${lastName}`.trim();
    const message = `**${fullName}** has been onboarded successfully.\n\n${summaryText}`;

    return {
      success: true,
      message,
      data: {
        employee_id: employeeId,
        employee_code: employeeCode,
        name: fullName,
        department: departmentName,
        designation: designationName,
        email: email,
        steps: steps
      }
    };
  } catch (error) {
    await connection.rollback();

    // Determine which step failed
    const completedSteps = steps.filter(s => s.status === 'success');
    const failedStep = steps.find(s => s.status === 'pending');
    if (failedStep) failedStep.status = 'failed';

    const checklistText = steps.map(s => {
      if (s.status === 'success') return `✓ ${s.label}`;
      if (s.status === 'failed') return `✗ ${s.label} (Failed: ${error.message})`;
      return `○ ${s.label}`;
    }).join('\n');

    return {
      success: false,
      message: `Onboarding was partially completed.\n\n${checklistText}`,
      error: error.message,
      data: { steps }
    };
  } finally {
    connection.release();
  }
}

module.exports = {
  getMyOnboardingStatus,
  executeOnboardWorkflow
};
