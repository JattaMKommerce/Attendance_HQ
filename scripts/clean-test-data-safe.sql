-- ═══════════════════════════════════════════════════════════════════════════
-- JMK HRMS — Clean Production Slate for Jatta M Kommerce
-- 
-- PURPOSE: 
--   1. Ensures the official organization "Jatta M Kommerce" is active.
--   2. Creates the official Super Admin account:
--        • Email:    hrms@jattamkommerce.com
--        • Password: hrms.jmk123
--   3. Completely purges developer personal accounts (aishwaryasingh0217@gmail.com)
--      and all test/dummy users, tokens, and permissions.
--   4. Wipes all test employees, dummy attendance, fake leaves & test payroll
--      so real employee onboarding starts cleanly from EMP-001 with 0 employees.
-- ═══════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ─── 1. Ensure Organization "Jatta M Kommerce" ──────────────────────────────
INSERT INTO organizations (id, name, email, phone, industry, size, status, created_at)
VALUES (1, 'Jatta M Kommerce', 'hrms@jattamkommerce.com', '+91-9999999999', 'Retail', '100-500', 'active', NOW())
ON DUPLICATE KEY UPDATE 
    name = 'Jatta M Kommerce',
    email = 'hrms@jattamkommerce.com',
    status = 'active';

-- ─── 2. Ensure Official Super Admin (hrms@jattamkommerce.com / hrms.jmk123) ─
-- Bcrypt Hash of "hrms.jmk123": $2b$10$pBd9sq4ylETpSgSwT6Psse61tR1X4NigGbuHQtN8Zlx3KCTL1X2R2
INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status, created_at)
VALUES (
    1,
    'hrms@jattamkommerce.com',
    '$2b$10$pBd9sq4ylETpSgSwT6Psse61tR1X4NigGbuHQtN8Zlx3KCTL1X2R2',
    'JMK',
    'Admin',
    'active',
    NOW()
)
ON DUPLICATE KEY UPDATE 
    password_hash = '$2b$10$pBd9sq4ylETpSgSwT6Psse61tR1X4NigGbuHQtN8Zlx3KCTL1X2R2',
    first_name = 'JMK',
    last_name = 'Admin',
    status = 'active';

-- Get ID of hrms@jattamkommerce.com
SET @admin_user_id = (SELECT id FROM users WHERE email = 'hrms@jattamkommerce.com' LIMIT 1);

-- Ensure Roles exist
INSERT IGNORE INTO roles (name, description, is_system_role) VALUES
('SUPER_ADMIN', 'Super Administrator with full system control', 1),
('ORG_ADMIN', 'Organization Administrator', 1),
('HR_ADMIN', 'Human Resources Administrator', 1),
('EMPLOYEE', 'Standard Employee Portal User', 1),
('MANAGER', 'Team Manager', 1);

-- Assign SUPER_ADMIN and ORG_ADMIN roles to hrms@jattamkommerce.com
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT @admin_user_id, id FROM roles WHERE name IN ('SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN');

-- ─── 3. Purge Developer Personal Accounts & All Test Users ──────────────────
DELETE FROM user_roles WHERE user_id != @admin_user_id;
DELETE FROM user_permissions WHERE user_id != @admin_user_id;
DELETE FROM refresh_tokens WHERE user_id != @admin_user_id;
DELETE FROM account_activations WHERE user_id != @admin_user_id;
DELETE FROM users WHERE id != @admin_user_id;

-- ─── 4. Wipe All Test Employees & Child Records (Clean 0 Slate) ─────────────
DELETE FROM attendance_records;
DELETE FROM attendance_logs;
DELETE FROM attendance_regularization;

DELETE FROM leave_requests;
DELETE FROM leave_balances;
DELETE FROM leave_approval_history;

DELETE FROM payslips;
DELETE FROM payroll_runs;
DELETE FROM payroll_records;
DELETE FROM payroll_items;

DELETE FROM performance_reviews;
DELETE FROM performance_feedback;
DELETE FROM goal_updates;
DELETE FROM goals;
DELETE FROM candidate_resumes;
DELETE FROM candidate_status_history;
DELETE FROM candidates;
DELETE FROM job_openings;

