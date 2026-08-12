import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

function getUserFromReq(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const cookieHeader = request.headers.get('cookie') || '';
  let token = authHeader.replace('Bearer ', '');
  if (!token && cookieHeader) {
    const match = cookieHeader.match(/kozker_sso_token=([^;]+)/);
    if (match) token = match[1];
  }
  return verifyJwtToken(token);
}

export async function GET(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: pipelines, error } = await supabase
      .from('approval_pipelines')
      .select('*, pipeline_stages(*, roles(id, name, color_hex))')
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pipelines: pipelines || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch pipelines' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, category, stages } = await request.json();

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const { data: pipeline, error: pipeErr } = await supabase
      .from('approval_pipelines')
      .insert({
        organization_id: user.organization_id,
        name,
        description: description || '',
        category,
        status: 'Active'
      })
      .select('*')
      .single();

    if (pipeErr) {
      return NextResponse.json({ error: pipeErr.message }, { status: 500 });
    }

    if (Array.isArray(stages) && stages.length > 0) {
      const stageInserts = stages.map((st: any, idx: number) => ({
        pipeline_id: pipeline.id,
        step_number: idx + 1,
        stage_title: st.stage_title,
        required_role_id: st.required_role_id,
        sla_hours: st.sla_hours || 24
      }));
      await supabase.from('pipeline_stages').insert(stageInserts);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Configured new approval pipeline '${name}'`,
      target_name: name,
      action_type: 'create'
    });

    return NextResponse.json({ success: true, pipeline });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create pipeline' }, { status: 500 });
  }
}
