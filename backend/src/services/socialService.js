const db = require('../config/db');

class SocialService {
  /**
   * Fetch paginated posts for the organization with author info, like/comment counts, media, and like status
   */
  async getPosts({ organizationId, userId, page = 1, limit = 20 }) {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const offset = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10)));

    // Total count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total 
       FROM social_posts 
       WHERE organization_id = ? AND deleted_at IS NULL`,
      [organizationId]
    );
    const total = countRows[0]?.total || 0;

    // Fetch posts
    const [posts] = await db.query(
      `SELECT 
        p.id,
        p.organization_id,
        p.author_id,
        p.content,
        p.post_type,
        p.created_at,
        p.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        e.id as employee_id,
        e.employee_code,
        e.profile_image_url,
        des.name as designation_name,
        d.name as department_name,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comments_count,
        EXISTS(SELECT 1 FROM social_post_likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked
       FROM social_posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN employees e ON (e.user_id = u.id AND e.organization_id = p.organization_id AND e.deleted_at IS NULL)
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE p.organization_id = ? AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, organizationId, safeLimit, offset]
    );

    if (posts.length === 0) {
      return {
        posts: [],
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit)
        }
      };
    }

    // Fetch media for these posts
    const postIds = posts.map(p => p.id);
    const [mediaRows] = await db.query(
      `SELECT id, post_id, media_url, media_type, file_name, file_size, mime_type, created_at
       FROM social_post_media
       WHERE post_id IN (?) AND organization_id = ?
       ORDER BY id ASC`,
      [postIds, organizationId]
    );

    // Attach media to posts
    const mediaByPostId = {};
    for (const item of mediaRows) {
      if (!mediaByPostId[item.post_id]) {
        mediaByPostId[item.post_id] = [];
      }
      mediaByPostId[item.post_id].push(item);
    }

    const formattedPosts = posts.map(p => ({
      ...p,
      is_liked: Boolean(p.is_liked),
      likes_count: Number(p.likes_count),
      comments_count: Number(p.comments_count),
      media: mediaByPostId[p.id] || []
    }));

    return {
      posts: formattedPosts,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }

  /**
   * Fetch single post by ID with security validation
   */
  async getPostById({ postId, organizationId, userId }) {
    const [posts] = await db.query(
      `SELECT 
        p.id,
        p.organization_id,
        p.author_id,
        p.content,
        p.post_type,
        p.created_at,
        p.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        e.id as employee_id,
        e.employee_code,
        e.profile_image_url,
        des.name as designation_name,
        d.name as department_name,
        (SELECT COUNT(*) FROM social_post_likes l WHERE l.post_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM social_post_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comments_count,
        EXISTS(SELECT 1 FROM social_post_likes l WHERE l.post_id = p.id AND l.user_id = ?) as is_liked
       FROM social_posts p
       JOIN users u ON p.author_id = u.id
       LEFT JOIN employees e ON (e.user_id = u.id AND e.organization_id = p.organization_id AND e.deleted_at IS NULL)
       LEFT JOIN designations des ON e.designation_id = des.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE p.id = ? AND p.organization_id = ? AND p.deleted_at IS NULL`,
      [userId, postId, organizationId]
    );

    if (posts.length === 0) {
      return null;
    }

    const post = posts[0];
    const [mediaRows] = await db.query(
      `SELECT id, post_id, media_url, media_type, file_name, file_size, mime_type, created_at
       FROM social_post_media
       WHERE post_id = ? AND organization_id = ?
       ORDER BY id ASC`,
      [postId, organizationId]
    );

    post.is_liked = Boolean(post.is_liked);
    post.likes_count = Number(post.likes_count);
    post.comments_count = Number(post.comments_count);
    post.media = mediaRows;

    return post;
  }

  /**
   * Create a new social post with optional media
   */
  async createPost({ organizationId, authorId, content, postType = 'standard', files = [] }) {
    if (!content || !content.trim()) {
      throw new Error('Post content is required');
    }

    const validTypes = ['standard', 'milestone', 'celebration', 'achievement', 'announcement'];
    const safeType = validTypes.includes(postType) ? postType : 'standard';

    const [insertResult] = await db.query(
      `INSERT INTO social_posts (organization_id, author_id, content, post_type)
       VALUES (?, ?, ?, ?)`,
      [organizationId, authorId, content.trim(), safeType]
    );

    const postId = insertResult.insertId;

    if (files && files.length > 0) {
      for (const file of files) {
        // Save relative path for static serving
        const mediaUrl = `uploads/social/${file.filename}`;
        await db.query(
          `INSERT INTO social_post_media (organization_id, post_id, media_url, media_type, file_name, file_size, mime_type)
           VALUES (?, ?, ?, 'image', ?, ?, ?)`,
          [organizationId, postId, mediaUrl, file.originalname, file.size, file.mimetype]
        );
      }
    }

    return await this.getPostById({ postId, organizationId, userId: authorId });
  }

  /**
   * Delete a post (soft delete) - must be author or moderator (SUPER_ADMIN, ORG_ADMIN, HR_ADMIN)
   */
  async deletePost({ postId, organizationId, user }) {
    const [rows] = await db.query(
      `SELECT id, author_id FROM social_posts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [postId, organizationId]
    );

    if (rows.length === 0) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    const post = rows[0];
    const isAuthor = post.author_id === user.id;
    const isModerator = user.roles && user.roles.some(role => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(role));

    if (!isAuthor && !isModerator) {
      const error = new Error('You do not have permission to delete this post');
      error.status = 403;
      throw error;
    }

    await db.query(
      `UPDATE social_posts SET deleted_at = NOW() WHERE id = ? AND organization_id = ?`,
      [postId, organizationId]
    );

    return { success: true, message: 'Post deleted successfully' };
  }

  /**
   * Like a post (idempotent)
   */
  async likePost({ postId, organizationId, userId }) {
    // Check post existence and tenant
    const [rows] = await db.query(
      `SELECT id FROM social_posts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [postId, organizationId]
    );

    if (rows.length === 0) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    await db.query(
      `INSERT IGNORE INTO social_post_likes (organization_id, post_id, user_id)
       VALUES (?, ?, ?)`,
      [organizationId, postId, userId]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) as likes_count FROM social_post_likes WHERE post_id = ?`,
      [postId]
    );

    return {
      liked: true,
      likes_count: Number(countRows[0]?.likes_count || 0)
    };
  }

  /**
   * Unlike a post
   */
  async unlikePost({ postId, organizationId, userId }) {
    const [rows] = await db.query(
      `SELECT id FROM social_posts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [postId, organizationId]
    );

    if (rows.length === 0) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    await db.query(
      `DELETE FROM social_post_likes WHERE post_id = ? AND user_id = ? AND organization_id = ?`,
      [postId, userId, organizationId]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) as likes_count FROM social_post_likes WHERE post_id = ?`,
      [postId]
    );

    return {
      liked: false,
      likes_count: Number(countRows[0]?.likes_count || 0)
    };
  }

  /**
   * Get comments for a post
   */
  async getComments({ postId, organizationId }) {
    // Check post existence and tenant
    const [postRows] = await db.query(
      `SELECT id FROM social_posts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [postId, organizationId]
    );

    if (postRows.length === 0) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    const [comments] = await db.query(
      `SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        u.first_name,
        u.last_name,
        e.profile_image_url,
        des.name as designation_name
       FROM social_post_comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN employees e ON (e.user_id = u.id AND e.organization_id = c.organization_id AND e.deleted_at IS NULL)
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE c.post_id = ? AND c.organization_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [postId, organizationId]
    );

    return comments;
  }

  /**
   * Add a comment to a post
   */
  async addComment({ postId, organizationId, userId, content }) {
    if (!content || !content.trim()) {
      throw new Error('Comment text cannot be empty');
    }

    // Check post existence and tenant
    const [postRows] = await db.query(
      `SELECT id FROM social_posts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [postId, organizationId]
    );

    if (postRows.length === 0) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    const [insertResult] = await db.query(
      `INSERT INTO social_post_comments (organization_id, post_id, user_id, content)
       VALUES (?, ?, ?, ?)`,
      [organizationId, postId, userId, content.trim()]
    );

    const commentId = insertResult.insertId;

    const [newComment] = await db.query(
      `SELECT 
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        u.first_name,
        u.last_name,
        e.profile_image_url,
        des.name as designation_name
       FROM social_post_comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN employees e ON (e.user_id = u.id AND e.organization_id = c.organization_id AND e.deleted_at IS NULL)
       LEFT JOIN designations des ON e.designation_id = des.id
       WHERE c.id = ?`,
      [commentId]
    );

    return newComment[0];
  }

  /**
   * Delete a comment (soft delete) - must be author or moderator
   */
  async deleteComment({ commentId, organizationId, user }) {
    const [rows] = await db.query(
      `SELECT id, user_id, post_id FROM social_post_comments WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [commentId, organizationId]
    );

    if (rows.length === 0) {
      const error = new Error('Comment not found');
      error.status = 404;
      throw error;
    }

    const comment = rows[0];
    const isAuthor = comment.user_id === user.id;
    const isModerator = user.roles && user.roles.some(role => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(role));

    if (!isAuthor && !isModerator) {
      const error = new Error('You do not have permission to delete this comment');
      error.status = 403;
      throw error;
    }

    await db.query(
      `UPDATE social_post_comments SET deleted_at = NOW() WHERE id = ? AND organization_id = ?`,
      [commentId, organizationId]
    );

    return { success: true, message: 'Comment deleted successfully' };
  }

  /**
   * Report a post
   */
  async reportPost({ postId, organizationId, reporterId, reason }) {
    if (!reason || !reason.trim()) {
      throw new Error('Report reason is required');
    }

    // Check post exists
    const [postRows] = await db.query(
      `SELECT id FROM social_posts WHERE id = ? AND organization_id = ? AND deleted_at IS NULL`,
      [postId, organizationId]
    );

    if (postRows.length === 0) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    await db.query(
      `INSERT INTO social_post_reports (organization_id, post_id, reporter_id, reason, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [organizationId, postId, reporterId, reason.trim()]
    );

    return { success: true, message: 'Post reported for review' };
  }
}

module.exports = new SocialService();
