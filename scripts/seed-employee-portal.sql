-- Seed Employee record for user_id = 3 (employee@acme.com) if not exists
INSERT INTO employees (
    organization_id, user_id, employee_code, first_name, last_name, email, phone,
    joining_date, employment_type, department_id, designation_id, status,
    current_address, permanent_address, emergency_contact_name, emergency_contact_phone,
    blood_group, office_state, office_city
) VALUES (
    1, 3, 'EMP-004', 'Bob', 'Employee', 'employee@acme.com', '9876543210',
    '2025-01-15', 'full_time', 1, 2, 'active',
    '123 Tech Park Road, Bengaluru', '123 Tech Park Road, Bengaluru', 'Alice Employee', '9876543211',
    'O+', 'KA', 'Bengaluru'
) ON DUPLICATE KEY UPDATE 
    user_id = VALUES(user_id),
    first_name = VALUES(first_name),
    last_name = VALUES(last_name);

-- Capture Bob's employee id
SET @bob_id = (SELECT id FROM employees WHERE email = 'employee@acme.com' LIMIT 1);

-- Seed Shift if not exists
INSERT INTO shifts (organization_id, name, start_time, end_time, break_duration_minutes)
SELECT 1, 'General Shift', '09:00:00', '18:00:00', 60
WHERE NOT EXISTS (SELECT 1 FROM shifts WHERE organization_id = 1 AND name = 'General Shift');

SET @shift_id = (SELECT id FROM shifts WHERE organization_id = 1 AND name = 'General Shift' LIMIT 1);

-- Assign Bob to shift
INSERT INTO work_schedules (organization_id, employee_id, shift_id, effective_from)
SELECT 1, @bob_id, @shift_id, '2025-01-01'
WHERE NOT EXISTS (SELECT 1 FROM work_schedules WHERE employee_id = @bob_id);

-- Seed Leave Types
INSERT INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment)
SELECT 1, 'Casual Leave', 'Paid time off for personal matters', '#3b82f6', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE organization_id = 1 AND name = 'Casual Leave');

INSERT INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment)
SELECT 1, 'Sick Leave', 'Time off for illness or medical appointments', '#10b981', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE organization_id = 1 AND name = 'Sick Leave');

INSERT INTO leave_types (organization_id, name, description, color_code, is_paid, requires_attachment)
SELECT 1, 'Earned Leave', 'Annual vacation leave', '#f59e0b', TRUE, FALSE
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE organization_id = 1 AND name = 'Earned Leave');

-- Seed Leave Policies
SET @cl_id = (SELECT id FROM leave_types WHERE organization_id = 1 AND name = 'Casual Leave' LIMIT 1);
SET @sl_id = (SELECT id FROM leave_types WHERE organization_id = 1 AND name = 'Sick Leave' LIMIT 1);
SET @el_id = (SELECT id FROM leave_types WHERE organization_id = 1 AND name = 'Earned Leave' LIMIT 1);

INSERT INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, accrual_type)
SELECT 1, @cl_id, 12, 0, 'annual'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE leave_type_id = @cl_id);

INSERT INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, accrual_type)
SELECT 1, @sl_id, 10, 0, 'annual'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE leave_type_id = @sl_id);

INSERT INTO leave_policies (organization_id, leave_type_id, yearly_allowance, max_carry_forward, accrual_type)
SELECT 1, @el_id, 15, 5, 'annual'
WHERE NOT EXISTS (SELECT 1 FROM leave_policies WHERE leave_type_id = @el_id);

-- Initialize Bob's leave balances for 2026
INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year, allocated, used, carried_forward)
SELECT 1, @bob_id, @cl_id, 2026, 12.0, 0.0, 0.0
WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = @bob_id AND leave_type_id = @cl_id AND year = 2026);

INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year, allocated, used, carried_forward)
SELECT 1, @bob_id, @sl_id, 2026, 10.0, 0.0, 0.0
WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = @bob_id AND leave_type_id = @sl_id AND year = 2026);

INSERT INTO leave_balances (organization_id, employee_id, leave_type_id, year, allocated, used, carried_forward)
SELECT 1, @bob_id, @el_id, 2026, 15.0, 0.0, 0.0
WHERE NOT EXISTS (SELECT 1 FROM leave_balances WHERE employee_id = @bob_id AND leave_type_id = @el_id AND year = 2026);

-- Seed Holidays for organization 1
INSERT INTO holidays (organization_id, name, holiday_date, description, is_optional)
SELECT 1, 'Gandhi Jayanti', '2026-10-02', 'National Holiday', FALSE
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE organization_id = 1 AND holiday_date = '2026-10-02');

INSERT INTO holidays (organization_id, name, holiday_date, description, is_optional)
SELECT 1, 'Diwali', '2026-11-08', 'Festival of Lights', FALSE
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE organization_id = 1 AND holiday_date = '2026-11-08');

INSERT INTO holidays (organization_id, name, holiday_date, description, is_optional)
SELECT 1, 'Christmas', '2026-12-25', 'Christmas Day', FALSE
WHERE NOT EXISTS (SELECT 1 FROM holidays WHERE organization_id = 1 AND holiday_date = '2026-12-25');

-- Seed an announcement
INSERT INTO announcements (organization_id, title, content, created_by, status)
SELECT 1, 'Welcome to the JMK Employee Portal', 'Welcome to the new JMK HRMS Employee Portal! You can now track attendance, view leave balances, apply for time off, and access your payslips and documents on mobile or desktop.', 2, 'published'
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE organization_id = 1 AND title = 'Welcome to the JMK Employee Portal');
