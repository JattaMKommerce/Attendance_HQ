const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokenUtils');

class AuthService {
  async login(identifier, password, ipAddress, userAgent) {
    // 1. Find user by email or employee_code
    const [users] = await db.execute(
      `SELECT DISTINCT u.id, u.organization_id, u.email, u.password_hash, u.first_name, u.last_name, u.status 
       FROM users u 
       LEFT JOIN employees e ON (e.user_id = u.id OR e.email = u.email)
       WHERE u.email = ? OR e.employee_code = ?
       LIMIT 1`,
      [identifier, identifier]
    );

    if (users.length === 0) {
      throw new Error('Invalid email, employee ID, or password');
    }

    const user = users[0];

    // 2. Check user status
    if (user.status !== 'active') {
      await this.logLogin(user.id, ipAddress, userAgent, 'failed');
      throw new Error('User account is not active');
    }

    // 3. Check organization status if not super admin
    if (user.organization_id) {
      const [orgs] = await db.execute(
        'SELECT status FROM organizations WHERE id = ?',
        [user.organization_id]
      );
      if (orgs.length === 0 || orgs[0].status === 'suspended' || orgs[0].status === 'cancelled') {
        await this.logLogin(user.id, ipAddress, userAgent, 'failed');
        throw new Error('Organization account is suspended or cancelled');
      }
    }

    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await this.logLogin(user.id, ipAddress, userAgent, 'failed');
      throw new Error('Invalid email or password');
    }

    // 5. Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 6. Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await db.execute(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );

    // 7. Record login history
    await this.logLogin(user.id, ipAddress, userAgent, 'success');

    // 8. Load roles and permissions for frontend state
    const [roles] = await db.execute(
      `SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?`,
      [user.id]
    );
    
    // Avoid returning sensitive data
    let [emp] = await db.execute('SELECT id, employee_code FROM employees WHERE user_id = ?', [user.id]);
    if (emp.length === 0 && user.organization_id) {
      [emp] = await db.execute('SELECT id, employee_code FROM employees WHERE email = ? AND organization_id = ?', [user.email, user.organization_id]);
      if (emp.length > 0) {
        await db.execute('UPDATE employees SET user_id = ? WHERE id = ?', [user.id, emp[0].id]);
      }
    }
    const employee_id = emp.length > 0 ? emp[0].id : null;
    const employee_code = emp.length > 0 ? emp[0].employee_code : null;

    const safeUser = {
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      employee_id,
      employee_code,
      roles: roles.map(r => r.name)
    };

