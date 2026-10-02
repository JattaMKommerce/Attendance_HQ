-- =========================================================================
-- ONE-CLICK SQL FIX FOR EMPLOYEE LOGIN & INSTANT ACTIVATION
-- Run this in cPanel phpMyAdmin -> Database: jattahrm_db
-- =========================================================================

-- 1. Ensure all employee user accounts are set to 'active'
UPDATE users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
SET u.status = 'active'
WHERE r.name = 'EMPLOYEE';

-- 2. Activate any user account that has an employee profile
UPDATE users SET status = 'active' 
WHERE id IN (SELECT user_id FROM employees WHERE user_id IS NOT NULL);

-- 3. Reset password for employee aishwarya.jattamkommerce@gmail.com to www23
-- (Bcrypt hash: $2b$10$y.WfGb5e8GFyydlMe6tANemA05pApOomC38bjQPIs8DdeKcNSHcsm)
UPDATE users 
SET password_hash = '$2b$10$y.WfGb5e8GFyydlMe6tANemA05pApOomC38bjQPIs8DdeKcNSHcsm', 
    status = 'active' 
WHERE email = 'aishwarya.jattamkommerce@gmail.com';

-- 4. Verify the updated user record
SELECT id, organization_id, email, first_name, last_name, status, created_at 
FROM users 
WHERE email = 'aishwarya.jattamkommerce@gmail.com';
