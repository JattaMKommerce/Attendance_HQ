-- seed-holidays-and-leave-policy.sql
-- Indian National Holidays & 1-Paid-Leave-Per-Month Policy

-- 1. Ensure holidays table has required columns
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'National';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'All';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Seed Indian National & Gazetted Holidays for 2026 (for all active organizations)
INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Republic Day', '2026-01-26', 'National', 'All', 'National Holiday celebrating the Constitution of India', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Maha Shivratri', '2026-02-15', 'Gazetted', 'All', 'Celebration of Lord Shiva', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Holi (Festival of Colors)', '2026-03-04', 'Gazetted', 'All', 'Festival of Colors and Spring', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Id-ul-Fitr (Ramzan Eid)', '2026-03-20', 'Gazetted', 'All', 'Islamic festival marking the end of Ramadan', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Mahavir Jayanti', '2026-03-31', 'Gazetted', 'All', 'Birth anniversary of Lord Mahavira', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Good Friday', '2026-04-03', 'Gazetted', 'All', 'Christian holiday commemorating the crucifixion of Jesus', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Eid-ul-Adha (Bakrid)', '2026-05-27', 'Gazetted', 'All', 'Feast of the Sacrifice', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Muharram', '2026-06-26', 'Gazetted', 'All', 'First month of Islamic calendar', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Independence Day', '2026-08-15', 'National', 'All', 'National Holiday celebrating Indian Independence', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Milad-un-Nabi (Id-e-Milad)', '2026-08-26', 'Gazetted', 'All', 'Birthday of Prophet Muhammad', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Mahatma Gandhi Jayanti', '2026-10-02', 'National', 'All', 'Birth anniversary of Father of the Nation Mahatma Gandhi', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Dussehra (Vijay Dashami)', '2026-10-20', 'Gazetted', 'All', 'Celebration of triumph of Good over Evil', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Diwali (Deepavali)', '2026-11-08', 'Gazetted', 'All', 'Festival of Lights', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Guru Nanak Jayanti', '2026-11-24', 'Gazetted', 'All', 'Birth anniversary of Guru Nanak Dev Ji', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Christmas Day', '2026-12-25', 'Gazetted', 'All', 'Celebration of the birth of Jesus Christ', TRUE
FROM organizations o;

-- 2027 Major National Holidays
INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Republic Day', '2027-01-26', 'National', 'All', 'National Holiday celebrating the Constitution of India', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Independence Day', '2027-08-15', 'National', 'All', 'National Holiday celebrating Indian Independence', TRUE
FROM organizations o;

INSERT IGNORE INTO holidays (organization_id, name, holiday_date, type, location, description, is_active)
SELECT o.id, 'Mahatma Gandhi Jayanti', '2027-10-02', 'National', 'All', 'Birth anniversary of Mahatma Gandhi', TRUE
FROM organizations o;

-- 3. Set Company Policy: 1 Paid Leave per month for all employees
UPDATE employees SET monthly_paid_leaves = 1 WHERE monthly_paid_leaves IS NULL OR monthly_paid_leaves = 2;
ALTER TABLE employees MODIFY COLUMN monthly_paid_leaves INT DEFAULT 1;
