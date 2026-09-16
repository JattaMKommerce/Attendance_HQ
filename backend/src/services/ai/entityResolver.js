/**
 * Entity Resolver for HRMS AI Command Assistant (Phase 2)
 * 
 * Resolves:
 * - "my" / "me" -> Authenticated employee
 * - Employee by ID, Employee Code (e.g. "EMP-102", "EMP102"), or Name ("Rahul", "Priya")
 * - Department-qualified lookups (e.g. "Rahul from IT", "Rahul in Engineering")
 * - Disambiguation handling when multiple employees share a name without arbitrary guessing
 * - Department resolution (exact & partial matching)
 * - Designation resolution (exact, partial, & common aliases)
 * - Leave Type resolution ("Casual Leave", "Sick Leave", "Earned Leave", etc.)
 */

const db = require('../../config/db');

/**
 * Resolve employee reference from text or explicit parameter.
 * 
 * @param {number} organizationId
 * @param {string|number} nameOrCode
 * @param {object} userContext - req.user ({ id, employee_id, organization_id, roles })
 * @returns {Promise<{ resolved: boolean, employee?: object, matches?: Array, isAmbiguous?: boolean, reason?: string }>}
 */
async function resolveEmployee(organizationId, nameOrCode, userContext) {
  // 1. Check if referring to self
  if (!nameOrCode || typeof nameOrCode !== 'string' || ['my', 'me', 'myself', 'self'].includes(nameOrCode.toLowerCase().trim())) {
    if (userContext.employee_id) {
      const [self] = await db.query(
        `SELECT e.*, d.name as department_name, des.name as designation_name
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         LEFT JOIN designations des ON e.designation_id = des.id
         WHERE e.id = ? AND e.organization_id = ?`,
        [userContext.employee_id, organizationId]
      );
      if (self.length > 0) {
        return { resolved: true, employee: self[0] };
      }
    }
    return { resolved: false, reason: 'Employee profile not linked to user account.' };
  }

  const clean = String(nameOrCode).trim();

  // Check for department qualification: "Rahul from IT", "Rahul in Engineering", "Rahul of Sales"
  const deptQualifiedMatch = clean.match(/^(.+?)\s+(?:from|in|of)\s+([a-zA-Z\s]+?)(?:\s+department)?$/i);
  let targetName = clean;
  let targetDeptId = null;

  if (deptQualifiedMatch) {
    targetName = deptQualifiedMatch[1].trim();
    const deptSearch = deptQualifiedMatch[2].trim();
    const [depts] = await db.query(
      `SELECT id, name FROM departments 
       WHERE organization_id = ? AND (LOWER(name) = LOWER(?) OR LOWER(name) LIKE ?)
       ORDER BY (LOWER(name) = LOWER(?)) DESC LIMIT 1`,
      [organizationId, deptSearch, `%${deptSearch}%`, deptSearch]
    );
    if (depts.length > 0) {
      targetDeptId = depts[0].id;
    }
  }

  // 2. Direct ID lookup (numeric)
  if (/^\d+$/.test(targetName)) {
    const [byId] = await db.query(
      `SELECT e.*, d.name as department_name, des.name as designation_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE e.id = ? AND e.organization_id = ?`,
      [parseInt(targetName, 10), organizationId]
    );
    if (byId.length > 0) {
      return { resolved: true, employee: byId[0] };
    }
  }

  // 3. Employee Code lookup (e.g. "EMP-102", "EMP102")
  const codeNormalized = targetName.toUpperCase().replace(/\s+/g, '');
  const codeWithHyphen = codeNormalized.startsWith('EMP') && !codeNormalized.includes('-')
    ? `EMP-${codeNormalized.slice(3)}`
    : codeNormalized;

  const [byCode] = await db.query(
    `SELECT e.*, d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? AND (
       UPPER(e.employee_code) = ? OR 
       UPPER(e.employee_code) = ? OR
       REPLACE(UPPER(e.employee_code), '-', '') = ?
     )`,
    [organizationId, codeNormalized, codeWithHyphen, codeNormalized]
  );

  if (byCode.length === 1) {
    return { resolved: true, employee: byCode[0] };
  }

  // 4. Department-qualified lookup if department was extracted
  if (targetDeptId) {
    const [byDeptAndName] = await db.query(
      `SELECT e.*, d.name as department_name, des.name as designation_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE e.organization_id = ? AND e.department_id = ? AND (
         LOWER(e.first_name) = LOWER(?) OR 
         LOWER(CONCAT(e.first_name, ' ', e.last_name)) = LOWER(?) OR
         LOWER(e.first_name) LIKE LOWER(?)
       )`,
      [organizationId, targetDeptId, targetName, targetName, `%${targetName}%`]
    );

    if (byDeptAndName.length === 1) {
      return { resolved: true, employee: byDeptAndName[0] };
    } else if (byDeptAndName.length > 1) {
      return formatAmbiguousResponse(byDeptAndName, clean);
    }
  }

  // 5. Exact Name lookup (first name + last name)
  const [byExactName] = await db.query(
    `SELECT e.*, d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? AND LOWER(CONCAT(e.first_name, ' ', e.last_name)) = LOWER(?)`,
    [organizationId, targetName]
  );

  if (byExactName.length === 1) {
    return { resolved: true, employee: byExactName[0] };
  } else if (byExactName.length > 1) {
    return formatAmbiguousResponse(byExactName, clean);
  }

  // 6. Partial Name lookup (first_name or last_name match)
  const [byPartial] = await db.query(
    `SELECT e.*, d.name as department_name, des.name as designation_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? AND (
       LOWER(e.first_name) = LOWER(?) OR 
       LOWER(e.last_name) = LOWER(?) OR
       LOWER(e.first_name) LIKE LOWER(?) OR
       LOWER(CONCAT(e.first_name, ' ', e.last_name)) LIKE LOWER(?)
     )`,
    [organizationId, targetName, targetName, `%${targetName}%`, `%${targetName}%`]
  );

  if (byPartial.length === 1) {
    return { resolved: true, employee: byPartial[0] };
  } else if (byPartial.length > 1) {
    return formatAmbiguousResponse(byPartial, clean);
  }

  return {
    resolved: false,
    reason: `I couldn't find any employee matching "${clean}".`
  };
}

