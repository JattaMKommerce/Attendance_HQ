/**
 * Insight Backend Tools for AI Assistant (Phase 3C)
 *
 * Enforces strict authorization:
 * - Admin/HR users can see organizational insights.
 * - Employees must NEVER receive organization-wide insights (403).
 * - Employee-specific insights must be strictly self-scoped.
 * - organization_id is always derived from authenticated server context.
 * - AI explanations are strictly grounded in verified database facts.
 */

const db = require('../../../config/db');
const insightDetectionService = require('../insightDetectionService');

/**
 * Check if the authenticated user has Admin or HR privileges
 */
function isAuthorizedAdminOrHr(userContext) {
  if (!userContext || !userContext.roles) return false;
  const adminRoles = [
    'super_admin', 'org_admin', 'hr_admin', 'manager', 'admin', 'hr',
    'SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN', 'MANAGER', 'ADMIN', 'HR'
  ];
  const hasRole = userContext.roles.some(r => adminRoles.includes(r));
  const hasPerm = userContext.permissions && (
    userContext.permissions.includes('analytics:view') ||
    userContext.permissions.includes('employee:view_all') ||
    userContext.permissions.includes('attendance:view_all')
  );
  return Boolean(hasRole || hasPerm);
}

/**
 * Fetch insights with deterministic filtering and strict RBAC
 */
async function getInsights(organizationId, userContext, filters = {}) {
  const isAdminOrHr = isAuthorizedAdminOrHr(userContext);

  // If user is employee only:
  // - They cannot request organization-wide insights
  // - They can only view self-scoped insights (target_entity_type = 'employee' AND target_entity_id = employee_id)
  if (!isAdminOrHr) {
    if (filters.scope === 'organization' || !userContext.employee_id) {
      return {
        success: false,
        status: 403,
        message: 'Employees are not authorized to view organizational insights.'
      };
    }
  }

  const conditions = ['organization_id = ?'];
  const params = [organizationId];

  // RBAC Scoping
  if (!isAdminOrHr) {
    conditions.push("target_entity_type = 'employee' AND target_entity_id = ?");
    params.push(userContext.employee_id);
  }

  // Filter: status
  if (filters.status) {
    if (filters.status === 'active') {
      conditions.push("status != 'dismissed'");
    } else {
      conditions.push('status = ?');
      params.push(filters.status);
    }
  } else {
    // By default, exclude dismissed insights unless explicitly requested
    conditions.push("status != 'dismissed'");
  }

  // Filter: severity
  if (filters.severity && ['CRITICAL', 'WARNING', 'INFO'].includes(filters.severity.toUpperCase())) {
    conditions.push('severity = ?');
    params.push(filters.severity.toUpperCase());
  }

  // Filter: type
  if (filters.type) {
    conditions.push('insight_type = ?');
    params.push(filters.type);
  }

  // Filter: department_id
  if (filters.department_id) {
    conditions.push('department_id = ?');
    params.push(parseInt(filters.department_id, 10));
  }

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 50, 1), 100);
  const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

  const whereClause = conditions.join(' AND ');

  const [rows] = await db.query(
    `SELECT id, organization_id, insight_type AS type, severity, 
            title, summary, detailed_explanation, 
            target_entity_type AS entity_type, target_entity_id AS entity_id, 
            department_id, supporting_data AS source_data, 
            status, detected_at, read_at, dismissed_at
     FROM ai_insights
     WHERE ${whereClause}
     ORDER BY 
       CASE severity 
         WHEN 'CRITICAL' THEN 1 
         WHEN 'WARNING' THEN 2 
         WHEN 'INFO' THEN 3 
         ELSE 4 
       END ASC,
       detected_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // Parse supporting_data if returned as string
  const formattedRows = rows.map(r => ({
    ...r,
    source_data: typeof r.source_data === 'string' ? JSON.parse(r.source_data) : r.source_data
  }));

  // Fetch count totals
  const [countRows] = await db.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
       SUM(CASE WHEN severity = 'CRITICAL' AND status != 'dismissed' THEN 1 ELSE 0 END) as critical,
       SUM(CASE WHEN severity = 'WARNING' AND status != 'dismissed' THEN 1 ELSE 0 END) as warning,
       SUM(CASE WHEN severity = 'INFO' AND status != 'dismissed' THEN 1 ELSE 0 END) as info
     FROM ai_insights
     WHERE ${whereClause}`,
    params
  );

  const stats = countRows[0] || {};

  return {
    success: true,
    data: formattedRows,
    meta: {
      total: Number(stats.total) || 0,
      unread: Number(stats.unread) || 0,
      critical: Number(stats.critical) || 0,
      warning: Number(stats.warning) || 0,
      info: Number(stats.info) || 0,
      limit,
      offset
    }
  };
}

