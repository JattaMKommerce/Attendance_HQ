-- ═══════════════════════════════════════════════════════════════════════════
-- JMK HRMS — Production Clean Slate Script
-- 
-- PURPOSE: Remove ALL test employees, users, and org data from MySQL
--          while keeping schema, roles, permissions, plans, and superadmin.
--          Resets all AUTO_INCREMENT counters to 1.
--
-- ⚠️  IRREVERSIBLE — Run in phpMyAdmin before onboarding real employees.
-- ⚠️  Run this FIRST, then run seed-default-org.sql.
-- ═══════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ─── 0. Ensure JMK Social Tables Exist ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_posts (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_post_media (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_post_user_like (post_id, user_id),
    INDEX idx_social_likes_post (post_id),
    INDEX idx_social_likes_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_post_comments (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_post_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    post_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_social_reports_org_status (organization_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 1. Attendance Data ──────────────────────────────────────────────────────
TRUNCATE TABLE attendance_records;
TRUNCATE TABLE attendance_logs;
TRUNCATE TABLE attendance_regularizations;

-- ─── 2. Leave Data ───────────────────────────────────────────────────────────
TRUNCATE TABLE leave_requests;
TRUNCATE TABLE leave_balances;
TRUNCATE TABLE leave_approval_history;
TRUNCATE TABLE leave_types;
TRUNCATE TABLE leave_policies;

-- ─── 3. Payroll Data ─────────────────────────────────────────────────────────
TRUNCATE TABLE payslips;
TRUNCATE TABLE payroll_runs;
TRUNCATE TABLE salary_structures;
TRUNCATE TABLE salary_components;
TRUNCATE TABLE employee_salary_adjustments;

-- ─── 4. Employee Profiles & Schedules ────────────────────────────────────────
TRUNCATE TABLE employee_experiences;
TRUNCATE TABLE employee_education;
TRUNCATE TABLE employee_onboarding;
TRUNCATE TABLE employee_managers;
TRUNCATE TABLE work_schedules;
TRUNCATE TABLE shifts;
TRUNCATE TABLE roster_templates;
TRUNCATE TABLE rosters;
TRUNCATE TABLE documents;
TRUNCATE TABLE employees;

-- ─── 5. Social & Communications ──────────────────────────────────────────────
TRUNCATE TABLE announcements;
TRUNCATE TABLE notifications;
TRUNCATE TABLE social_post_reports;
TRUNCATE TABLE social_post_comments;
TRUNCATE TABLE social_post_likes;
TRUNCATE TABLE social_post_media;
TRUNCATE TABLE social_posts;

-- ─── 6. Recruitment & Performance ────────────────────────────────────────────
TRUNCATE TABLE recruitment_jobs;
TRUNCATE TABLE job_applications;
TRUNCATE TABLE performance_reviews;
TRUNCATE TABLE performance_goals;
TRUNCATE TABLE kpi_records;

-- ─── 7. Organization Structure ───────────────────────────────────────────────
TRUNCATE TABLE departments;
TRUNCATE TABLE designations;
TRUNCATE TABLE holidays;

-- ─── 8. AI Data ──────────────────────────────────────────────────────────────
TRUNCATE TABLE ai_conversations;
TRUNCATE TABLE ai_messages;
TRUNCATE TABLE ai_insights;

-- ─── 9. User Authentication & Tokens ─────────────────────────────────────────
TRUNCATE TABLE account_activations;
DELETE FROM refresh_tokens WHERE user_id IN (
    SELECT id FROM users WHERE email != 'superadmin@hrms.com'
);
DELETE FROM login_history WHERE user_id IN (
    SELECT id FROM users WHERE email != 'superadmin@hrms.com'
);
TRUNCATE TABLE audit_logs;

-- ─── 10. Remove All Users EXCEPT SuperAdmin ──────────────────────────────────
DELETE FROM user_roles WHERE user_id IN (
    SELECT id FROM users WHERE email != 'superadmin@hrms.com'
);
DELETE FROM user_permissions WHERE user_id IN (
    SELECT id FROM users WHERE email != 'superadmin@hrms.com'
);
DELETE FROM users WHERE email != 'superadmin@hrms.com';

-- ─── 11. Remove Organizations ────────────────────────────────────────────────
TRUNCATE TABLE organizations;

-- ─── 12. Reset AUTO_INCREMENT Counters to 1 ──────────────────────────────────
ALTER TABLE employees AUTO_INCREMENT = 1;
ALTER TABLE organizations AUTO_INCREMENT = 1;
ALTER TABLE departments AUTO_INCREMENT = 1;
ALTER TABLE designations AUTO_INCREMENT = 1;
ALTER TABLE leave_types AUTO_INCREMENT = 1;
ALTER TABLE holidays AUTO_INCREMENT = 1;
ALTER TABLE shifts AUTO_INCREMENT = 1;
ALTER TABLE social_posts AUTO_INCREMENT = 1;
ALTER TABLE social_post_media AUTO_INCREMENT = 1;
ALTER TABLE social_post_likes AUTO_INCREMENT = 1;
ALTER TABLE social_post_comments AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Clean complete. All test data wiped. Next step: run seed-default-org.sql.' AS status;
