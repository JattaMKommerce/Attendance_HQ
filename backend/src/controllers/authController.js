const authService = require('../services/authService');

class AuthController {
  async login(req, res, next) {
    try {
      const identifier = req.body.email || req.body.employee_id || req.body.identifier;
      const { password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ success: false, message: 'Email/Employee ID and password are required' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(identifier, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      if (
        error.message.includes('Invalid') || 
        error.message.includes('not active') || 
        error.message.includes('suspended') || 
        error.message.includes('activated') ||
        error.message.includes('required')
      ) {
         return res.status(401).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      const result = await authService.refresh(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('invalid') || error.message.includes('expired') || error.message.includes('revoked')) {
        return res.status(401).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: {}
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await authService.getCurrentUser(userId);

      res.status(200).json({
        success: true,
        message: 'Current user retrieved successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  async registerOrganization(req, res, next) {
    try {
      const { orgName, email, password, firstName, lastName } = req.body;

      if (!orgName || !email || !password || !firstName || !lastName) {
         return res.status(400).json({ success: false, message: 'All fields are required' });
      }

      // Basic password validation
      if (password.length < 8) {
         return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
      }

      await authService.registerOrganization({ orgName, email, password, firstName, lastName });

      res.status(201).json({
        success: true,
        message: 'Organization registered successfully. You can now log in.',
        data: {}
      });
    } catch (error) {
      if (error.message === 'Email is already in use') {
        return res.status(409).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  async verifyActivationToken(req, res, next) {
    try {
      const token = req.query.token;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Activation token is required' });
      }

      const result = await authService.verifyActivationToken(token);
      res.status(200).json({
        success: true,
        message: 'Activation token is valid',
        data: result
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async activateAccount(req, res, next) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token and permanent password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
      }

      const result = await authService.activateAccount(token, password);
      res.status(200).json({
        success: true,
        message: 'Account activated successfully. You can now log in with your permanent password.',
        data: result
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();
