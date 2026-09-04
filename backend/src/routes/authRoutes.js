const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth routes
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

// router.use(authLimiter); // Removed global rate limiter to prevent /me from getting rate limited during dev reloads

router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/register-organization', authController.registerOrganization);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
