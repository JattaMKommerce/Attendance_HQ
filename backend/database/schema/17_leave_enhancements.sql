-- 17_leave_enhancements.sql
-- Adds configurable document requirements and advanced leave workflow fields

-- Add policy configuration for when attachments are required (e.g. medical leave > 2 days)
ALTER TABLE leave_policies 
ADD COLUMN require_attachment_after_days INT DEFAULT NULL AFTER max_carry_forward;

-- Track whether an HR explicitly approved the leave as paid or unpaid
ALTER TABLE leave_requests 
ADD COLUMN approved_as_paid BOOLEAN DEFAULT NULL AFTER status;

-- Expand document types to support medical/leave records securely
ALTER TABLE documents 
MODIFY COLUMN document_type ENUM('identity', 'contract', 'certificate', 'policy', 'medical', 'leave_support', 'other') DEFAULT 'other';

-- Link uploaded documents directly to a leave request
ALTER TABLE documents 
ADD COLUMN leave_request_id INT DEFAULT NULL AFTER employee_id;

ALTER TABLE documents 
ADD CONSTRAINT fk_documents_leave_req FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE;
