const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

router.use(authenticate);

// Get all announcements
router.get('/', async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const [announcements] = await db.query(
      `SELECT a.*, u.first_name as author_first_name, u.last_name as author_last_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.organization_id = ?
       ORDER BY a.created_at DESC`,
      [organizationId]
    );
    res.json({ success: true, data: announcements });
  } catch (error) {
    next(error);
  }
});

// Create announcement (HR_ADMIN, ORG_ADMIN, SUPER_ADMIN)
router.post('/', authorizeRole('HR_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { title, content, status = 'published' } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }

    const [result] = await db.query(
      `INSERT INTO announcements (organization_id, title, content, created_by, status)
       VALUES (?, ?, ?, ?, ?)`,
      [organizationId, title, content, req.user.id, status]
    );

    // Create notifications for all organization users
    try {
      const [users] = await db.query(`SELECT id FROM users WHERE organization_id = ?`, [organizationId]);
      for (let u of users) {
        if (u.id !== req.user.id) {
          await db.query(
            `INSERT INTO notifications (organization_id, user_id, title, message, type, action_url)
             VALUES (?, ?, ?, ?, 'announcement', '/app/employee/announcements')`,
            [organizationId, u.id, 'New Company Announcement', title]
          );
        }
      }
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data: { id: result.insertId, title, content, status }
    });
  } catch (error) {
    next(error);
  }
});

// Delete announcement
router.delete('/:id', authorizeRole('HR_ADMIN', 'ORG_ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { id } = req.params;

    await db.query(`DELETE FROM announcements WHERE id = ? AND organization_id = ?`, [id, organizationId]);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
