-- 13_employee_advanced.sql
-- Additions for Fresher/Experienced, Terms, and Experiences

ALTER TABLE employees
ADD COLUMN experience_type ENUM('fresher', 'experienced') DEFAULT 'fresher',
ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN terms_accepted_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS employee_experiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    previous_designation VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    salary DECIMAL(10, 2),
    reason_for_leaving TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
