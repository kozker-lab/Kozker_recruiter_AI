-- =========================================================================
-- MIGRATION SCRIPT: Unified Member Credentials & Clean Supabase Schema
-- Run this script in your Supabase Project SQL Editor
-- =========================================================================

-- 1. Ensure public.members table has required authentication columns
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 2. Remove obsolete temporary credential tracking columns if present
ALTER TABLE public.members 
DROP COLUMN IF EXISTS recruitment_credentials_created_at,
DROP COLUMN IF EXISTS recruitment_credentials_action;

-- 3. Ensure indexes exist for high-performance lookup by email and organization
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON public.members(organization_id);

-- 4. Verify member_roles table references
CREATE INDEX IF NOT EXISTS idx_member_roles_member ON public.member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_role ON public.member_roles(role_id);
