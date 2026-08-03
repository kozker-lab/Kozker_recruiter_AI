-- Supabase Migration: Approval Workflows & Rejection Checklists System
-- Migration File: 20260803_approval_workflows.sql

-- 1. Create approval_pipelines table
CREATE TABLE IF NOT EXISTS public.approval_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_template BOOLEAN DEFAULT false,
    entity_type TEXT NOT NULL DEFAULT 'custom', -- 'mandate' | 'application' | 'custom'
    entity_id UUID, -- Optional foreign key reference to requirement or application
    custom_content JSONB, -- Stores custom form data or JD/offer text snapshot
    created_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    current_stage_index INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'pending' | 'approved' | 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create approval_stages table
CREATE TABLE IF NOT EXISTS public.approval_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.approval_pipelines(id) ON DELETE CASCADE,
    stage_index INT NOT NULL DEFAULT 0,
    stage_name TEXT NOT NULL,
    require_all_approvers BOOLEAN DEFAULT false, -- false = 1-of-N (First-to-Approve), true = N-of-N (Consensus)
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'skipped'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create approval_stage_approvers table
CREATE TABLE IF NOT EXISTS public.approval_stage_approvers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES public.approval_stages(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    has_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create approval_pipeline_access table (Pipeline level view/edit delegation)
CREATE TABLE IF NOT EXISTS public.approval_pipeline_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.approval_pipelines(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL DEFAULT 'view', -- 'view' | 'edit'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create approval_rejection_checklists table
CREATE TABLE IF NOT EXISTS public.approval_rejection_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.approval_pipelines(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES public.approval_stages(id) ON DELETE CASCADE,
    rejected_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    reasons JSONB DEFAULT '[]'::jsonb, -- Array of string checklist reasons
    highlighted_fields JSONB DEFAULT '[]'::jsonb, -- Array of { field_name, field_value, note }
    feedback_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create approval_logs table (Audit trail)
CREATE TABLE IF NOT EXISTS public.approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.approval_pipelines(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.approval_stages(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL, -- 'created' | 'submitted' | 'stage_approved' | 'stage_rejected' | 'revised' | 'access_granted'
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_approval_pipelines_org ON public.approval_pipelines(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_pipelines_status ON public.approval_pipelines(status);
CREATE INDEX IF NOT EXISTS idx_approval_stages_pipeline ON public.approval_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_approval_approvers_stage ON public.approval_stage_approvers(stage_id);
CREATE INDEX IF NOT EXISTS idx_approval_approvers_member ON public.approval_stage_approvers(member_id);
CREATE INDEX IF NOT EXISTS idx_approval_access_pipeline ON public.approval_pipeline_access(pipeline_id);
