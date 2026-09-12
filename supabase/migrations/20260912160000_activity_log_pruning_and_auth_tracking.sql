-- Migration: 20260912160000_activity_log_pruning_and_auth_tracking.sql
-- Description: Add organization_id column to activity_log, indexes for performance, and stored procedure for log pruning.

-- 1. Add organization_id column to activity_log if not exists
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2. Create performance indexes for activity_log filtering and pruning
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON public.activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id ON public.activity_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON public.activity_log(action);

-- 3. Stored Procedure for high-performance log pruning
CREATE OR REPLACE FUNCTION public.prune_activity_logs(
    p_before_timestamp TIMESTAMPTZ,
    p_organization_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    IF p_organization_id IS NOT NULL THEN
        DELETE FROM public.activity_log
        WHERE created_at < p_before_timestamp
          AND (organization_id = p_organization_id OR organization_id IS NULL);
    ELSE
        DELETE FROM public.activity_log
        WHERE created_at < p_before_timestamp;
    END IF;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.prune_activity_logs(TIMESTAMPTZ, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_activity_logs(TIMESTAMPTZ, UUID) TO authenticated;
