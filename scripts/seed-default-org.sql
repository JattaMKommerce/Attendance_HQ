-- ═══════════════════════════════════════════════════════════════════════════
-- JMK HRMS — Default Organization Seed Script (Production Ready)
-- 
-- PURPOSE: Seed the "Jatta M Kommerce" organization with ORG_ADMIN user,
--          default departments, designations, leave types, holidays, shift,
--          and an initial social feed post.
--          Enables onboarding of 300+ employees without plan restrictions.
--
-- ⚠️  Run AFTER clean-test-data.sql
-- ═══════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ─── 0. Ensure Subscription Plans Support 300+ Employees ────────────────────
UPDATE plans SET max_employees = 1000 WHERE name = 'Professional';
UPDATE plans SET max_employees = 5000 WHERE name = 'Enterprise';

-- ─── 1. Create the Organization (Enterprise Capacity) ───────────────────────
INSERT INTO organizations (name, email, phone, industry, size, status, subscription_plan_id, created_at)
VALUES (
    'Jatta M Kommerce',
    'admin@jattamkommerce.com',
    '+91-9999999999',
    'Retail',
    '100-500',
    'active',
    (SELECT id FROM plans WHERE name = 'Enterprise' LIMIT 1),
    NOW()
);

SET @org_id = LAST_INSERT_ID();

-- ─── 2. Create ORG_ADMIN user ────────────────────────────────────────────────
-- Password: password123 (bcrypt hash)
INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status, created_at)
VALUES (
    @org_id,
    'admin@jattamkommerce.com',
    '$2b$10$xOYsgf/2m8/LP4s.ta7itOq.MkzKjIlM5eeczHvgD1K0ZiL9XP7re',
    'JMK',
    'Admin',
    'active',
    NOW()
);

SET @admin_user_id = LAST_INSERT_ID();

-- Assign ORG_ADMIN role
INSERT INTO user_roles (user_id, role_id)
SELECT @admin_user_id, r.id FROM roles r WHERE r.name = 'ORG_ADMIN' AND r.is_system_role = 1 LIMIT 1;

-- ─── 3. Departments ──────────────────────────────────────────────────────────
INSERT INTO departments (organization_id, name, description, created_at) VALUES
(@org_id, 'Human Resources', 'HR and People Operations', NOW()),
(@org_id, 'Technology', 'Software Engineering and IT', NOW()),
(@org_id, 'Sales & Marketing', 'Sales, Marketing and Business Development', NOW()),
(@org_id, 'Operations', 'Operations and Supply Chain', NOW()),
(@org_id, 'Finance', 'Finance, Accounting and Payroll', NOW()),
(@org_id, 'Customer Support', 'Customer Service and Success', NOW());

-- ─── 4. Designations ─────────────────────────────────────────────────────────
INSERT INTO designations (organization_id, name, level, created_at) VALUES
(@org_id, 'HR Manager', 'Manager', NOW()),
(@org_id, 'HR Executive', 'Staff', NOW()),
(@org_id, 'Software Engineer', 'Staff', NOW()),
(@org_id, 'Senior Software Engineer', 'Senior', NOW()),
(@org_id, 'Team Lead', 'Manager', NOW()),
(@org_id, 'Sales Executive', 'Staff', NOW()),
(@org_id, 'Operations Manager', 'Manager', NOW()),
(@org_id, 'Accountant', 'Staff', NOW()),
(@org_id, 'Customer Support Executive', 'Staff', NOW()),
(@org_id, 'Intern', 'Intern', NOW());

-- ─── 5. Default Shift ────────────────────────────────────────────────────────
INSERT INTO shifts (organization_id, name, start_time, end_time, break_duration_minutes, is_active, created_at)
VALUES (@org_id, 'General Shift', '09:00:00', '18:00:00', 60, 1, NOW());

-- ─── 6. Leave Types & Policies ───────────────────────────────────────────────
INSERT INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment, max_consecutive_days, created_at) VALUES
(@org_id, 'Casual Leave', 'For personal or family emergencies', '#2563eb', 1, 0, 3, NOW()),
(@org_id, 'Sick Leave', 'For illness or medical appointments', '#16a34a', 1, 0, 7, NOW()),
(@org_id, 'Earned Leave', 'Earned based on working days', '#7c3aed', 1, 0, 30, NOW()),
(@org_id, 'Maternity Leave', 'Maternity leave benefit', '#db2777', 1, 1, 180, NOW()),
(@org_id, 'Paternity Leave', 'Paternity leave benefit', '#0284c7', 1, 0, 15, NOW()),
(@org_id, 'Loss of Pay', 'Leave without pay', '#dc2626', 0, 0, 30, NOW());

