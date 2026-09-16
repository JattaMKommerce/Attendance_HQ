const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const aiController = require('../controllers/aiController');
const insightController = require('../controllers/insightController');
const { authenticate } = require('../middleware/authMiddleware');

// Rate limiting for AI commands (protects LLM tokens & backend resources)
const aiCommandLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // allow up to 60 commands per minute per user/IP
  message: {
    success: false,
    status: 429,
    message: 'Too many AI commands submitted. Please wait a moment before trying again.'
  }
});

// All AI assistant routes require authentication
router.use(authenticate);

router.post('/command', aiCommandLimiter, aiController.handleCommand);
router.post('/confirm', aiController.handleConfirm);
router.get('/suggestions', aiController.getSuggestions);
router.get('/history', aiController.getHistory);
router.get('/conversations', aiController.getConversations);
router.post('/conversations', aiController.createConversation);
router.get('/conversations/:id/messages', aiController.getConversationMessages);
router.patch('/conversations/:id', aiController.updateConversation);
router.post('/conversations/:id/archive', aiController.archiveConversation);

// Proactive HR Insights & Alert Center (Phase 3C)
router.get('/insights', insightController.getInsights);
router.get('/insights/summary', insightController.getSummary);
router.post('/insights/detect', insightController.detect);
router.post('/insights/:id/read', insightController.markRead);
router.post('/insights/:id/dismiss', insightController.dismiss);
router.post('/insights/:id/explain', insightController.explain);

module.exports = router;