/**
 * Get aggregated insight summary stats
 */
async function getInsightSummary(organizationId, userContext) {
  const isAdminOrHr = isAuthorizedAdminOrHr(userContext);

  if (!isAdminOrHr && !userContext.employee_id) {
    return {
      success: false,
      status: 403,
      message: 'Employees are not authorized to view organizational insights.'
    };
  }

  const conditions = ['organization_id = ?'];
  const params = [organizationId];

  if (!isAdminOrHr) {
    conditions.push("target_entity_type = 'employee' AND target_entity_id = ?");
    params.push(userContext.employee_id);
  }

  const whereClause = conditions.join(' AND ');

  const [rows] = await db.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread,
       SUM(CASE WHEN severity = 'CRITICAL' AND status != 'dismissed' THEN 1 ELSE 0 END) as critical,
       SUM(CASE WHEN severity = 'WARNING' AND status != 'dismissed' THEN 1 ELSE 0 END) as warning,
       SUM(CASE WHEN severity = 'INFO' AND status != 'dismissed' THEN 1 ELSE 0 END) as info
     FROM ai_insights
     WHERE ${whereClause}`,
    params
  );

  const s = rows[0] || {};
  return {
    success: true,
    data: {
      total: Number(s.total) || 0,
      unread: Number(s.unread) || 0,
      critical: Number(s.critical) || 0,
      warning: Number(s.warning) || 0,
      info: Number(s.info) || 0
    }
  };
}

/**
 * Mark insight as read
 */
async function markInsightRead(organizationId, userContext, insightId) {
  const isAdminOrHr = isAuthorizedAdminOrHr(userContext);

  const conditions = ['id = ?', 'organization_id = ?'];
  const params = [insightId, organizationId];

  if (!isAdminOrHr) {
    conditions.push("target_entity_type = 'employee' AND target_entity_id = ?");
    params.push(userContext.employee_id);
  }

  const [result] = await db.query(
    `UPDATE ai_insights 
     SET status = 'read', read_at = NOW() 
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (result.affectedRows === 0) {
    return {
      success: false,
      status: 404,
      message: 'Insight not found or access denied.'
    };
  }

  return {
    success: true,
    message: 'Insight marked as read.'
  };
}

/**
 * Mark insight as dismissed
 */
