-- 1. Add job_id column to candidates table referencing job_openings
ALTER TABLE public.candidates ADD COLUMN job_id UUID REFERENCES public.job_openings(id) ON DELETE SET NULL;

-- 2. Allow anonymous candidates to insert/update their profiles when applying
CREATE POLICY "Allow anonymous insert of candidates" ON public.candidates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous read of candidates" ON public.candidates FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous update of candidates" ON public.candidates FOR UPDATE TO anon USING (true);

-- 3. Allow anonymous candidates to view active job openings, requirements, and clients to render the job details
CREATE POLICY "Allow anonymous view active jobs" ON public.job_openings FOR SELECT TO anon USING (is_deleted = False);
CREATE POLICY "Allow anonymous view requirements" ON public.requirements FOR SELECT TO anon USING (is_deleted = False);
CREATE POLICY "Allow anonymous view clients" ON public.clients FOR SELECT TO anon USING (is_deleted = False);
