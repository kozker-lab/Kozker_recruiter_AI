-- =========================================================================
-- MIGRATION SCRIPT: Role Scope Types & Branch Assignments
-- Run this script in your Supabase Project SQL Editor
-- =========================================================================

-- 1. Add scope_type and branch_name columns to public.roles
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS scope_type VARCHAR(50) DEFAULT 'organization',
ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100) DEFAULT 'Main Branch';

-- 2. Create index for fast scope and branch filtering
CREATE INDEX IF NOT EXISTS idx_roles_scope_type ON public.roles(scope_type);
CREATE INDEX IF NOT EXISTS idx_roles_branch_name ON public.roles(branch_name);