async function dismissInsight(organizationId, userContext, insightId) {
  const isAdminOrHr = isAuthorizedAdminOrHr(userContext);

  const conditions = ['id = ?', 'organization_id = ?'];
  const params = [insightId, organizationId];

  if (!isAdminOrHr) {
    conditions.push("target_entity_type = 'employee' AND target_entity_id = ?");
    params.push(userContext.employee_id);
  }

  const [result] = await db.query(
    `UPDATE ai_insights 
     SET status = 'dismissed', dismissed_at = NOW() 
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (result.affectedRows === 0) {
    return {
      success: false,
      status: 404,
      message: 'Insight not found or access denied.'
    };
  }

  return {
    success: true,
    message: 'Insight dismissed.'
  };
}

/**
 * Formulate a conversational natural language explanation grounded purely in verified facts.
 * "The AI must not invent additional facts."
 */
async function explainInsight(organizationId, userContext, insightId) {
  const isAdminOrHr = isAuthorizedAdminOrHr(userContext);

  const conditions = ['id = ?', 'organization_id = ?'];
  const params = [insightId, organizationId];

  if (!isAdminOrHr) {
    conditions.push("target_entity_type = 'employee' AND target_entity_id = ?");
    params.push(userContext.employee_id);
  }

  const [rows] = await db.query(
    `SELECT id, organization_id, insight_type, severity, 
            title, summary, detailed_explanation, supporting_data, 
            detected_at, status
     FROM ai_insights
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (rows.length === 0) {
    return {
      success: false,
      status: 404,
      message: 'Insight not found or access denied.'
    };
  }

  const item = rows[0];
  const sourceData = typeof item.supporting_data === 'string'
    ? JSON.parse(item.supporting_data)
    : (item.supporting_data || {});

  // Deterministically synthesize the AI explanation strictly grounded in source data
  let explanation = '';
  switch (item.insight_type) {
    case 'CONSECUTIVE_ABSENCE':
      explanation = `${sourceData.employee_name || 'The employee'} has been absent for ${sourceData.consecutive_days} consecutive working days from ${sourceData.start_date} to ${sourceData.end_date}. This triggers a ${item.severity} alert under organizational attendance policy.`;
      break;

    case 'HIGH_ABSENTEEISM':
      explanation = `The ${sourceData.department_name} department recorded an absenteeism rate of ${sourceData.absenteeism_rate}% during ${sourceData.period}, with ${sourceData.absent_count} recorded absences out of ${sourceData.total_records} shifts.`;
      break;

    case 'LEAVE_UTILIZATION':
      explanation = `${sourceData.entity_name || sourceData.employee_name || sourceData.department_name} has consumed ${sourceData.utilization_rate}% of available leave for ${sourceData.year} (${sourceData.used_days || sourceData.used} days taken out of ${sourceData.allocated_days || sourceData.allocated} allocated).`;
      break;

    case 'ONBOARDING_OVERDUE':
      explanation = `Onboarding task "${sourceData.task_title}" for ${sourceData.employee_name} is overdue by ${sourceData.days_overdue} day(s) since its due date of ${sourceData.due_date}.`;
      break;

    case 'MISSING_DOCUMENTS':
      explanation = `${sourceData.employee_name} joined on ${sourceData.joining_date} (${sourceData.days_since_joining} days ago) and currently has no verified identity documents or resume uploaded.`;
      break;

    case 'ATTENDANCE_TREND':
      explanation = `Department ${sourceData.department_name} experienced a ${sourceData.drop_percentage}% decline in attendance between consecutive 7-day periods (falling from ${sourceData.previous_rate}% to ${sourceData.current_rate}%).`;
      break;

    case 'NEW_JOINERS':
      explanation = `${sourceData.count} new team member(s) joined this week: ${(sourceData.employees || []).map(e => e.name).join(', ')}.`;
      break;

    case 'HEADCOUNT_CHANGE':
      const sign = sourceData.net_change > 0 ? '+' : '';
      explanation = `${sourceData.department_name} headcount shifted by ${sign}${sourceData.net_change} over the past 30 days (+${sourceData.recent_joins} hires, -${sourceData.recent_exits} exits, current active headcount: ${sourceData.current_headcount}).`;
      break;

    default:
      explanation = item.summary || item.detailed_explanation || item.title;
  }

  return {
    success: true,
    data: {
      id: item.id,
      type: item.insight_type,
      severity: item.severity,
      title: item.title,
      summary: item.summary,
      detailed_explanation: item.detailed_explanation,
      ai_explanation: explanation,
      verified_facts: sourceData,
      detected_at: item.detected_at,
      status: item.status
    }
  };
}

/**
 * Trigger manual detection cycle (Admin only)
 */
async function triggerDetection(organizationId, userContext) {
  if (!isAuthorizedAdminOrHr(userContext)) {
    return {
      success: false,
      status: 403,
      message: 'Only administrators and HR personnel can trigger insight detection.'
    };
  }

  const result = await insightDetectionService.runDetectionForOrganization(organizationId);
  return {
    success: true,
    message: `Insight detection complete. Created ${result.created} new insight(s), skipped ${result.skipped_duplicate} duplicate(s) and ${result.skipped_dismissed} dismissed.`,
    data: result
  };
}

module.exports = {
  isAuthorizedAdminOrHr,
  getInsights,
  getInsightSummary,
  markInsightRead,
  dismissInsight,
  explainInsight,
  triggerDetection
};
