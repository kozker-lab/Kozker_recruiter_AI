-- Create linkedin_accounts table
CREATE TABLE IF NOT EXISTS public.linkedin_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_member_id TEXT NOT NULL,
    linkedin_access_token TEXT NOT NULL,
    linkedin_refresh_token TEXT,
    company_page_id TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_linkedin_user UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.linkedin_accounts ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Allow select for owner" ON public.linkedin_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow insert/update for owner" ON public.linkedin_accounts
    FOR ALL USING (auth.uid() = user_id);
