/**
 * Document Backend Tools for AI Assistant
 */

const db = require('../../../config/db');

/**
 * Get documents for authenticated employee
 */
async function getMyDocuments(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  const [docs] = await db.query(
    `SELECT id, title, document_type, file_url, status, created_at
     FROM documents
     WHERE (employee_id = ? OR employee_id IS NULL) AND organization_id = ?
     ORDER BY created_at DESC`,
    [userContext.employee_id, organizationId]
  );

  if (docs.length === 0) {
    return {
      success: true,
      message: 'You have no documents uploaded in your employee profile.',
      data: []
    };
  }

  const list = docs
    .map(d => `• **${d.title}** (${d.document_type || 'General'}) - Uploaded: ${new Date(d.created_at).toISOString().split('T')[0]}`)
    .join('\n');

  return {
    success: true,
    message: `You have **${docs.length}** document(s) on file:\n\n${list}`,
    data: docs
  };
}

/**
 * Show employees whose documents are missing (Admin)
 */
async function getMissingDocuments(organizationId) {
  // Query all active employees and count their documents in documents table
  const [employeesWithDocs] = await db.query(
    `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.resume_url,
            d.name as department_name,
            COUNT(doc.id) as uploaded_doc_count
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN documents doc ON e.id = doc.employee_id AND doc.status = 'active'
     WHERE e.organization_id = ? AND e.status = 'active'
     GROUP BY e.id, e.employee_code, e.first_name, e.last_name, e.resume_url, d.name`,
    [organizationId]
  );

  const missing = employeesWithDocs.filter(e => e.uploaded_doc_count === 0 && !e.resume_url);

  if (missing.length === 0) {
    return {
      success: true,
      message: 'All active employees have at least one verified document or resume on file.',
      data: []
    };
  }

  const list = missing
    .map(e => `• **${e.first_name} ${e.last_name}** (${e.employee_code}) - Dept: ${e.department_name || 'Unassigned'}`)
    .join('\n');

  return {
    success: true,
    message: `Found **${missing.length}** employee(s) with missing documents or resumes:\n\n${list}`,
    data: missing
  };
}

module.exports = {
  getMyDocuments,
  getMissingDocuments
};