    return { user: safeUser, accessToken, refreshToken };
  }

  async logLogin(userId, ipAddress, userAgent, status) {
    await db.execute(
      'INSERT INTO login_history (user_id, ip_address, user_agent, login_time, status) VALUES (?, ?, ?, NOW(), ?)',
      [userId || null, ipAddress || null, userAgent || null, status || 'success']
    );
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    // 1. Verify JWT signature
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid or expired refresh token');
    }

    // 2. Check if token exists in DB and is not revoked
    const [tokens] = await db.execute(
      'SELECT id, user_id, revoked_at FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokens.length === 0 || tokens[0].revoked_at !== null) {
      throw new Error('Refresh token is invalid or revoked');
    }

    // 3. Find user
    const [users] = await db.execute(
      'SELECT id, organization_id, email, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0 || users[0].status !== 'active') {
      throw new Error('User account is not active');
    }

    // 4. Generate new access token
    const accessToken = generateAccessToken(users[0]);
    return { accessToken };
  }

  async logout(refreshToken) {
    if (!refreshToken) return;
    // Revoke token
    await db.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND revoked_at IS NULL',
      [refreshToken]
    );
  }

  async getCurrentUser(userId) {
    const [users] = await db.execute(
      'SELECT id, organization_id, email, first_name, last_name, status FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    const [roles] = await db.execute(
      `SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?`,
      [userId]
    );

    const [rolePermissions] = await db.execute(
      `SELECT p.name 
       FROM permissions p 
       JOIN role_permissions rp ON p.id = rp.permission_id 
       JOIN user_roles ur ON rp.role_id = ur.role_id 
       WHERE ur.user_id = ?`,
      [userId]
    );

    const [userDirectPermissions] = await db.execute(
      `SELECT p.name 
       FROM permissions p 
       JOIN user_permissions up ON p.id = up.permission_id 
       WHERE up.user_id = ?`,
      [userId]
    );

    const permissionsSet = new Set([
      ...rolePermissions.map(p => p.name),
      ...userDirectPermissions.map(p => p.name)
    ]);

    let organization = null;
    if (user.organization_id) {
       const [orgs] = await db.execute('SELECT id, name, subdomain, status FROM organizations WHERE id = ?', [user.organization_id]);
       if(orgs.length > 0) organization = orgs[0];
    }

    let [emp] = await db.execute('SELECT id, employee_code FROM employees WHERE user_id = ?', [user.id]);
    if (emp.length === 0 && user.organization_id) {
      [emp] = await db.execute('SELECT id, employee_code FROM employees WHERE email = ? AND organization_id = ?', [user.email, user.organization_id]);
      if (emp.length > 0) {
        await db.execute('UPDATE employees SET user_id = ? WHERE id = ?', [user.id, emp[0].id]);
      }
    }
    const employee_id = emp.length > 0 ? emp[0].id : null;
    const employee_code = emp.length > 0 ? emp[0].employee_code : null;

    return {
      id: user.id,
      organization,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      employee_id,
      employee_code,
      roles: roles.map(r => r.name),
      permissions: Array.from(permissionsSet)
    };
  }

  // Basic implementation of organization registration for Phase 3
  async registerOrganization({ orgName, email, password, firstName, lastName }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Check if email exists
      const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        throw new Error('Email is already in use');
      }

      // 2. Create organization
      const [orgResult] = await connection.execute(
        'INSERT INTO organizations (name, email, status) VALUES (?, ?, ?)',
        [orgName, email, 'active']
      );
      const orgId = orgResult.insertId;

      // 3. Create ORG_ADMIN user
      const passwordHash = await bcrypt.hash(password, 10);
      const [userResult] = await connection.execute(
        'INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, ?, ?, ?)',
        [orgId, email, passwordHash, firstName, lastName, 'active']
      );
      const userId = userResult.insertId;

      // 4. Assign ORG_ADMIN role
      const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ? AND is_system_role = 1', ['ORG_ADMIN']);
      if (roles.length > 0) {
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roles[0].id]
        );
      }

      // 5. Create audit log
      await connection.execute(
        'INSERT INTO audit_logs (organization_id, user_id, action, module, target_id) VALUES (?, ?, ?, ?, ?)',
        [orgId, userId, 'ORGANIZATION_REGISTERED', 'platform', orgId]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async verifyActivationToken(token) {
    if (!token) {
      throw new Error('Activation token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const [records] = await db.execute(
      `SELECT aa.id, aa.organization_id, aa.user_id, aa.employee_id, aa.expires_at, aa.used_at,
              u.email, u.first_name, u.last_name, u.status AS user_status,
              e.employee_code, o.name AS organization_name
       FROM account_activations aa
       JOIN users u ON aa.user_id = u.id
       JOIN employees e ON aa.employee_id = e.id
       LEFT JOIN organizations o ON aa.organization_id = o.id
       WHERE aa.token_hash = ?`,
      [tokenHash]
    );

    if (records.length === 0) {
      throw new Error('Invalid or non-existent activation link');
    }

    const record = records[0];

    if (record.used_at) {
      throw new Error('This activation link has already been used. Please log in.');
    }

    if (new Date(record.expires_at) < new Date()) {
      throw new Error('This activation link has expired. Please contact your administrator to resend the invitation.');
    }

    if (record.user_status === 'active') {
      throw new Error('Account is already active. Please log in.');
    }

    return {
      email: record.email,
      first_name: record.first_name,
      last_name: record.last_name,
      employee_code: record.employee_code,
      organization_name: record.organization_name || 'Jatta M Kommerce'
    };
  }

  async activateAccount(token, password) {
    if (!token) {
      throw new Error('Activation token is required');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [records] = await connection.execute(
        `SELECT aa.id, aa.organization_id, aa.user_id, aa.employee_id, aa.expires_at, aa.used_at,
                u.email, u.first_name, u.last_name, u.status AS user_status
         FROM account_activations aa
         JOIN users u ON aa.user_id = u.id
         WHERE aa.token_hash = ?
         FOR UPDATE`,
        [tokenHash]
      );

      if (records.length === 0) {
        throw new Error('Invalid or non-existent activation token');
      }

      const record = records[0];

      if (record.used_at) {
        throw new Error('This activation token has already been used');
      }

      if (new Date(record.expires_at) < new Date()) {
        throw new Error('This activation token has expired');
      }

      // Hash permanent password securely
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user account status to active
      await connection.execute(
        'UPDATE users SET password_hash = ?, status = "active", updated_at = NOW() WHERE id = ?',
        [passwordHash, record.user_id]
      );

      // Invalidate current activation token
      await connection.execute(
        'UPDATE account_activations SET used_at = NOW() WHERE id = ?',
        [record.id]
      );

      // Invalidate any other pending tokens for this user
      await connection.execute(
        'UPDATE account_activations SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL AND id != ?',
        [record.user_id, record.id]
      );

      // Record audit log
      await connection.execute(
        'INSERT INTO audit_logs (organization_id, user_id, action, module, target_id) VALUES (?, ?, ?, ?, ?)',
        [record.organization_id, record.user_id, 'ACCOUNT_ACTIVATED', 'auth', record.user_id]
      );

      await connection.commit();

      return {
        email: record.email,
        first_name: record.first_name,
        last_name: record.last_name
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AuthService();
