const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// All social endpoints require authentication
router.use(authenticate);

// Post Feed & CRUD
router.get('/posts', socialController.getPosts);
router.post('/posts', (req, res, next) => {
  upload.social.array('media', 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, socialController.createPost);
router.get('/posts/:id', socialController.getPostById);
router.delete('/posts/:id', socialController.deletePost);

// Post Likes
router.post('/posts/:id/like', socialController.likePost);
router.delete('/posts/:id/like', socialController.unlikePost);

// Comments
router.get('/posts/:id/comments', socialController.getComments);
router.post('/posts/:id/comments', socialController.addComment);
router.delete('/comments/:commentId', socialController.deleteComment);

// Reports / Moderation Flagging
router.post('/posts/:id/report', socialController.reportPost);

module.exports = router;
