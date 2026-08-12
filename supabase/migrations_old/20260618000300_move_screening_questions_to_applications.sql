-- Drop the screening_questions table if it exists
DROP TABLE IF EXISTS public.screening_questions CASCADE;

-- Add the screening_questions array column to the applications table
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS screening_questions JSONB NOT NULL DEFAULT '[]'::jsonb;
