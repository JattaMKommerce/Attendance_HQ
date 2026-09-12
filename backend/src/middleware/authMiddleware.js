const { verifyAccessToken } = require('../utils/tokenUtils');
const db = require('../config/db');

// Authenticate user by verifying JWT
const authenticate = async (req, res, next) => {

  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
    }

    // Verify user still exists and is active
    const [users] = await db.execute(
      'SELECT id, organization_id, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User account is not active.' });
    }

    // Load user roles
    const [roles] = await db.execute(
      `SELECT r.name 
       FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = ?`,
      [user.id]
    );

    const userRoles = roles.map(r => r.name);

    // Load user permissions (from roles and direct user permissions)
    const [rolePermissions] = await db.execute(
      `SELECT p.name 
       FROM permissions p 
       JOIN role_permissions rp ON p.id = rp.permission_id 
       JOIN user_roles ur ON rp.role_id = ur.role_id 
       WHERE ur.user_id = ?`,
      [user.id]
    );

    const [userDirectPermissions] = await db.execute(
      `SELECT p.name 
       FROM permissions p 
       JOIN user_permissions up ON p.id = up.permission_id 
       WHERE up.user_id = ?`,
      [user.id]
    );

    const permissionsSet = new Set([
      ...rolePermissions.map(p => p.name),
      ...userDirectPermissions.map(p => p.name)
    ]);

    // Also fetch employee_id if this user is linked to an employee record
    let [empRes] = await db.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
    let employee_id = empRes.length > 0 ? empRes[0].id : null;
    if (!employee_id && user.organization_id) {
      // Auto-link by email if employee record exists with same email
      const [byEmail] = await db.execute('SELECT id FROM employees WHERE email = ? AND organization_id = ?', [decoded.email || '', user.organization_id]);
      if (byEmail.length > 0) {
        employee_id = byEmail[0].id;
        await db.execute('UPDATE employees SET user_id = ? WHERE id = ?', [user.id, employee_id]);
      }
    }

    // Attach verified context to req.user
    req.user = {
      id: user.id,
      organization_id: user.organization_id,
      employee_id: employee_id,
      roles: userRoles,
      permissions: Array.from(permissionsSet)
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Authorize by Role
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ success: false, message: 'Forbidden. Required role not found.' });
    }

    next();
  };
};

// Authorize by Permission
const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (req.user.roles.includes('SUPER_ADMIN')) {
       return next();
    }

    const hasPermission = req.user.permissions.includes(requiredPermission);
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Forbidden. Required permission not found.' });
    }

    next();
  };
};

// Validate request body middleware helper
const validateRequest = (schema) => {
    return (req, res, next) => {
       // Placeholder for actual validation logic (e.g., Joi or express-validator)
       // This will be implemented inside the controller for now, or using a library if added later.
       next();
    }
}

module.exports = {
  authenticate,
  authorizeRole,
  authorizePermission,
  validateRequest
};
