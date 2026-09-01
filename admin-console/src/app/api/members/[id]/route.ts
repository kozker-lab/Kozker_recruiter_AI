import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(request);
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

    const memberEmail = member.email?.toLowerCase().trim();

    // 1. Remove user authentication details from Supabase GoTrue Auth (auth.users)
    let authUserDeleted = false;
    try {
      if (supabase.auth?.admin && memberEmail) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const authUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === memberEmail);
        if (authUser) {
          const { error: delAuthErr } = await supabase.auth.admin.deleteUser(authUser.id);
          if (!delAuthErr) {
            authUserDeleted = true;
          } else {
            console.error('Supabase Auth user delete error:', delAuthErr);
          }
        }
      }
    } catch (authDelErr) {
      console.error('Supabase Auth user removal exception:', authDelErr);
    }

    // 2. Delete associated member roles
    await supabase.from('member_roles').delete().eq('member_id', memberId);

    // 3. Delete member record from public.members
    const { error: delErr } = await supabase.from('members').delete().eq('id', memberId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 4. Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Removed member '${member.name}' (${memberEmail}) and deleted authentication details from Supabase`,
      target_name: member.name,
      action_type: 'delete'
    });

    return NextResponse.json({
      success: true,
      auth_user_deleted: authUserDeleted,
      message: `Member '${member.name}' (${memberEmail}) and their Supabase authentication details have been permanently removed.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}
