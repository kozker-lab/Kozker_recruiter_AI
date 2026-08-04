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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.has_assigned_roles === false) {
      return NextResponse.json({
        error: 'Forbidden: Default unassigned members have view-only access and cannot modify role configurations.'
      }, { status: 403 });
    }

    const roleId = params.id;
    const { name, parent_id, level, color_hex, permissions, scope_type, branch_name } = await request.json();

    // Update Role metadata
    const { data: role, error } = await supabase
      .from('roles')
      .update({
        ...(name ? { name } : {}),
        parent_id: parent_id !== undefined ? parent_id : undefined,
        ...(level ? { level } : {}),
        ...(color_hex ? { color_hex } : {}),
        ...(scope_type ? { scope_type } : {}),
        ...(branch_name ? { branch_name } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .eq('organization_id', user.organization_id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update Role Permissions if provided
    if (permissions) {
      const allowedKeys = [
        'administrator', 'audit_logs', 'manage_server', 'access_recruitment',
        'recruiter_dashboard', 'recruiter_mandates', 'recruiter_jobs', 'recruiter_sourcing',
        'recruiter_reports', 'recruiter_qna', 'recruiter_resumes', 'recruiter_stage_move',
        'access_client', 'client_contracts', 'client_mandates', 'client_shortlists',
        'access_employee', 'employee_directory', 'employee_org_chart', 'manage_jobs',
        'view_resumes', 'edit_status', 'schedule_interviews', 'recruiter_stages',
        'recruiter_pipelines', 'recruiter_notifications', 'team_monitoring', 'interviewer_workspace'
      ];
      
      const cleanPerms: Record<string, boolean> = {};
      for (const k of allowedKeys) {
        if (permissions[k] !== undefined) {
          cleanPerms[k] = Boolean(permissions[k]);
        }
      }
      if (permissions.approval_workflow_edit !== undefined) {
        cleanPerms['recruiter_pipelines'] = Boolean(permissions.approval_workflow_edit);
      }
      if (permissions.approval_workflow_view !== undefined) {
        cleanPerms['recruiter_stages'] = Boolean(permissions.approval_workflow_view);
      }

      await supabase
        .from('role_permissions')
        .upsert({
          role_id: roleId,
          ...cleanPerms
        });
    }

    // Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: user.organization_id,
      actor_id: user.id,
      actor_name: user.name,
      action_description: `Updated configuration for role '${role.name}' [Scope: ${role.scope_type || 'organization'} | Branch: ${role.branch_name || 'Main Branch'}]`,
      target_name: role.name,
      action_type: 'update'
    });

    return NextResponse.json({ success: true, role });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = getUserFromReq(request);
    if (!user || !user.organization_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.has_assigned_roles === false) {
      return NextResponse.json({
        error: 'Forbidden: Default unassigned members have view-only access and cannot delete roles.'
      }, { status: 403 });
    }

    const roleId = params.id;

    // Fetch role name for audit
    const { data: existingRole } = await supabase
      .from('roles')
      .select('name')
      .eq('id', roleId)
      .single();

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)
      .eq('organization_id', user.organization_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existingRole) {
      await supabase.from('audit_logs').insert({
        organization_id: user.organization_id,
        actor_id: user.id,
        actor_name: user.name,
        action_description: `Deleted role profile '${existingRole.name}'`,
        target_name: existingRole.name,
        action_type: 'danger'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete role' }, { status: 500 });
  }
}
