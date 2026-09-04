-- 14_employee_extensions.sql
-- Additions for Address, Education, Salary, UAN, Resume

ALTER TABLE employees
ADD COLUMN current_address TEXT,
ADD COLUMN permanent_address TEXT,
ADD COLUMN uan_number VARCHAR(50),
ADD COLUMN resume_url VARCHAR(500),
ADD COLUMN gross_salary DECIMAL(10, 2),
ADD COLUMN basic_salary DECIMAL(10, 2),
ADD COLUMN hra DECIMAL(10, 2),
ADD COLUMN deductions DECIMAL(10, 2);

CREATE TABLE IF NOT EXISTS employee_education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT NOT NULL,
    level ENUM('10th', '12th', 'Bachelors', 'Masters', 'PhD', 'Diploma', 'Other') NOT NULL,
    degree_name VARCHAR(150),
    university_name VARCHAR(255),
    passing_year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add salary and bank detail fields if not already added
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS esi_percentage DECIMAL(5,2) DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS pf_percentage DECIMAL(5,2) DEFAULT 12.00,
ADD COLUMN IF NOT EXISTS monthly_paid_leaves INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS special_allowance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_allowance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_tax DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advances DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS incentives DECIMAL(10,2) DEFAULT 0;
