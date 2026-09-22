/**
 * Automated Test Suite for JMK HRMS Social Feature ("JMK Social")
 * Tests authentication, tenant isolation, post creation, likes, comments, and reports.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/config/db');
const socialService = require('../src/services/socialService');
const { generateAccessToken } = require('../src/utils/tokenUtils');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  console.log(`${colors.green}✓ PASS:${colors.reset} ${name} ${detail ? colors.cyan + '(' + detail + ')' + colors.reset : ''}`);
  passed++;
}

function fail(name, reason) {
  console.error(`${colors.red}✗ FAIL:${colors.reset} ${name} - ${reason}`);
  failed++;
}

async function runSocialTests() {
  console.log(`\n${colors.cyan}========================================================================${colors.reset}`);
  console.log(`${colors.cyan}           JMK HRMS SOCIAL FEATURE AUTOMATED VERIFICATION SUITE         ${colors.reset}`);
  console.log(`${colors.cyan}========================================================================\n${colors.reset}`);

  try {
    // 1. Fetch test users and organizations
    const [users] = await db.query(
      `SELECT u.id, u.organization_id, u.email, u.first_name, u.last_name,
              (SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = u.id LIMIT 1) as role
       FROM users u
       WHERE u.organization_id IS NOT NULL AND u.status = 'active'
       LIMIT 2`
    );

    if (users.length === 0) {
      fail('Database seed check', 'No active users found for testing');
      return;
    }

    const testUser = users[0];
    testUser.roles = testUser.role ? [testUser.role] : ['EMPLOYEE'];
    console.log(`${colors.yellow}Testing with User ID ${testUser.id} (${testUser.email}), Org ID ${testUser.organization_id}...${colors.reset}`);

    // 2. Test Post Creation
    let createdPost;
    try {
      createdPost = await socialService.createPost({
        organizationId: testUser.organization_id,
        authorId: testUser.id,
        content: '🎉 Celebrating our team Q3 milestone! Welcome everyone to JMK Social!',
        postType: 'milestone'
      });

      if (createdPost && createdPost.id && createdPost.post_type === 'milestone') {
        pass('Post Creation (Milestone)', `Post ID: ${createdPost.id}, Author: ${createdPost.first_name}`);
      } else {
        fail('Post Creation', 'Post object invalid or missing fields');
      }
    } catch (err) {
      fail('Post Creation', err.message);
    }

    if (!createdPost) {
      console.error('Aborting subsequent tests due to post creation failure');
      return;
    }

    // 3. Test Feed Retrieval & Pagination
    try {
      const feed = await socialService.getPosts({
        organizationId: testUser.organization_id,
        userId: testUser.id,
        page: 1,
        limit: 10
      });

      const found = feed.posts.some(p => p.id === createdPost.id);
      if (found && feed.pagination && feed.pagination.total >= 1) {
        pass('Feed Retrieval & Pagination', `Retrieved ${feed.posts.length} posts, total: ${feed.pagination.total}`);
      } else {
        fail('Feed Retrieval', 'Created post not found in feed list');
      }
    } catch (err) {
      fail('Feed Retrieval', err.message);
    }

    // 4. Test Liking Post
    try {
      const likeRes = await socialService.likePost({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        userId: testUser.id
      });

      if (likeRes.liked === true && likeRes.likes_count === 1) {
        pass('Post Like', `Likes count: ${likeRes.likes_count}`);
      } else {
        fail('Post Like', `Expected 1 like, got ${likeRes.likes_count}`);
      }

      // Idempotent like test (duplicate like should NOT increment)
      const dupLikeRes = await socialService.likePost({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        userId: testUser.id
      });

      if (dupLikeRes.likes_count === 1) {
        pass('Idempotent Like Prevention', 'Duplicate like did not increment count');
      } else {
        fail('Idempotent Like Prevention', `Count incremented on duplicate: ${dupLikeRes.likes_count}`);
      }
    } catch (err) {
      fail('Post Like', err.message);
    }

    // 5. Test Unliking Post
    try {
      const unlikeRes = await socialService.unlikePost({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        userId: testUser.id
      });

      if (unlikeRes.liked === false && unlikeRes.likes_count === 0) {
        pass('Post Unlike', `Likes count: ${unlikeRes.likes_count}`);
      } else {
        fail('Post Unlike', `Expected 0 likes, got ${unlikeRes.likes_count}`);
      }
    } catch (err) {
      fail('Post Unlike', err.message);
    }

    // 6. Test Adding and Fetching Comments
    let createdComment;
    try {
      createdComment = await socialService.addComment({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        userId: testUser.id,
        content: 'Great work team! Truly exciting progress.'
      });

      if (createdComment && createdComment.id && createdComment.content.includes('Great work team')) {
        pass('Add Comment', `Comment ID: ${createdComment.id}`);
      } else {
        fail('Add Comment', 'Comment was not created properly');
      }

      const comments = await socialService.getComments({
        postId: createdPost.id,
        organizationId: testUser.organization_id
      });

      if (comments.some(c => c.id === createdComment.id)) {
        pass('Get Comments', `Found ${comments.length} comment(s)`);
      } else {
        fail('Get Comments', 'Created comment not returned in comments list');
      }
    } catch (err) {
      fail('Comments', err.message);
    }

    // 7. Test Deleting Comment
    if (createdComment) {
      try {
        const delCommentRes = await socialService.deleteComment({
          commentId: createdComment.id,
          organizationId: testUser.organization_id,
          user: testUser
        });

        if (delCommentRes.success) {
          pass('Delete Comment', 'Comment soft-deleted by author');
        } else {
          fail('Delete Comment', 'Comment deletion did not succeed');
        }
      } catch (err) {
        fail('Delete Comment', err.message);
      }
    }

    // 8. Test Reporting Post
    try {
      const reportRes = await socialService.reportPost({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        reporterId: testUser.id,
        reason: 'Testing report functionality'
      });

      if (reportRes.success) {
        pass('Report Post', 'Post report recorded in social_post_reports');
      } else {
        fail('Report Post', 'Report failed');
      }
    } catch (err) {
      fail('Report Post', err.message);
    }

    // 9. Test Strict Cross-Tenant Isolation
    try {
      const fakeOtherOrgId = 9999999;
      const crossOrgPost = await socialService.getPostById({
        postId: createdPost.id,
        organizationId: fakeOtherOrgId,
        userId: testUser.id
      });

      if (crossOrgPost === null) {
        pass('Cross-Tenant Isolation (Read)', 'Unauthorized org cannot read post (returned null)');
      } else {
        fail('Cross-Tenant Isolation (Read)', 'Foreign organization was able to read post!');
      }

      let crossTenantLikeFailed = false;
      try {
        await socialService.likePost({
          postId: createdPost.id,
          organizationId: fakeOtherOrgId,
          userId: testUser.id
        });
      } catch (e) {
        crossTenantLikeFailed = true;
      }

      if (crossTenantLikeFailed) {
        pass('Cross-Tenant Isolation (Mutation)', 'Foreign org cannot like another org’s post');
      } else {
        fail('Cross-Tenant Isolation (Mutation)', 'Foreign org liked another org’s post!');
      }
    } catch (err) {
      fail('Cross-Tenant Isolation', err.message);
    }

    // 10. Test Deleting Post
    try {
      const delPostRes = await socialService.deletePost({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        user: testUser
      });

      if (delPostRes.success) {
        pass('Delete Post (Author / Admin)', 'Post soft-deleted successfully');
      } else {
        fail('Delete Post', 'Post deletion returned false');
      }

      // Verify post is now deleted from active feed
      const verifyPost = await socialService.getPostById({
        postId: createdPost.id,
        organizationId: testUser.organization_id,
        userId: testUser.id
      });

      if (verifyPost === null) {
        pass('Deleted Post Invisibility', 'Soft-deleted post does not appear in active queries');
      } else {
        fail('Deleted Post Invisibility', 'Soft-deleted post is still returned!');
      }
    } catch (err) {
      fail('Delete Post', err.message);
    }

    // Clean up test post report and hard delete test post row
    await db.query(`DELETE FROM social_post_reports WHERE post_id = ?`, [createdPost.id]);
    await db.query(`DELETE FROM social_posts WHERE id = ?`, [createdPost.id]);

    console.log(`\n${colors.cyan}========================================================================${colors.reset}`);
    console.log(`${colors.cyan}RESULT: ${passed} PASSED, ${failed} FAILED${colors.reset}`);
    console.log(`${colors.cyan}========================================================================\n${colors.reset}`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (globalErr) {
    console.error('Fatal test runner error:', globalErr);
    process.exit(1);
  }
}

runSocialTests();
