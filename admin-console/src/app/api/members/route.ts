import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword } from '@/lib/auth';

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

    if (user.permissions?.administrator !== true && user.is_primary_admin !== true) {
      return NextResponse.json({ error: 'Forbidden: Member Directory is restricted strictly to Organization Administrators.' }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from('members')
      .select('*, member_roles(role_id, roles(*)), member_manager_assignments(*)')
      .eq('organization_id', user.organization_id)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, members: members || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.permissions?.administrator !== true && user.is_primary_admin !== true) {
      return NextResponse.json({ error: 'Forbidden: Member Directory is restricted strictly to Organization Administrators.' }, { status: 403 });
    }

    // Check organization member quota limit
    const { data: org } = await supabase.from('organizations').select('max_members_limit').eq('id', user.organization_id).single();
    if (org && org.max_members_limit !== null && org.max_members_limit !== undefined) {
      const { count } = await supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id);
      if (count !== null && count >= org.max_members_limit) {
        return NextResponse.json({
          error: `Organization member quota reached (Limit: ${org.max_members_limit}). Contact your system developer to expand tenant quota.`
        }, { status: 403 });
      }
    }

    const { name, email, password, role_id } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 4).toUpperCase() || 'U';

    const { data: member, error: memError } = await supabase
      .from('members')
      .insert({
        organization_id: user.organization_id,
        name,
        email,
        password_hash,
        avatar_initials: initials,
        must_change_password: true,
        status: 'active'
      })
      .select('*')
      .single();

    if (memError) {
      return NextResponse.json({ error: memError.message }, { status: 500 });
    }

    if (role_id) {
      await supabase.from('member_roles').insert({
        member_id: member.id,
        role_id
      });
    }

    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Added new organization member '${name}'`,
      target_name: name,
      action_type: 'invite'
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create member' }, { status: 500 });
  }
}
