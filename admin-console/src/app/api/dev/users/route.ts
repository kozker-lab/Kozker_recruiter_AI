import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    // Fetch primary admin members only for the Developer Portal Accounts Directory
    const { data: users, error } = await supabase
      .from('members')
      .select('*, organizations(id, name, operating_mode, max_members_limit, max_roles_limit, can_manage_pipelines, can_view_audit_logs), member_roles(role_id, roles(id, name, color_hex, role_permissions(*)))')
      .eq('is_primary_admin', true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: orgs } = await supabase.from('organizations').select('*');

    return NextResponse.json({ success: true, users: users || [], organizations: orgs || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required for deletion' }, { status: 400 });
    }

    // Fetch target member details before deletion
    const { data: targetMember } = await supabase
      .from('members')
      .select('*, organizations(*)')
      .eq('id', userId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Target admin user account not found' }, { status: 404 });
    }

    // Delete member_roles associations
    await supabase.from('member_roles').delete().eq('member_id', userId);

    // Delete member record from public.members
    const { error: delErr } = await supabase.from('members').delete().eq('id', userId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Delete Supabase auth user if present
    try {
      if (supabase.auth?.admin && targetMember.email) {
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const authUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === targetMember.email.toLowerCase());
        if (authUser) {
          await supabase.auth.admin.deleteUser(authUser.id);
        }
      }
    } catch {
      // Ignore auth user cleanup notice
    }

    return NextResponse.json({
      success: true,
      message: `Admin account '${targetMember.name}' (${targetMember.email}) permanently removed.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 500 });
  }
}