DELETE FROM employee_experiences;
DELETE FROM employee_education;
DELETE FROM employee_onboarding_tasks;
DELETE FROM employee_onboarding;
DELETE FROM employee_status_history;
DELETE FROM employee_salaries;
DELETE FROM employee_managers;
DELETE FROM employee_incentives;
DELETE FROM work_schedules;
DELETE FROM rosters;
DELETE FROM asset_assignments;
DELETE FROM expense_approval_history;
DELETE FROM expenses;
DELETE FROM task_assignments;
DELETE FROM document_access;
DELETE FROM documents;
DELETE FROM account_activations;
DELETE FROM employees;

DELETE FROM notifications;
DELETE FROM announcement_audiences;
DELETE FROM announcements;
DELETE FROM social_post_reports;
DELETE FROM social_post_comments;
DELETE FROM social_post_likes;
DELETE FROM social_post_media;
DELETE FROM social_posts;

DELETE FROM ai_messages;
DELETE FROM ai_conversations;
DELETE FROM ai_insights;
DELETE FROM ai_action_logs;
DELETE FROM ai_usage_logs;

-- ─── 5. Reset Auto-Increment Counters (EMP-001 starts fresh) ────────────────
ALTER TABLE employees AUTO_INCREMENT = 1;
ALTER TABLE account_activations AUTO_INCREMENT = 1;
ALTER TABLE attendance_records AUTO_INCREMENT = 1;
ALTER TABLE attendance_logs AUTO_INCREMENT = 1;
ALTER TABLE attendance_regularization AUTO_INCREMENT = 1;
ALTER TABLE leave_requests AUTO_INCREMENT = 1;
ALTER TABLE payslips AUTO_INCREMENT = 1;
ALTER TABLE payroll_runs AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE social_posts AUTO_INCREMENT = 1;

-- ─── 6. Master Departments (Preserved & Ready) ──────────────────────────────
INSERT IGNORE INTO departments (organization_id, name, description) VALUES
(1, 'Technology', 'Software Engineering, Product, and IT Operations'),
(1, 'Human Resources', 'Talent Acquisition, People Operations, and Culture'),
(1, 'Sales & Marketing', 'Enterprise Growth, Brand, and Business Development'),
(1, 'Operations', 'Daily Operational Logistics and Supply Chain'),
(1, 'Finance', 'Financial Strategy, Accounting, and Payroll'),
(1, 'Customer Support', 'Client Relations and Technical Support');

-- ─── 7. Master Designations (Preserved & Ready) ──────────────────────────────
INSERT IGNORE INTO designations (organization_id, name, level) VALUES
(1, 'Software Engineer', 1),
(1, 'Senior Software Engineer', 2),
(1, 'Lead Engineer', 3),
(1, 'Engineering Manager', 4),
(1, 'HR Executive', 1),
(1, 'HR Manager', 3),
(1, 'Operations Associate', 1),
(1, 'Operations Manager', 3),
(1, 'Financial Analyst', 2),
(1, 'Marketing Specialist', 2);

-- ─── 8. Master Shift & Leave Policies ───────────────────────────────────────
INSERT IGNORE INTO shifts (id, organization_id, name, start_time, end_time, break_duration_minutes)
VALUES (1, 1, 'General Shift', '09:00:00', '18:00:00', 60);

INSERT IGNORE INTO leave_types (id, organization_id, name, description, color_code, is_paid, max_consecutive_days) VALUES
(1, 1, 'Casual Leave', 'Casual and short personal leave', '#3b82f6', 1, 5),
(2, 1, 'Sick Leave', 'Medical and health leave', '#ef4444', 1, 14),
(3, 1, 'Earned Leave', 'Annual privilege leave', '#10b981', 1, 21);

INSERT IGNORE INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, carry_forward_expiry_months) VALUES
(1, 1, 12, 0, 0),
(1, 2, 12, 5, 12),
(1, 3, 18, 10, 12);

SET FOREIGN_KEY_CHECKS = 1;
