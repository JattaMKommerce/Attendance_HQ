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

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 organization registrations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Too many organization registration attempts from this IP. Please try again after an hour.' 
  }
});

// router.use(authLimiter); // Removed global rate limiter to prevent /me from getting rate limited during dev reloads

router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/register-organization', registrationLimiter, authController.registerOrganization);

// Account Activation routes (public)
router.get('/verify-activation', authController.verifyActivationToken);
router.post('/activate-account', authLimiter, authController.activateAccount);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
