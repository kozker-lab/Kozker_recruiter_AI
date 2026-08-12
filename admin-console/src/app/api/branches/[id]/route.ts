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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.has_assigned_roles === false) {
      return NextResponse.json({
        error: 'Forbidden: Default unassigned members have view-only access and cannot delete branches.'
      }, { status: 403 });
    }

    const branchId = params.id;

    // Fetch branch name for audit log
    const { data: branch } = await supabase
      .from('branches')
      .select('name')
      .eq('id', branchId)
      .single();

    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', branchId)
      .eq('organization_id', user.organization_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (branch) {
      await supabase.from('audit_logs').insert({
        organization_id: user.organization_id,
        actor_id: user.id,
        actor_name: user.name,
        action_description: `Deleted branch profile '${branch.name}'`,
        target_name: branch.name,
        action_type: 'danger'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete branch' }, { status: 500 });
  }
}
