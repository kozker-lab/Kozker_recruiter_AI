-- Create a SECURITY DEFINER function to bypass RLS policies during OAuth callback redirects
CREATE OR REPLACE FUNCTION public.upsert_linkedin_account(
    p_user_id UUID,
    p_linkedin_member_id TEXT,
    p_linkedin_access_token TEXT,
    p_linkedin_refresh_token TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS by running as the creator of the function (db owner)
AS $$
BEGIN
    INSERT INTO public.linkedin_accounts (
        user_id,
        linkedin_member_id,
        linkedin_access_token,
        linkedin_refresh_token,
        expires_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_linkedin_member_id,
        p_linkedin_access_token,
        p_linkedin_refresh_token,
        p_expires_at,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        linkedin_member_id = EXCLUDED.linkedin_member_id,
        linkedin_access_token = EXCLUDED.linkedin_access_token,
        linkedin_refresh_token = EXCLUDED.linkedin_refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
END;
$$;

-- Grant execution permission to both authenticated and anonymous roles
GRANT EXECUTE ON FUNCTION public.upsert_linkedin_account TO anon, authenticated;
