-- 20_phase3c_ai_insights.sql
-- Phase 3C Proactive HR Intelligence Schema Enhancement

ALTER TABLE ai_insights
  ADD COLUMN IF NOT EXISTS severity ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL DEFAULT 'INFO' AFTER insight_type,
  ADD COLUMN IF NOT EXISTS department_id INT NULL AFTER target_entity_id,
  ADD COLUMN IF NOT EXISTS summary TEXT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS detailed_explanation TEXT NULL AFTER summary,
  ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(255) NULL AFTER supporting_data,
  ADD COLUMN IF NOT EXISTS detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER dedup_key,
  MODIFY COLUMN status ENUM('unread', 'read', 'dismissed', 'new', 'reviewed', 'actioned') DEFAULT 'unread',
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL AFTER status,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP NULL AFTER read_at;

CREATE INDEX IF NOT EXISTS idx_insights_org_dedup ON ai_insights (organization_id, dedup_key);
CREATE INDEX IF NOT EXISTS idx_insights_org_status_sev ON ai_insights (organization_id, status, severity);
