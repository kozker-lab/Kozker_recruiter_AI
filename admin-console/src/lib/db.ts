import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_KEY || 'placeholder-key',
  { auth: { persistSession: false } }
);

// Optional direct Postgres pool if DATABASE_URL is configured
let pgPool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/kozker_db";
    pgPool = new Pool({ connectionString });
  }
  return pgPool;
}
