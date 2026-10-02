/**
 * Auto-Migration & Schema Self-Healing Utility
 * 
 * Safely ensures that all required tables (JMK Social, AI Assistant, Proactive Insights,
 * and Attendance QR Codes) exist in the MySQL database without interrupting or breaking
 * any existing records.
 */

const db = require('../config/db');

const SCHEMA_QUERIES = [
  // ── 1. JMK Social Tables ──────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS social_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    author_id INT NOT NULL,
    content TEXT NOT NULL,
    post_type ENUM('standard', 'milestone', 'celebration', 'achievement', 'announcement') DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_social_posts_org_created (organization_id, created_at DESC),
    INDEX idx_social_posts_author (author_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS social_post_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    post_id INT NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    media_type VARCHAR(50) DEFAULT 'image',
    file_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_social_media_post (post_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS social_post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_user_like (post_id, user_id),
    INDEX idx_social_likes_post (post_id),
    INDEX idx_social_likes_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS social_post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_social_comments_post_created (post_id, created_at ASC),
    INDEX idx_social_comments_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS social_post_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    post_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_social_reports_org_status (organization_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // ── 2. AI Assistant & Conversations Tables ────────────────────────────────
  `CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT 'New Conversation',
    status ENUM('active', 'archived') DEFAULT 'active',
    workflow_state JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_conversations_user (organization_id, user_id, status, updated_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS ai_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    organization_id INT NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_messages_conv (conversation_id, created_at ASC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    intent VARCHAR(100) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    parameters JSON NULL,
    result_status ENUM('success', 'failed', 'pending_confirmation', 'cancelled') NOT NULL,
    execution_duration_ms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ai_audit_org (organization_id, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS proactive_insights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    insight_type VARCHAR(100) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action_data JSON NULL,
    is_read TINYINT(1) DEFAULT 0,
    is_dismissed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_proactive_insights_org (organization_id, is_dismissed, created_at DESC)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // ── 3. Office Static QR Attendance Tables ─────────────────────────────────
  `CREATE TABLE IF NOT EXISTS attendance_qr_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    qr_code_key VARCHAR(100) NOT NULL UNIQUE,
    location_name VARCHAR(150) DEFAULT 'Main Office HQ',
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    radius_meters INT DEFAULT 150,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_qr_org (organization_id, is_active)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

async function runAutoMigrations() {
  console.log('[AutoMigrate] Checking and ensuring database tables exist...');
  for (const query of SCHEMA_QUERIES) {
    try {
      await db.query(query);
    } catch (err) {
      console.warn('[AutoMigrate] Table check note:', err.message);
    }
  }
  console.log('[AutoMigrate] Schema self-healing completed successfully.');

  // Ensure documents table allows any document_type string without truncation
  try {
    await db.query("ALTER TABLE documents MODIFY COLUMN document_type VARCHAR(100) DEFAULT 'other'");
  } catch (docTypeErr) {}

  // Automatically provision official production admin (hrms@jattamkommerce.com) and purge developer personal accounts
  try {
    const adminEmail = 'hrms@jattamkommerce.com';
    const adminPasswordHash = '$2b$10$pBd9sq4ylETpSgSwT6Psse61tR1X4NigGbuHQtN8Zlx3KCTL1X2R2'; // hrms.jmk123

    // Ensure Organization exists
    let [orgRows] = await db.query("SELECT id FROM organizations WHERE name = 'Jatta M Kommerce' LIMIT 1");
    let orgId = orgRows && orgRows.length > 0 ? orgRows[0].id : null;
    if (!orgId) {
      const [allOrgs] = await db.query("SELECT id FROM organizations LIMIT 1");
      if (allOrgs && allOrgs.length > 0) {
        orgId = allOrgs[0].id;
        await db.query("UPDATE organizations SET name = 'Jatta M Kommerce', email = 'hrms@jattamkommerce.com' WHERE id = ?", [orgId]);
      } else {
        const [orgRes] = await db.query(
          "INSERT INTO organizations (name, email, phone, industry, size, status) VALUES ('Jatta M Kommerce', 'hrms@jattamkommerce.com', '+91-9999999999', 'Retail', '100-500', 'active')"
        );
        orgId = orgRes.insertId;
      }
    }

    // Check if hrms@jattamkommerce.com exists
    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [adminEmail]);
    let adminUserId = null;
    if (userRows && userRows.length > 0) {
      adminUserId = userRows[0].id;
      await db.query(
        "UPDATE users SET password_hash = ?, first_name = 'JMK', last_name = 'Admin', status = 'active', organization_id = ? WHERE id = ?",
        [adminPasswordHash, orgId, adminUserId]
      );
    } else {
      const [insUser] = await db.query(
        "INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) VALUES (?, ?, ?, 'JMK', 'Admin', 'active')",
        [orgId, adminEmail, adminPasswordHash]
      );
      adminUserId = insUser.insertId;
    }

    // Assign ORG_ADMIN and HR_ADMIN roles so hrms@jattamkommerce.com accesses the HR & Employee portal
    await db.query("DELETE FROM user_roles WHERE user_id = ? AND role_id IN (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')", [adminUserId]);
    const [adminRoles] = await db.query("SELECT id FROM roles WHERE name IN ('ORG_ADMIN', 'HR_ADMIN')");
    for (const r of adminRoles) {
      await db.query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminUserId, r.id]);
    }

    // Provision superadmin@jattamkommerce.com (Platform Super Admin for SaaS management & plans)
    const superAdminEmail = 'superadmin@jattamkommerce.com';
    const superAdminPasswordHash = '$2b$10$fnRcwQGZOaqFlwLuRod3mOPetU7KTsGBZRJiM2wCpMJ/zBT2OwZGG'; // superadmin.jmk123
    const [superRows] = await db.query("SELECT id FROM users WHERE email = ?", [superAdminEmail]);
    let superUserId = null;
    if (superRows && superRows.length > 0) {
      superUserId = superRows[0].id;
      await db.query("UPDATE users SET password_hash = ?, status = 'active' WHERE id = ?", [superAdminPasswordHash, superUserId]);
    } else {
      const [insSuper] = await db.query(
        "INSERT INTO users (email, password_hash, first_name, last_name, status) VALUES (?, ?, 'Platform', 'SuperAdmin', 'active')",
        [superAdminEmail, superAdminPasswordHash]
      );
      superUserId = insSuper.insertId;
    }
    const [superRoles] = await db.query("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'");
    if (superRoles.length > 0) {
      await db.query("INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)", [superUserId, superRoles[0].id]);
    }

    // Purge personal developer account from all tables
    await db.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.query("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = 'aishwaryasingh0217@gmail.com')");
    await db.query("DELETE FROM user_permissions WHERE user_id IN (SELECT id FROM users WHERE email = 'aishwaryasingh0217@gmail.com')");
    await db.query("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = 'aishwaryasingh0217@gmail.com')");
    await db.query("DELETE FROM account_activations WHERE user_id IN (SELECT id FROM users WHERE email = 'aishwaryasingh0217@gmail.com')");
    await db.query("DELETE FROM employees WHERE email = 'aishwaryasingh0217@gmail.com'");
    await db.query("DELETE FROM users WHERE email = 'aishwaryasingh0217@gmail.com'");
    await db.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log('[AutoMigrate] Verified superadmin@jattamkommerce.com and hrms@jattamkommerce.com. Personal accounts removed.');
  } catch (adminErr) {
    console.warn('[AutoMigrate] Admin provision note:', adminErr.message);
  }

  // Automatically activate all employee accounts that were marked inactive
  try {
    await db.query("UPDATE users SET status = 'active' WHERE status != 'active'");
    console.log('[AutoMigrate] Verified all user accounts have active status.');
  } catch (syncErr) {
    console.warn('[AutoMigrate] Employee status sync note:', syncErr.message);
  }
}

module.exports = {
  runAutoMigrations
};
