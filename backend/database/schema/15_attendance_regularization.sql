-- 15_attendance_regularization.sql
-- Contains Attendance Regularization table for handling missing check-ins and check-outs

CREATE TABLE IF NOT EXISTS attendance_regularization (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    request_type ENUM('missed_punch', 'correction', 'other') NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approver_id INT,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_pending_request (employee_id, attendance_date, request_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_attendance_reg_org ON attendance_regularization(organization_id);
CREATE INDEX idx_attendance_reg_emp ON attendance_regularization(employee_id);
CREATE INDEX idx_attendance_reg_status ON attendance_regularization(status);
