-- Create candidate_queries table
CREATE TABLE IF NOT EXISTS public.candidate_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    candidate_email TEXT NOT NULL,
    query_text TEXT NOT NULL,
    ai_response TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.candidate_queries ENABLE ROW LEVEL SECURITY;

-- Drop policies if exist
DROP POLICY IF EXISTS "Allow view candidate queries" ON public.candidate_queries;
DROP POLICY IF EXISTS "Allow anonymous view candidate queries" ON public.candidate_queries;
DROP POLICY IF EXISTS "Allow resolve candidate queries" ON public.candidate_queries;
DROP POLICY IF EXISTS "Allow insert candidate queries" ON public.candidate_queries;

-- Add RLS Policies
CREATE POLICY "Allow view candidate queries" ON public.candidate_queries 
    FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.job_openings j 
        JOIN public.requirements r ON j.requirement_id = r.id 
        WHERE j.id = job_id AND r.created_by = auth.uid()
    ));

CREATE POLICY "Allow anonymous view candidate queries" ON public.candidate_queries 
    FOR SELECT TO anon 
    USING (true);

CREATE POLICY "Allow resolve candidate queries" ON public.candidate_queries 
    FOR UPDATE TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.job_openings j 
        JOIN public.requirements r ON j.requirement_id = r.id 
        WHERE j.id = job_id AND r.created_by = auth.uid()
    ));

CREATE POLICY "Allow insert candidate queries" ON public.candidate_queries 
    FOR INSERT 
    WITH CHECK (true);

