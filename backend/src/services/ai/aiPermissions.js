/**
 * Centralized Permission Registry & Validation Layer for AI Command Assistant
 * 
 * Maps intents to tool contracts and enforces strict backend authorization:
 * - Employees cannot access admin operations
 * - Employees cannot access or modify other employees' data
 * - Organization context is strictly validated
 */

const { getToolContract, TOOL_REGISTRY } = require('./toolRegistry');

/**
 * Check if the user has permission to execute the specified intent.
 * 
 * @param {string} intent - Detected AI intent or tool name
 * @param {object} user - Authenticated user context (req.user)
 * @param {object} params - Extracted intent parameters
 * @returns {{ authorized: boolean, status?: number, reason?: string, selfScoped?: boolean, requiresConfirmation?: boolean }}
 */
function checkPermission(intent, user, params = {}) {
  // 1. Resolve tool contract
  const contract = getToolContract(intent);
  if (!contract) {
    return {
      authorized: false,
      status: 400,
      reason: 'Unknown action or intent.'
    };
  }

  // 2. Validate authentication & organization context
  if (!user || !user.id) {
    return {
      authorized: false,
      status: 401,
      reason: 'Authentication required to execute AI commands.'
    };
  }

  if (contract.requiresOrgContext && !user.organization_id) {
    return {
      authorized: false,
      status: 403,
      reason: 'No organization context associated with user account.'
    };
  }

  // 3. Super Admins always have access
  if (user.roles && user.roles.includes('SUPER_ADMIN')) {
    return {
      authorized: true,
      selfScoped: contract.selfScoped,
      requiresConfirmation: contract.requiresConfirmation || false
    };
  }

  // 4. Check role authorization
  const hasRole = user.roles && user.roles.some(role => contract.allowedRoles.includes(role));
  if (!hasRole) {
    return {
      authorized: false,
      status: 403,
      reason: "You don't have permission to perform that action."
    };
  }

  // 5. Check self-scoped constraints
  // If an employee attempts to query/modify another employee's records under a self-scoped intent
  if (contract.selfScoped) {
    const isTargetingOther = 
      (params.employee_id && params.employee_id !== user.employee_id) ||
      (params.employee && !['my', 'me', 'myself', 'self'].includes(String(params.employee).toLowerCase().trim()));

    if (isTargetingOther) {
      const isAdmin = user.roles && user.roles.some(r => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(r));
      if (!isAdmin) {
        return {
          authorized: false,
          status: 403,
          reason: "You don't have permission to perform that action on another employee's records."
        };
      }
    }
  }

  return {
    authorized: true,
    selfScoped: contract.selfScoped,
    requiresConfirmation: contract.requiresConfirmation || false
  };
}

/**
 * Filter the list of available tools/intents according to user's permissions and role.
 * Used for system prompts or client capability inspection.
 * 
 * @param {object} user - req.user
 * @returns {Array<string>} list of intent names allowed
 */
function getAllowedIntents(user) {
  return Object.keys(TOOL_REGISTRY).filter(intent => {
    return checkPermission(intent, user).authorized;
  });
}

/**
 * Validate tool permission with allowed boolean.
 */
function validateToolPermission(intent, user, params = {}) {
  const res = checkPermission(intent, user, params);
  return {
    allowed: res.authorized,
    ...res
  };
}

module.exports = {
  INTENT_PERMISSIONS: TOOL_REGISTRY,
  checkPermission,
  validateToolPermission,
  getAllowedIntents
};
