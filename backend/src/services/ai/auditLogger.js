/**
 * Audit Logger for AI Command Assistant
 * 
 * Records all AI interactions, detected intents, tools executed,
 * target entities, confirmation status, and results to both:
 * 1. `ai_action_logs` (AI-specific telemetry)
 * 2. `audit_logs` (HRMS system-wide audit trail)
 * 
 * Guarantees that passwords, tokens, hashes, and secrets are sanitized before persistence.
 */

const db = require('../../config/db');

const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'token', 'token_hash', 'refreshtoken', 
  'accesstoken', 'secret', 'jwt_secret', 'authorization', 'api_key', 'apikey'
]);

function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const safe = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
      safe[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      safe[key] = sanitizePayload(value);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Log an executed AI action to the database.
 * 
 * @param {object} entry
 * @param {number} entry.organizationId
 * @param {number} entry.userId
 * @param {string} entry.userRole
 * @param {string} entry.originalCommand
 * @param {string} entry.intent
 * @param {string} entry.toolName
 * @param {string|number} [entry.targetId]
 * @param {string} [entry.targetEntity]
 * @param {string} entry.status - 'success' | 'failed' | 'denied' | 'pending_confirmation'
 * @param {string} [entry.confirmationStatus] - 'none' | 'pending' | 'confirmed' | 'cancelled'
 * @param {object} [entry.result]
 * @param {string} [entry.errorMessage]
 */
async function logAiAction(entry) {
  try {
    const orgId = entry.organizationId || null;
    const userId = entry.userId || null;
    const actionType = entry.intent || 'unknown_action';

    const contextPayload = sanitizePayload({
      role: entry.userRole || 'EMPLOYEE',
      original_command: entry.originalCommand,
      intent: entry.intent,
      tool: entry.toolName,
      target_entity: entry.targetEntity || null,
      target_id: entry.targetId || null,
      confirmation_status: entry.confirmationStatus || 'none',
      status: entry.status,
      timestamp: new Date().toISOString()
    });

    const resultPayload = sanitizePayload({
      status: entry.status,
      message: entry.errorMessage || (entry.result?.message || 'Completed'),
      data: entry.result?.data || null
    });

    // 1. Insert into ai_action_logs
    await db.query(
      `INSERT INTO ai_action_logs (organization_id, user_id, action_type, context, result)
       VALUES (?, ?, ?, ?, ?)`,
      [
        orgId,
        userId,
        actionType,
        JSON.stringify(contextPayload),
        JSON.stringify(resultPayload)
      ]
    );

    // 2. Insert into system audit_logs if this is a data modification or access action
    if (orgId && ['success', 'failed'].includes(entry.status)) {
      await db.query(
        `INSERT INTO audit_logs (organization_id, user_id, action, module, target_id, new_value)
         VALUES (?, ?, ?, 'ai_assistant', ?, ?)`,
        [
          orgId,
          userId,
          `AI_${actionType.toUpperCase()}`,
          entry.targetId ? parseInt(entry.targetId, 10) || null : null,
          JSON.stringify({
            command: entry.originalCommand,
            intent: entry.intent,
            tool: entry.toolName,
            status: entry.status,
            result: resultPayload
          })
        ]
      );
    }
  } catch (err) {
    console.error('[AiAuditLogger] Error writing audit log:', err.message);
  }
}

module.exports = {
  logAiAction,
  sanitizePayload
};
