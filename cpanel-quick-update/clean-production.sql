SET FOREIGN_KEY_CHECKS = 0;

-- 1. Wipe all test employee records & child tables
DELETE FROM attendance_logs;
DELETE FROM attendance_records;
DELETE FROM attendance_regularization;
DELETE FROM leave_approval_history;
DELETE FROM leave_requests;
DELETE FROM leave_balances;
DELETE FROM payroll_items;
DELETE FROM payroll_records;
DELETE FROM payroll_runs;
DELETE FROM employee_education;
DELETE FROM employee_experiences;
DELETE FROM employee_incentives;
DELETE FROM employee_managers;
DELETE FROM employee_onboarding_tasks;
DELETE FROM employee_onboarding;
DELETE FROM employee_salaries;
DELETE FROM employee_status_history;
DELETE FROM account_activations;
DELETE FROM documents;

-- 2. Wipe employees & reset auto-increment so next employee is EMP-001
DELETE FROM employees;
ALTER TABLE employees AUTO_INCREMENT = 1;

-- 3. Purge personal developer accounts
DELETE FROM users WHERE email LIKE '%aishwarya%';

-- 4. Ensure Organization 'Jatta M Kommerce' (JMK) exists
INSERT INTO organizations (id, name, subdomain, email, status)
VALUES (1, 'Jatta M Kommerce', 'jmk', 'hrms@jattamkommerce.com', 'active')
ON DUPLICATE KEY UPDATE name = 'Jatta M Kommerce', subdomain = 'jmk', status = 'active';

-- 5. Configure JMK HR & Organization Admin (Portal: /app/dashboard)
INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, status)
VALUES (
    1, 
    1, 
    'hrms@jattamkommerce.com', 
    '$2b$10$pBd9sq4ylETpSgSwT6Psse61tR1X4NigGbuHQtN8Zlx3KCTL1X2R2', 
    'JMK', 
    'HR Admin', 
    'active'
)
ON DUPLICATE KEY UPDATE 
    email = 'hrms@jattamkommerce.com',
    password_hash = '$2b$10$pBd9sq4ylETpSgSwT6Psse61tR1X4NigGbuHQtN8Zlx3KCTL1X2R2',
    first_name = 'JMK',
    last_name = 'HR Admin',
    status = 'active',
    organization_id = 1;

-- Assign ORG_ADMIN (2) and HR_ADMIN (3) to HR Admin user (id 1)
DELETE FROM user_roles WHERE user_id = 1;
INSERT INTO user_roles (user_id, role_id) VALUES (1, 2), (1, 3);

-- 6. Configure SaaS Platform Super Admin (Portal: /platform/plans & dashboard)
INSERT INTO users (email, password_hash, first_name, last_name, status)
VALUES (
    'superadmin@jattamkommerce.com', 
    '$2b$10$fnRcwQGZOaqFlwLuRod3mOPetU7KTsGBZRJiM2wCpMJ/zBT2OwZGG', 
    'Platform', 
    'SuperAdmin', 
    'active'
)
ON DUPLICATE KEY UPDATE 
    password_hash = '$2b$10$fnRcwQGZOaqFlwLuRod3mOPetU7KTsGBZRJiM2wCpMJ/zBT2OwZGG',
    first_name = 'Platform',
    last_name = 'SuperAdmin',
    status = 'active';

-- Assign SUPER_ADMIN (1) role to superadmin@jattamkommerce.com
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT id, 1 FROM users WHERE email = 'superadmin@jattamkommerce.com';

SET FOREIGN_KEY_CHECKS = 1;
