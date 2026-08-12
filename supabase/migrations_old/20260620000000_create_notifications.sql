-- ============================================================
-- KOZKER ATS NOTIFICATIONS TABLE MIGRATION
-- Creates the notifications table and sets up RLS policies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('job_generation', 'candidate_matching', 'upload', 'error', 'screening_questions')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on recruiter_id and created_at for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_recruiter_created ON public.notifications(recruiter_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to prevent conflict)
DROP POLICY IF EXISTS "Allow view notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow modify notifications" ON public.notifications;

-- Create isolated RLS policies
CREATE POLICY "Allow view notifications" ON public.notifications 
    FOR SELECT TO authenticated 
    USING (auth.uid() = recruiter_id OR is_admin());

CREATE POLICY "Allow modify notifications" ON public.notifications 
    FOR ALL TO authenticated 
    USING (auth.uid() = recruiter_id OR is_admin());
