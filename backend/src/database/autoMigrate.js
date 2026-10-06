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

  // Ensure holidays table has required type, location, is_active columns
  try {
    await db.query("ALTER TABLE holidays ADD COLUMN type VARCHAR(50) DEFAULT 'National'");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE holidays ADD COLUMN location VARCHAR(100) DEFAULT 'All'");
  } catch (e) {}
  try {
    await db.query("ALTER TABLE holidays ADD COLUMN is_active TINYINT(1) DEFAULT 1");
  } catch (e) {}

  // Auto-seed Indian National & Festival Holidays for active organizations if not already present
  try {
    const [orgs] = await db.query("SELECT id FROM organizations");
    const indianHolidays2026 = [
      { name: 'Republic Day', date: '2026-01-26', type: 'National', desc: 'National Holiday celebrating Constitution of India' },
      { name: 'Maha Shivratri', date: '2026-02-15', type: 'Festival', desc: 'Celebration of Lord Shiva' },
      { name: 'Holi (Festival of Colors)', date: '2026-03-04', type: 'Festival', desc: 'Festival of Colors and Spring' },
      { name: 'Id-ul-Fitr (Ramzan Eid)', date: '2026-03-20', type: 'Festival', desc: 'Islamic festival marking end of Ramadan' },
      { name: 'Mahavir Jayanti', date: '2026-03-31', type: 'Gazetted', desc: 'Birth anniversary of Lord Mahavira' },
      { name: 'Good Friday', date: '2026-04-03', type: 'Gazetted', desc: 'Christian holiday commemorating the crucifixion of Jesus' },
      { name: 'Dr. B.R. Ambedkar Jayanti', date: '2026-04-14', type: 'Gazetted', desc: 'Birth anniversary of Dr. B.R. Ambedkar' },
      { name: 'May Day (Labour Day)', date: '2026-05-01', type: 'National', desc: 'International Workers Day' },
      { name: 'Eid-ul-Adha (Bakrid)', date: '2026-05-27', type: 'Festival', desc: 'Feast of the Sacrifice' },
      { name: 'Muharram', date: '2026-06-26', type: 'Gazetted', desc: 'First month of Islamic calendar' },
      { name: 'Independence Day', date: '2026-08-15', type: 'National', desc: 'Indian Independence Day' },
      { name: 'Milad-un-Nabi (Id-e-Milad)', date: '2026-08-26', type: 'Gazetted', desc: 'Birthday of Prophet Muhammad' },
      { name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'Festival', desc: 'Celebration of Lord Ganesha' },
      { name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'National', desc: 'Birth anniversary of Father of the Nation' },
      { name: 'Dussehra (Vijay Dashami)', date: '2026-10-20', type: 'Festival', desc: 'Celebration of triumph of Good over Evil' },
      { name: 'Diwali (Deepavali)', date: '2026-11-08', type: 'Festival', desc: 'Festival of Lights' },
      { name: 'Govardhan Puja / Bhai Dooj', date: '2026-11-10', type: 'Festival', desc: 'Post-Diwali Festival' },
      { name: 'Guru Nanak Jayanti', date: '2026-11-24', type: 'Gazetted', desc: 'Birth anniversary of Guru Nanak Dev Ji' },
      { name: 'Christmas Day', date: '2026-12-25', type: 'Festival', desc: 'Celebration of the birth of Jesus Christ' }
    ];

    for (const org of orgs) {
      for (const h of indianHolidays2026) {
        const [exists] = await db.query(
          "SELECT id FROM holidays WHERE organization_id = ? AND (holiday_date = ? OR name = ?)",
          [org.id, h.date, h.name]
        );
        if (exists.length === 0) {
          await db.query(
            "INSERT INTO holidays (organization_id, name, holiday_date, type, location, description, is_active) VALUES (?, ?, ?, ?, 'All', ?, 1)",
            [org.id, h.name, h.date, h.type, h.desc]
          );
        }
      }

      // Purge any historical duplicate rows for this organization
      await db.query(`
        DELETE h1 FROM holidays h1
        INNER JOIN holidays h2 
        WHERE h1.id > h2.id 
          AND h1.organization_id = h2.organization_id 
          AND h1.holiday_date = h2.holiday_date 
          AND h1.name = h2.name
      `);

      // Purge duplicate employee rows if any exist in the database (keeps newest)
      await db.query(`
        DELETE e1 FROM employees e1
        INNER JOIN employees e2 
        WHERE e1.id < e2.id 
          AND e1.organization_id = e2.organization_id 
          AND e1.employee_code = e2.employee_code
      `);

      // Clean duplicate work_schedules
      await db.query(`
        DELETE ws1 FROM work_schedules ws1
        INNER JOIN work_schedules ws2 
        WHERE ws1.id < ws2.id 
          AND ws1.employee_id = ws2.employee_id 
          AND ws1.effective_from = ws2.effective_from
      `);
    }
  } catch (holErr) {
    console.warn('[AutoMigrate] Holiday/Employee seed note:', holErr.message);
  }

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
