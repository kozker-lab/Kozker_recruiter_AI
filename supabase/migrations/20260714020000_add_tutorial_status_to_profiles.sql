-- Migration: 20260714020000_add_tutorial_status_to_profiles
-- Description: Add columns to public.profiles to persist tutorial tour status across sessions and devices.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_skipped BOOLEAN DEFAULT FALSE;
