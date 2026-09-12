import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://covhcpsyliesrgkjxhai.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_V69YOpwZKjrT1BT8k609nQ_MBzXV80b";
  return createBrowserClient(url, key);
}

export const supabaseOAuthEndpoints = {
  authorize: process.env.NEXT_PUBLIC_SUPABASE_OAUTH_AUTHORIZE_URL || "https://covhcpsyliesrgkjxhai.supabase.co/auth/v1/oauth/authorize",
  token: process.env.NEXT_PUBLIC_SUPABASE_OAUTH_TOKEN_URL || "https://covhcpsyliesrgkjxhai.supabase.co/auth/v1/oauth/token",
  jwks: process.env.NEXT_PUBLIC_SUPABASE_JWKS_URL || "https://covhcpsyliesrgkjxhai.supabase.co/auth/v1/.well-known/jwks.json",
  oidcDiscovery: process.env.NEXT_PUBLIC_SUPABASE_OIDC_DISCOVERY_URL || "https://covhcpsyliesrgkjxhai.supabase.co/auth/v1/.well-known/openid-configuration"
};