/**
 * Format ambiguous employee matches for user selection without guessing.
 */
function formatAmbiguousResponse(matches, search) {
  const safeMatches = matches.map(m => ({
    id: m.id,
    name: `${m.first_name} ${m.last_name}`.trim(),
    employee_code: m.employee_code,
    department: m.department_name || 'Unassigned',
    designation: m.designation_name || 'Unassigned',
    status: m.status
  }));

  const optionsList = safeMatches
    .map((m, idx) => `${idx + 1}. **${m.name}** (${m.employee_code}) - Dept: ${m.department}, Role: ${m.designation}`)
    .join('\n');

  return {
    resolved: false,
    reason: `Multiple employees named "${search}" were found. Please specify by Employee ID or full name:\n\n${optionsList}`,
    isAmbiguous: true,
    matches: safeMatches
  };
}

/**
 * Resolve department name to database department record.
 * 
 * @param {number} organizationId
 * @param {string} departmentName
 * @returns {Promise<{ resolved: boolean, department?: object, reason?: string }>}
 */
async function resolveDepartment(organizationId, departmentName) {
  if (!departmentName) {
    return { resolved: false, reason: 'Department name is missing.' };
  }

  const clean = departmentName.trim();

  const [exact] = await db.query(
    'SELECT * FROM departments WHERE organization_id = ? AND deleted_at IS NULL AND LOWER(name) = LOWER(?)',
    [organizationId, clean]
  );

  if (exact.length > 0) {
    return { resolved: true, department: exact[0] };
  }

  // Partial match
  const [partial] = await db.query(
    'SELECT * FROM departments WHERE organization_id = ? AND deleted_at IS NULL AND LOWER(name) LIKE LOWER(?)',
    [organizationId, `%${clean}%`]
  );

  if (partial.length === 1) {
    return { resolved: true, department: partial[0] };
  }

  if (partial.length > 1) {
    const deptList = partial.map(d => `"${d.name}"`).join(', ');
    return {
      resolved: false,
      isAmbiguous: true,
      reason: `Multiple departments matching "${clean}" were found: ${deptList}. Please clarify which department you mean.`,
      matches: partial
    };
  }

  return {
    resolved: false,
    reason: `Department "${departmentName}" does not exist in your organization.`
  };
}

/**
 * Resolve designation name to database designation record.
 * 
 * @param {number} organizationId
 * @param {string} designationName
 * @returns {Promise<{ resolved: boolean, designation?: object, reason?: string }>}
 */
async function resolveDesignation(organizationId, designationName) {
  if (!designationName) {
    return { resolved: false, reason: 'Designation name is missing.' };
  }

  const clean = designationName.trim();

  const [exact] = await db.query(
    'SELECT * FROM designations WHERE organization_id = ? AND LOWER(name) = LOWER(?)',
    [organizationId, clean]
  );

  if (exact.length > 0) {
    return { resolved: true, designation: exact[0] };
  }

  // Common aliases (e.g. Software Engineer -> Developer)
  let aliasSearch = clean;
  if (clean.toLowerCase().includes('software engineer') || clean.toLowerCase().includes('programmer')) {
    aliasSearch = 'Developer';
  }

  const [partial] = await db.query(
    'SELECT * FROM designations WHERE organization_id = ? AND LOWER(name) LIKE LOWER(?)',
    [organizationId, `%${aliasSearch}%`]
  );

  if (partial.length > 0) {
    return { resolved: true, designation: partial[0] };
  }

  return {
    resolved: false,
    reason: `Designation "${designationName}" not found.`
  };
}

/**
 * Resolve leave type from name or alias.
 * 
 * @param {number} organizationId
 * @param {string} leaveTypeName
 * @returns {Promise<{ resolved: boolean, leaveType?: object, reason?: string }>}
 */
async function resolveLeaveType(organizationId, leaveTypeName) {
  if (!leaveTypeName) {
    return { resolved: false, reason: 'Leave type is missing.' };
  }

  const clean = String(leaveTypeName).trim().toLowerCase();

  // Alias normalizer
  let alias = clean;
  if (clean.includes('casual')) alias = 'casual';
  else if (clean.includes('sick') || clean.includes('medical')) alias = 'sick';
  else if (clean.includes('earned') || clean.includes('annual') || clean.includes('vacation')) alias = 'earned';

  const [exact] = await db.query(
    'SELECT * FROM leave_types WHERE organization_id = ? AND LOWER(name) = ?',
    [organizationId, clean]
  );
  if (exact.length > 0) return { resolved: true, leaveType: exact[0] };

  const [partial] = await db.query(
    'SELECT * FROM leave_types WHERE organization_id = ? AND (LOWER(name) LIKE ? OR LOWER(name) LIKE ?)',
    [organizationId, `%${clean}%`, `%${alias}%`]
  );
  if (partial.length > 0) return { resolved: true, leaveType: partial[0] };

  return {
    resolved: false,
    reason: `Leave type "${leaveTypeName}" not found in your organization.`
  };
}

module.exports = {
  resolveEmployee,
  resolveDepartment,
  resolveDesignation,
  resolveLeaveType
};
