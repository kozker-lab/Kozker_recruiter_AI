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
      .from('approval_pipelines')
      .select('*, organizations(id, name), pipeline_stages(*, roles(id, name, color_hex))')
      .order('created_at', { ascending: false });

    if (orgId && orgId !== 'all') {
      query = query.eq('organization_id', orgId);
    }

    const { data: pipelines, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pipelines: pipelines || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch approval pipelines' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { organization_id, name, description, category, stages } = await request.json();

    if (!organization_id || !name || !category) {
      return NextResponse.json({ error: 'Organization, name, and category are required' }, { status: 400 });
    }

    const { data: pipeline, error: pipeErr } = await supabase
      .from('approval_pipelines')
      .insert({
        organization_id,
        name,
        description: description || '',
        category,
        status: 'Active'
      })
      .select('*, organizations(id, name)')
      .single();

    if (pipeErr) {
      return NextResponse.json({ error: pipeErr.message }, { status: 500 });
    }

    if (Array.isArray(stages) && stages.length > 0) {
      const stageInserts = stages.map((st: any, idx: number) => ({
        pipeline_id: pipeline.id,
        step_number: idx + 1,
        stage_title: st.stage_title,
        required_role_id: st.required_role_id || null,
        sla_hours: st.sla_hours || 24
      }));
      await supabase.from('pipeline_stages').insert(stageInserts);
    }

    // Audit log entry
    await supabase.from('audit_logs').insert({
      organization_id,
      actor_name: 'Recruiter User',
      action_description: `Configured new approval workflow '${name}'`,
      target_name: name,
      action_type: 'create'
    });

    return NextResponse.json({ success: true, pipeline });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create pipeline' }, { status: 500 });
  }
}
