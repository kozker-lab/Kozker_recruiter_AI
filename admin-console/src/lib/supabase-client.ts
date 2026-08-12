import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://covhcpsyliesrgkjxhai.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_V69YOpwZKjrT1BT8k609nQ_MBzXV80b";

export const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  { auth: { persistSession: true } }
);
