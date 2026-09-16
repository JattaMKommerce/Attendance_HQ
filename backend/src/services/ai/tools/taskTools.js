/**
 * Task Backend Tools for AI Assistant
 */

const db = require('../../../config/db');

/**
 * Get assigned and onboarding tasks for authenticated employee
 */
async function getMyTasks(organizationId, userContext) {
  if (!userContext.employee_id) {
    return { success: false, message: 'No employee record is linked to your account.' };
  }

  // 1. Check general tasks
  const [generalTasks] = await db.query(
    `SELECT t.id, t.title, t.description, t.due_date, t.status
     FROM tasks t
     JOIN task_assignments ta ON t.id = ta.task_id
     WHERE ta.employee_id = ? AND t.organization_id = ?
     ORDER BY t.created_at DESC`,
    [userContext.employee_id, organizationId]
  );

  // 2. Check onboarding tasks
  const [onboardingTasks] = await db.query(
    `SELECT eot.id, eot.title, eot.description, eot.due_date, eot.status, eot.task_type
     FROM employee_onboarding_tasks eot
     JOIN employee_onboarding eo ON eot.employee_onboarding_id = eo.id
     WHERE eo.employee_id = ? AND eo.organization_id = ?
     ORDER BY eot.created_at ASC`,
    [userContext.employee_id, organizationId]
  );

  const allTasks = [...generalTasks, ...onboardingTasks];
  const pending = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  if (allTasks.length === 0) {
    return {
      success: true,
      message: 'You have no assigned tasks or onboarding checklists at this time.',
      data: []
    };
  }

  const list = allTasks
    .map(t => {
      const icon = t.status === 'completed' ? '✓' : '○';
      const due = t.due_date ? ` (Due: ${new Date(t.due_date).toISOString().split('T')[0]})` : '';
      return `${icon} **${t.title}** - ${t.status.toUpperCase()}${due}`;
    })
    .join('\n');

  return {
    success: true,
    message: `You have **${pending.length} pending** task(s) out of ${allTasks.length} total:\n\n${list}`,
    data: allTasks
  };
}

module.exports = {
  getMyTasks
};
