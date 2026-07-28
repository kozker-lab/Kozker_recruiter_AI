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

    const memberId = params.id;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (memberId === user.id) {
      return NextResponse.json({ error: 'You cannot remove your own active administrator account from the organization.' }, { status: 403 });
    }

    // Fetch member details
    const { data: member, error: fetchErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', user.organization_id)
      .single();

    if (fetchErr || !member) {
      return NextResponse.json({ error: 'Member not found or not in your organization' }, { status: 404 });
    }

    // 1. Delete associated member roles
    await supabase.from('member_roles').delete().eq('member_id', memberId);

    // 2. Delete member from public.members
    const { error: delErr } = await supabase.from('members').delete().eq('id', memberId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 3. Attempt to delete from Supabase GoTrue Auth if present
    try {
      if (supabase.auth.admin && member.email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const authUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === member.email.toLowerCase());
        if (authUser) {
          await supabase.auth.admin.deleteUser(authUser.id);
        }
      }
    } catch (authDelErr) {
      console.error('Supabase Auth user delete error (non-fatal):', authDelErr);
    }

    // 4. Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Removed member '${member.name}' (${member.email}) from organization`,
      target_name: member.name,
      action_type: 'delete'
    });

    return NextResponse.json({
      success: true,
      message: `Member '${member.name}' (${member.email}) has been successfully removed from the organization.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}
