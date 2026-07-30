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
