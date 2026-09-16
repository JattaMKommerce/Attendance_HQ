/**
 * Dangerous Action Confirmation Service
 * 
 * Intercepts destructive/sensitive operations and generates confirmation tokens.
 * Only executes the target operation after explicit confirmation from the authenticated user.
 */

const crypto = require('crypto');

// In-memory store for pending confirmations with automatic 10-minute TTL
const pendingConfirmations = new Map();

const CONFIRMATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Creates a pending confirmation for a sensitive action.
 * 
 * @param {object} options
 * @param {number} options.organizationId
 * @param {number} options.userId
 * @param {string} options.intent
 * @param {string} options.toolName
 * @param {object} options.params
 * @param {string} options.promptMessage
 * @param {string} options.entityLabel
 * @param {string} options.impactDescription
 * @param {string} options.originalCommand
 * @returns {object} confirmation details payload for client
 */
function createPendingConfirmation(options) {
  const confirmationId = `conf_${crypto.randomBytes(16).toString('hex')}`;
  const now = Date.now();

  const record = {
    id: confirmationId,
    organizationId: options.organizationId,
    userId: options.userId,
    intent: options.intent,
    toolName: options.toolName,
    params: options.params,
    promptMessage: options.promptMessage,
    entityLabel: options.entityLabel,
    impactDescription: options.impactDescription,
    originalCommand: options.originalCommand,
    createdAt: now,
    expiresAt: now + CONFIRMATION_TTL_MS
  };

  pendingConfirmations.set(confirmationId, record);

  // Set cleanup timer
  const cleanupTimer = setTimeout(() => {
    pendingConfirmations.delete(confirmationId);
  }, CONFIRMATION_TTL_MS);
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return {
    requires_confirmation: true,
    confirmation_id: confirmationId,
    confirmation_prompt: options.promptMessage,
    summary: options.summary || options.details || null,
    confirmation_details: {
      action: options.intent,
      target_entity: options.entityLabel,
      impact: options.impactDescription,
      summary: options.summary || options.details || null
    }
  };
}

/**
 * Validate and consume a pending confirmation.
 * 
 * @param {string} confirmationId
 * @param {number} userId
 * @param {number} organizationId
 * @returns {{ valid: boolean, confirmation?: object, reason?: string }}
 */
function consumeConfirmation(confirmationId, userId, organizationId) {
  if (!confirmationId || !pendingConfirmations.has(confirmationId)) {
    return { valid: false, reason: 'Confirmation request has expired or is invalid.' };
  }

  const record = pendingConfirmations.get(confirmationId);

  if (Date.now() > record.expiresAt) {
    pendingConfirmations.delete(confirmationId);
    return { valid: false, reason: 'Confirmation request has expired. Please try again.' };
  }

  if (record.userId !== userId || record.organizationId !== organizationId) {
    return { valid: false, reason: 'Unauthorized: confirmation token does not match active session.' };
  }

  // Remove once consumed to prevent replay attacks
  pendingConfirmations.delete(confirmationId);

  return {
    valid: true,
    confirmation: record
  };
}

/**
 * Cancel a pending confirmation.
 * 
 * @param {string} confirmationId
 * @param {number} userId
 * @param {number} organizationId
 * @returns {boolean}
 */
function cancelConfirmation(confirmationId, userId, organizationId) {
  if (!confirmationId || !pendingConfirmations.has(confirmationId)) return false;

  const record = pendingConfirmations.get(confirmationId);
  if (record.userId === userId && record.organizationId === organizationId) {
    pendingConfirmations.delete(confirmationId);
    return true;
  }
  return false;
}

function getPendingConfirmation(confirmationId) {
  return pendingConfirmations.get(confirmationId) || null;
}

module.exports = {
  createPendingConfirmation,
  consumeConfirmation,
  cancelConfirmation,
  getPendingConfirmation
};
