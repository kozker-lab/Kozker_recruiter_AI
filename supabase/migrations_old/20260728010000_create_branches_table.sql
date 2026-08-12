-- =========================================================================
-- MIGRATION SCRIPT: Branches Table & Foreign Key References
-- Run this script in your Supabase Project SQL Editor
-- =========================================================================

-- 1. Create public.branches table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) DEFAULT 'MAIN',
    location VARCHAR(200) DEFAULT 'HQ',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add branch_id reference to public.roles if not exists
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 3. Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_branches_org_id ON public.branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_branch_id ON public.roles(branch_id);
