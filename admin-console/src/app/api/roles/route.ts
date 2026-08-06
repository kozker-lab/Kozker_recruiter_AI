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

    const { data: roles, error } = await supabase
      .from('roles')
      .select('*, role_permissions(*)')
      .eq('organization_id', user.organization_id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch member assignment counts for each role
    const { data: memberRoles } = await supabase
      .from('member_roles')
      .select('role_id');

    const countsMap: Record<string, number> = {};
    (memberRoles || []).forEach((mr: any) => {
      if (mr.role_id) {
        countsMap[mr.role_id] = (countsMap[mr.role_id] || 0) + 1;
      }
    });

    const rolesWithCounts = (roles || []).map((r: any) => ({
      ...r,
      assigned_members_count: countsMap[r.id] || 0
    }));

    return NextResponse.json({ success: true, roles: rolesWithCounts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions to ensure unassigned/default members cannot create roles
    const isAdmin = user.is_primary_admin === true || user.permissions?.administrator === true;
    if (!isAdmin && user.has_assigned_roles === false) {
      return NextResponse.json({
        error: 'Forbidden: Default unassigned members have view-only access and cannot create new roles.'
      }, { status: 403 });
    }

    const { name, parent_id, level, color_hex, permissions, scope_type, branch_name, is_managerial, supervised_by_role_id } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check organization role quota limit
    const { data: org } = await supabase.from('organizations').select('max_roles_limit').eq('id', user.organization_id).single();
    if (org && org.max_roles_limit !== null && org.max_roles_limit !== undefined) {
      const { count } = await supabase.from('roles').select('id', { count: 'exact', head: true }).eq('organization_id', user.organization_id);
      if (count !== null && count >= org.max_roles_limit) {
        return NextResponse.json({
          error: `Organization master role quota reached (Limit: ${org.max_roles_limit}). Contact your system developer to expand tenant quota.`
        }, { status: 403 });
      }
    }

    // Insert Role with safe schema cache fallback
    const roleInsertData: any = {
      organization_id: user.organization_id,
      parent_id: parent_id || null,
      name,
      level: level || 'position',
      color_hex: color_hex || '#ff6e30',
      scope_type: scope_type || 'organization',
      branch_name: branch_name || 'Main Branch',
      is_managerial: is_managerial === true,
      supervised_by_role_id: supervised_by_role_id || null
    };

    let { data: role, error: roleError } = await supabase
      .from('roles')
      .insert(roleInsertData)
      .select('*')
      .single();

    if (roleError && roleError.message.includes('schema cache')) {
      delete roleInsertData.scope_type;
      delete roleInsertData.branch_name;
      const fallbackRes = await supabase
        .from('roles')
        .insert(roleInsertData)
        .select('*')
        .single();
      role = fallbackRes.data;
      roleError = fallbackRes.error;
      if (role) {
        role.scope_type = scope_type || 'organization';
        role.branch_name = branch_name || 'Main Branch';
      }
    }

    if (roleError) {
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    // Insert Role Permissions
    const defaultPerms = {
      role_id: role.id,
      administrator: false,
      audit_logs: false,
      manage_server: false,
      access_recruitment: true,
      recruiter_dashboard: true,
      recruiter_mandates: true,
      recruiter_jobs: true,
      recruiter_sourcing: true,
      recruiter_reports: true,
      recruiter_qna: true,
      recruiter_resumes: true,
      recruiter_stage_move: true,
      access_client: false,
      client_contracts: false,
      client_mandates: false,
      client_shortlists: false,
      access_employee: false,
      employee_directory: false,
      employee_org_chart: false,
      manage_jobs: true,
      view_resumes: true,
      edit_status: true,
      schedule_interviews: true,
      ...(permissions || {})
    };

    await supabase.from('role_permissions').insert(defaultPerms);

    // Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Created master role profile '${name}' [${scope_type || 'organization'}: ${branch_name || 'Main Branch'}]`,
      target_name: name,
      action_type: 'create'
    });

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create role' }, { status: 500 });
  }
}
