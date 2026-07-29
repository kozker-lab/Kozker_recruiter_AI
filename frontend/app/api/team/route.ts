import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://covhcpsyliesrgkjxhai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('org_id');

    // Fetch members and their roles
    let query = supabase
      .from('members')
      .select('*, member_roles(role_id, roles(name, color_hex))')
      .order('name', { ascending: true });

    if (orgId && orgId !== 'all') {
      query = query.eq('organization_id', orgId);
    }

    const { data: members, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute mock/real team workload metrics for demonstration
    const teamMembers = (members || []).map((m: any) => ({
      ...m,
      active_jobs_count: Math.floor(Math.random() * 6) + 2,
      pending_reviews_count: Math.floor(Math.random() * 10) + 3,
      delayed_actions_count: Math.floor(Math.random() * 4),
      avg_review_days: (1.2 + Math.random() * 1.5).toFixed(1)
    }));

    return NextResponse.json({
      success: true,
      team: teamMembers,
      summary: {
        total_recruiters: teamMembers.length,
        active_jobs: teamMembers.reduce((acc, curr) => acc + curr.active_jobs_count, 0),
        pending_reviews: teamMembers.reduce((acc, curr) => acc + curr.pending_reviews_count, 0),
        delayed_actions: teamMembers.reduce((acc, curr) => acc + curr.delayed_actions_count, 0)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch team monitoring data' }, { status: 500 });
  }
}
