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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const approvalId = params.id;
    const { action } = await request.json(); // 'approve' OR 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
    }

    const { data: item, error: fetchErr } = await supabase
      .from('pending_approvals')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'Approval item not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

    const { data: updated, error } = await supabase
      .from('pending_approvals')
      .update({ status: newStatus })
      .eq('id', approvalId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Write to System Audit Ledger
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `${action === 'approve' ? 'Approved' : 'Rejected'} approval request '${item.item_title}'`,
      target_name: item.item_title,
      action_type: action === 'approve' ? 'update' : 'danger'
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process approval' }, { status: 500 });
  }
}
