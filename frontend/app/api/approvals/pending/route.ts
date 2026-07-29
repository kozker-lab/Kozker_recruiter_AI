import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://covhcpsyliesrgkjxhai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');

    let query = supabase
      .from('pending_approvals')
      .select('*, members!pending_approvals_requestor_id_fkey(name, email, avatar_initials), roles(name, color_hex), approval_pipelines!inner(id, name, category, organization_id, organizations(id, name))')
      .order('submitted_at', { ascending: false });

    if (orgId && orgId !== 'all') {
      query = query.eq('approval_pipelines.organization_id', orgId);
    }

    const { data: approvals, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, approvals: approvals || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch pending approvals' }, { status: 500 });
  }
}
