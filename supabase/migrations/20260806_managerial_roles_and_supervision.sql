-- =========================================================================
-- MIGRATION SCRIPT: Managerial Roles & Branch Supervision Matrix
-- =========================================================================

-- 1. Add is_managerial and supervised_by_role_id columns to public.roles
ALTER TABLE public.roles 
ADD COLUMN IF NOT EXISTS is_managerial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS supervised_by_role_id VARCHAR(36) REFERENCES public.roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roles_is_managerial ON public.roles(is_managerial);
CREATE INDEX IF NOT EXISTS idx_roles_supervised_by_role_id ON public.roles(supervised_by_role_id);

-- 2. Create member_manager_assignments table for multi-manager reporting
CREATE TABLE IF NOT EXISTS public.member_manager_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id VARCHAR(36) NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    role_id VARCHAR(36) NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    manager_member_id VARCHAR(36) REFERENCES public.members(id) ON DELETE CASCADE,
    branch_name VARCHAR(100) DEFAULT 'Main Branch',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_member_role_assignment UNIQUE (member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_mma_member_id ON public.member_manager_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_mma_role_id ON public.member_manager_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_mma_manager_member_id ON public.member_manager_assignments(manager_member_id);
