import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyJwtToken, hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwtToken(token);

    if (!decoded || !decoded.dev_authenticated) {
      return NextResponse.json({ error: 'Unauthorized: Method 1 Developer Access Token Required' }, { status: 403 });
    }

    const { organization_id, name, email, password, role_ids } = await request.json();

    if (!organization_id || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required member fields (organization_id, name, email, password)' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Hash password
    const password_hash = await hashPassword(password);

    // Compute avatar initials
    const nameParts = name.trim().split(' ');
    const initials = nameParts.length >= 2 
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

    // Check if member with this email already exists in Supabase
    const { data: existingMember } = await supabase
      .from('members')
      .select('id, organization_id')
      .eq('email', cleanEmail)
      .maybeSingle();

    // Enforce single primary admin rule per organization
    await supabase
      .from('members')
      .update({ is_primary_admin: false })
      .eq('organization_id', organization_id);

    let member: any = existingMember;

    if (existingMember) {
      // Upsert existing member record to update name, password, organization_id, and primary admin status
      const { data: updated, error: updateErr } = await supabase
        .from('members')
        .update({
          organization_id,
          name,
          password_hash,
          avatar_initials: initials,
          is_primary_admin: true,
          status: 'active'
        })
        .eq('id', existingMember.id)
        .select('*')
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      member = updated || existingMember;
    } else {
      // Insert new primary admin member record
      const { data: newMem, error: insertErr } = await supabase
        .from('members')
        .insert({
          organization_id,
          name,
          email: cleanEmail,
          password_hash,
          avatar_initials: initials,
          must_change_password: true,
          is_primary_admin: true,
          status: 'active'
        })
        .select('*')
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      member = newMem;
    }

    // Determine roles to assign: if provided, use role_ids; otherwise find/assign default org role
    let assignedRoleIds: string[] = Array.isArray(role_ids) && role_ids.length > 0 ? role_ids : [];

    if (assignedRoleIds.length === 0) {
      // Find default org role or create 'Organization Director'
      const { data: existingRoles } = await supabase
        .from('roles')
        .select('id')
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true });

      if (existingRoles && existingRoles.length > 0) {
        assignedRoleIds = [existingRoles[0].id];
      } else {
        const { data: newRole } = await supabase
          .from('roles')
          .insert({
            organization_id,
            name: 'Organization Director',
            level: 'org',
            color_hex: '#ff6e30'
          })
          .select('id')
          .single();

        if (newRole) {
          assignedRoleIds = [newRole.id];
          await supabase.from('role_permissions').insert({
            role_id: newRole.id,
            administrator: true,
            audit_logs: true,
            manage_server: true,
            access_recruitment: true,
            recruiter_dashboard: true,
            recruiter_mandates: true,
            recruiter_jobs: true,
            recruiter_sourcing: true,
            recruiter_reports: true,
            recruiter_qna: true,
            recruiter_resumes: true,
            recruiter_stage_move: true,
            access_client: true,
            client_contracts: true,
            client_mandates: true,
            client_shortlists: true,
            access_employee: true,
            employee_directory: true,
            employee_org_chart: true,
            manage_jobs: true,
            view_resumes: true,
            edit_status: true,
            schedule_interviews: true
          });
        }
      }
    }

    // Clear old member roles and assign new primary admin role
    if (member && assignedRoleIds.length > 0) {
      await supabase.from('member_roles').delete().eq('member_id', member.id);
      const roleInserts = assignedRoleIds.map(rid => ({
        member_id: member.id,
        role_id: rid
      }));
      await supabase.from('member_roles').insert(roleInserts);
    }

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to provision admin account' }, { status: 500 });
  }
}
