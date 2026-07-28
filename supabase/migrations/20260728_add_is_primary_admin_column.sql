-- =========================================================================
-- MIGRATION SCRIPT: Add Primary Admin Flag to Organization Members
-- Run this script in your Supabase Project SQL Editor
-- =========================================================================

-- 1. Add is_primary_admin column to public.members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS is_primary_admin BOOLEAN DEFAULT FALSE;

-- 2. Index for fast querying of primary org admins
CREATE INDEX IF NOT EXISTS idx_members_is_primary_admin ON public.members(is_primary_admin);

-- 3. Mark primary organization owners as primary admins
UPDATE public.members 
SET is_primary_admin = TRUE 
WHERE email IN ('aderhamsk@gmail.com');
