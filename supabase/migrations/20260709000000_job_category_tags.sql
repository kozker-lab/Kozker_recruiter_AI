-- Migration: Add Category and Sub-category Tags to Job Openings
-- Date: 2026-Jul-09

-- 1. Alter job_openings table to add category and sub_category columns
ALTER TABLE public.job_openings 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('technical', 'non-technical')),
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- 2. Create job_sub_categories table to store available sub-categories
CREATE TABLE IF NOT EXISTS public.job_sub_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('technical', 'non-technical')),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (category, name)
);

-- 3. Enable RLS on job_sub_categories
ALTER TABLE public.job_sub_categories ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for job_sub_categories
CREATE POLICY "Allow view job_sub_categories" ON public.job_sub_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow view job_sub_categories anonymous" ON public.job_sub_categories FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert job_sub_categories" ON public.job_sub_categories FOR INSERT WITH CHECK (true);

-- 5. Seed default sub-categories
INSERT INTO public.job_sub_categories (category, name) VALUES 
('non-technical', 'Sales'),
('non-technical', 'Resource Management'),
('non-technical', 'Higher Management'),
('technical', 'CI/CD'),
('technical', 'Full Stack'),
('technical', 'Kotlin Specialist')
ON CONFLICT (category, name) DO NOTHING;
