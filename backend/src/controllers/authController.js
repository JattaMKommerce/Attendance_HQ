const authService = require('../services/authService');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(email, password, ipAddress, userAgent);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      if (error.message === 'Invalid email or password' || error.message === 'User account is not active' || error.message.includes('suspended')) {
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
}

module.exports = new AuthController();
