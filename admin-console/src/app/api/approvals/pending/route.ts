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

    const { data: approvals, error } = await supabase
      .from('pending_approvals')
      .select('*, members!pending_approvals_requestor_id_fkey(name, email, avatar_initials), roles(name, color_hex), approval_pipelines!inner(organization_id, name, category)')
      .eq('approval_pipelines.organization_id', user.organization_id)
      .order('submitted_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, approvals: approvals || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch pending approvals' }, { status: 500 });
  }
}
