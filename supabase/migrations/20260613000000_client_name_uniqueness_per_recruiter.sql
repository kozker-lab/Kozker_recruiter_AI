-- Migration: Drop global client name uniqueness and make it unique per-recruiter
-- Run this directly in the Supabase SQL Editor

-- 1. Drop the global unique constraint on client name
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_name_key;

-- 2. Add composite unique constraint scoped to the creator (recruiter)
-- Note: If this fails, make sure you don't have existing duplicate client names for the same recruiter user.
ALTER TABLE public.clients ADD CONSTRAINT clients_name_created_by_key UNIQUE (name, created_by);
