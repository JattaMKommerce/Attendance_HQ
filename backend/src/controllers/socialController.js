const socialService = require('../services/socialService');

class SocialController {
  async getPosts(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const { page, limit } = req.query;

      const result = await socialService.getPosts({
        organizationId,
        userId,
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: result.posts,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getPostById(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const postId = req.params.id;

      const post = await socialService.getPostById({
        postId,
        organizationId,
        userId
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }

      res.status(200).json({
        success: true,
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  async createPost(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const authorId = req.user.id;
      const { content, post_type } = req.body;
      const files = req.files || [];

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Post content cannot be empty'
        });
      }

      const post = await socialService.createPost({
        organizationId,
        authorId,
        content,
        postType: post_type,
        files
      });

      res.status(201).json({
        success: true,
        message: 'Post published successfully',
        data: post
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const postId = req.params.id;

      const result = await socialService.deletePost({
        postId,
        organizationId,
        user: req.user
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async likePost(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const postId = req.params.id;

      const result = await socialService.likePost({
        postId,
        organizationId,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async unlikePost(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const postId = req.params.id;

      const result = await socialService.unlikePost({
        postId,
        organizationId,
        userId
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async getComments(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const postId = req.params.id;

      const comments = await socialService.getComments({
        postId,
        organizationId
      });

      res.status(200).json({
        success: true,
        data: comments
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async addComment(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const userId = req.user.id;
      const postId = req.params.id;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Comment content cannot be empty'
        });
      }

      const comment = await socialService.addComment({
        postId,
        organizationId,
        userId,
        content
      });

      res.status(201).json({
        success: true,
        message: 'Comment added',
        data: comment
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const commentId = req.params.commentId;

      const result = await socialService.deleteComment({
        commentId,
        organizationId,
        user: req.user
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async reportPost(req, res, next) {
    try {
      const organizationId = req.user.organization_id;
      const reporterId = req.user.id;
      const postId = req.params.id;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Report reason is required'
        });
      }

      const result = await socialService.reportPost({
        postId,
        organizationId,
        reporterId,
        reason
      });

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
}

module.exports = new SocialController();
