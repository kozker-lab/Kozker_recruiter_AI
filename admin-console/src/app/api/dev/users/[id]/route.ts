import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const memberId = params.id;
    const body = await request.json();
    const {
      status,
      administrator,
      access_recruitment,
      max_members_limit,
      max_roles_limit,
      can_manage_pipelines,
      can_view_audit_logs
    } = body;

    // 1. Fetch member details
    const { data: member, error: memErr } = await supabase
      .from('members')
      .select('*, member_roles(role_id)')
      .eq('id', memberId)
      .single();

    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // 2. Update Member status if provided
    if (status) {
      await supabase
        .from('members')
        .update({ status })
        .eq('id', memberId);
    }

    // 3. Update User Role Permissions (Admin Portal Access Toggle)
    const roleIds = (member.member_roles || []).map((mr: any) => mr.role_id);
    if (roleIds.length > 0 && (administrator !== undefined || access_recruitment !== undefined)) {
      for (const rid of roleIds) {
        await supabase
          .from('role_permissions')
          .update({
            ...(administrator !== undefined ? { administrator } : {}),
            ...(access_recruitment !== undefined ? { access_recruitment } : {})
          })
          .eq('role_id', rid);
      }
    }

    // 4. Update Organization Tenant Quotas & Feature Flags
    if (member.organization_id && (
      max_members_limit !== undefined ||
      max_roles_limit !== undefined ||
      can_manage_pipelines !== undefined ||
      can_view_audit_logs !== undefined
    )) {
      await supabase
        .from('organizations')
        .update({
          ...(max_members_limit !== undefined ? { max_members_limit: max_members_limit === null ? null : Number(max_members_limit) } : {}),
          ...(max_roles_limit !== undefined ? { max_roles_limit: max_roles_limit === null ? null : Number(max_roles_limit) } : {}),
          ...(can_manage_pipelines !== undefined ? { can_manage_pipelines } : {}),
          ...(can_view_audit_logs !== undefined ? { can_view_audit_logs } : {})
        })
        .eq('id', member.organization_id);
    }

    // 5. Audit Log
    await supabase.from('audit_logs').insert({
      organization_id: member.organization_id,
      actor_name: 'Developer Master Portal',
      action_description: `Updated developer governance settings & tenant quotas for ${member.name}`,
      target_name: member.name,
      action_type: 'update'
    });

    return NextResponse.json({ success: true, message: 'User & organization governance settings updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update governance settings' }, { status: 500 });
  }
}
