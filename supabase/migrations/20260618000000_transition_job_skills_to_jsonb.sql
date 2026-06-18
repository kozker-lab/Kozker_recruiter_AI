-- ============================================================
-- MIGRATION: TRANSITION JOB SKILLS TO JSONB ARRAY COLUMN
-- ============================================================

-- 1. Drop existing validation triggers and functions
DROP TRIGGER IF EXISTS trigger_validate_job_skills_weight ON public.job_openings;
DROP FUNCTION IF EXISTS public.validate_job_skills_weight();

-- 2. Drop existing table Cascade (clears constraints/policies)
DROP TABLE IF EXISTS public.job_opening_skills CASCADE;

-- 3. Create updated job_opening_skills table
CREATE TABLE public.job_opening_skills (
    job_opening_id UUID PRIMARY KEY REFERENCES public.job_openings(id) ON DELETE CASCADE,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.job_opening_skills ENABLE ROW LEVEL SECURITY;

-- 5. Create Row Level Security policies
CREATE POLICY "Allow view skills" ON public.job_opening_skills 
    FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.job_openings j 
            JOIN public.requirements r ON j.requirement_id = r.id 
            WHERE j.id = job_opening_id AND r.created_by = auth.uid()
        ) OR is_admin()
    );

CREATE POLICY "Allow modify skills" ON public.job_opening_skills 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.job_openings j 
            JOIN public.requirements r ON j.requirement_id = r.id 
            WHERE j.id = job_opening_id AND r.created_by = auth.uid()
        ) OR is_admin()
    );

-- 6. Create updated validation function for jsonb array elements
CREATE OR REPLACE FUNCTION public.validate_job_skills_weight()
RETURNS TRIGGER AS $$
DECLARE
    v_total_weight NUMERIC;
BEGIN
    -- Only run validation when a job opening's status is changed to 'confirmed' or 'published'
    IF NEW.status IN ('confirmed', 'published') THEN
        SELECT COALESCE(SUM((skill->>'weight')::NUMERIC), 0) INTO v_total_weight
        FROM public.job_opening_skills jos,
             jsonb_array_elements(jos.skills) AS skill
        WHERE jos.job_opening_id = NEW.id;
        
        -- Accept 1.0 (decimal) or 100 (percentage)
        IF v_total_weight != 1.0 AND v_total_weight != 100 THEN
            RAISE EXCEPTION 'Total skill weights for confirmed/published job opening must equal 100%% (current sum: %)', v_total_weight;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger before update on job_openings
CREATE TRIGGER trigger_validate_job_skills_weight
    BEFORE UPDATE ON public.job_openings
    FOR EACH ROW EXECUTE FUNCTION public.validate_job_skills_weight();
