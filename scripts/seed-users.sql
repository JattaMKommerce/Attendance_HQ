-- Seed a default Organization
INSERT INTO organizations (name, slug, domain, contact_email, subscription_plan_id, status) 
VALUES ('Acme Corp', 'acme', 'acme.com', 'admin@acme.com', 2, 'active');

SET @org_id = LAST_INSERT_ID();

-- Seed an Organization Admin
INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) 
VALUES (@org_id, 'admin@acme.com', '$2b$10$xOYsgf/2m8/LP4s.ta7itOq.MkzKjIlM5eeczHvgD1K0ZiL9XP7re', 'Alice', 'Admin', 'active');

SET @admin_id = LAST_INSERT_ID();

INSERT INTO user_roles (user_id, role_id) 
SELECT @admin_id, id FROM roles WHERE name = 'ORG_ADMIN';

-- Seed a Standard Employee
INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status) 
VALUES (@org_id, 'employee@acme.com', '$2b$10$xOYsgf/2m8/LP4s.ta7itOq.MkzKjIlM5eeczHvgD1K0ZiL9XP7re', 'Bob', 'Employee', 'active');

SET @emp_id = LAST_INSERT_ID();

INSERT INTO user_roles (user_id, role_id) 
SELECT @emp_id, id FROM roles WHERE name = 'EMPLOYEE';
