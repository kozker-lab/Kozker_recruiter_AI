import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://covhcpsyliesrgkjxhai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: orgs, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, operating_mode')
      .order('name', { ascending: true });

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    const { data: roles } = await supabase
      .from('roles')
      .select('id, organization_id, name, level, color_hex')
      .order('name', { ascending: true });

    return NextResponse.json({ success: true, organizations: orgs || [], roles: roles || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch organizations' }, { status: 500 });
  }
}
