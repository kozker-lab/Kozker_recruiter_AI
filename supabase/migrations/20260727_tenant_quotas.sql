-- Add Tenant Quota & Feature Flag Columns to Organizations Table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS max_members_limit INT DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_roles_limit INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS can_manage_pipelines BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS can_view_audit_logs BOOLEAN DEFAULT TRUE;
