import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://covhcpsyliesrgkjxhai.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_V69YOpwZKjrT1BT8k609nQ_MBzXV80b";
  return createBrowserClient(url, key);
}