-- Leave Policies (days per year)
INSERT INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, carry_forward_expiry_months, created_at)
SELECT @org_id, lt.id,
    CASE lt.name
        WHEN 'Casual Leave'   THEN 12
        WHEN 'Sick Leave'     THEN 12
        WHEN 'Earned Leave'   THEN 18
        WHEN 'Maternity Leave' THEN 182
        WHEN 'Paternity Leave' THEN 15
        WHEN 'Loss of Pay'    THEN 0
    END,
    CASE lt.name
        WHEN 'Earned Leave' THEN 15
        ELSE 0
    END,
    12,
    NOW()
FROM leave_types lt
WHERE lt.organization_id = @org_id;

-- ─── 7. Public Holidays (India 2026) ─────────────────────────────────────────
INSERT INTO holidays (organization_id, name, holiday_date, description, is_optional, created_at) VALUES
(@org_id, 'Republic Day',                '2026-01-26', 'National Holiday', 0, NOW()),
(@org_id, 'Holi',                        '2026-03-04', 'Festival of Colors', 0, NOW()),
(@org_id, 'Good Friday',                 '2026-04-03', 'Christian Holiday', 0, NOW()),
(@org_id, 'Dr. Ambedkar Jayanti',        '2026-04-14', 'National Holiday', 0, NOW()),
(@org_id, 'Ram Navami',                  '2026-04-26', 'Hindu Festival', 1, NOW()),
(@org_id, 'Labour Day',                  '2026-05-01', 'International Workers Day', 0, NOW()),
(@org_id, 'Eid ul-Adha',                 '2026-06-07', 'Islamic Festival', 1, NOW()),
(@org_id, 'Independence Day',            '2026-08-15', 'National Holiday', 0, NOW()),
(@org_id, 'Ganesh Chaturthi',            '2026-08-22', 'Hindu Festival', 1, NOW()),
(@org_id, 'Gandhi Jayanti',              '2026-10-02', 'National Holiday', 0, NOW()),
(@org_id, 'Dussehra',                    '2026-10-22', 'Hindu Festival', 1, NOW()),
(@org_id, 'Diwali',                      '2026-11-10', 'Festival of Lights', 0, NOW()),
(@org_id, 'Diwali Holiday',              '2026-11-11', 'Festival Holiday', 0, NOW()),
(@org_id, 'Guru Nanak Jayanti',          '2026-11-23', 'Sikh Festival', 1, NOW()),
(@org_id, 'Christmas Day',               '2026-12-25', 'Christian Holiday', 0, NOW());

-- ─── 8. Welcome Announcement ─────────────────────────────────────────────────
INSERT INTO announcements (organization_id, created_by, title, content, status, created_at)
VALUES (
    @org_id,
    @admin_user_id,
    'Welcome to JMK HRMS!',
    'We are excited to launch the official JMK HRMS employee portal. You can now manage your attendance, leaves, payslips, and collaborate with your team — all in one place.',
    'published',
    NOW()
);

-- ─── 9. Initial Welcome Social Feed Post ─────────────────────────────────────
INSERT INTO social_posts (organization_id, author_id, content, post_type, created_at)
VALUES (
    @org_id,
    @admin_user_id,
    '🎉 Welcome to the Jatta M Kommerce team! We are thrilled to welcome all our new team members to JMK HRMS. Feel free to share your updates, milestones, and connect with colleagues here on our company social feed.',
    'announcement',
    NOW()
);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 
    CONCAT('Organization ID: ', @org_id) AS setup_info
UNION ALL
SELECT CONCAT('Admin User ID: ', @admin_user_id)
UNION ALL
SELECT 'Admin Email: admin@jattamkommerce.com'
UNION ALL
SELECT 'Admin Password: password123 (change after first login)'
UNION ALL
SELECT 'Plan: Enterprise (Capacity: Up to 5,000 employees)'
UNION ALL
SELECT 'Status: READY — You can now onboard your 300 employees via Admin Portal.';
